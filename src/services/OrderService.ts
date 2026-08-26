// src/services/OrderService.ts
// Lógica de negocio y persistencia de órdenes. Los controllers sólo traducen
// HTTP; toda la lógica testeable vive aquí. Lanza HttpError para errores de
// dominio (el controller los pasa a next()).

import { AppDataSource } from "../utils/db";
import { Orders } from "../entities/Orders";
import { OrderDetails } from "../entities/OrderDetails";
import { OrderStatusHistory } from "../entities/OrderStatusHistory";
import { HttpError } from "../utils/httpError";
import {
  formatOrder,
  getStatusLabel,
  isValidStatus,
} from "../serializers/order.serializer";
import { emitNewOrder, emitOrderStatusUpdate } from "../utils/socket";

export interface CreateOrderItem {
  id: number;
  quantity: number;
  price: number;
  note?: string | null;
}

export interface CreateOrderInput {
  userId: number;
  businessId: number;
  items: CreateOrderItem[];
  total: number;
  customerName?: string;
  customerPhone?: string;
  deliveryAddress?: string;
  notes?: string;
}

// Relaciones para el detalle de una orden (cliente/negocio).
const DETAIL_RELATIONS = [
  "business",
  "orderDetails",
  "orderDetails.menu",
  "orderStatusHistories",
];

export class OrderService {
  private readonly orderRepo = AppDataSource.getRepository(Orders);

  // GET /api/orders  (admin)
  async list() {
    const orders = await this.orderRepo.find({
      relations: ["user", "business", "orderDetails", "orderDetails.menu"],
      order: { createdAt: "DESC" },
      take: 100,
    });
    return orders.map(formatOrder);
  }

  // GET /api/orders/:id
  async getById(orderId: number) {
    const order = await this.orderRepo.findOne({
      where: { orderId },
      relations: [
        "user",
        "business",
        "orderDetails",
        "orderDetails.menu",
        "orderStatusHistories",
      ],
    });
    if (!order) throw new HttpError(404, "Orden no encontrada");
    return formatOrder(order);
  }

  // GET /api/orders/user/:userId
  async getByUser(userId: number) {
    const orders = await this.orderRepo.find({
      where: { userId },
      relations: DETAIL_RELATIONS,
      order: { createdAt: "DESC" },
    });
    return orders.map(formatOrder);
  }

  // GET /api/orders/business/:businessId
  async getByBusiness(businessId: number) {
    const orders = await this.orderRepo.find({
      where: { businessId },
      relations: [
        "user",
        "orderDetails",
        "orderDetails.menu",
        "orderStatusHistories",
      ],
      order: { createdAt: "DESC" },
    });
    return orders.map(formatOrder);
  }

  // POST /api/orders  — atómico: orden + detalles + historial en una transacción.
  async create(input: CreateOrderInput) {
    const {
      userId,
      businessId,
      items,
      total,
      customerName,
      customerPhone,
      deliveryAddress,
      notes,
    } = input;

    if (!items?.length) {
      throw new HttpError(400, "La orden debe contener al menos un item");
    }

    const newOrderId = await AppDataSource.transaction(async (manager) => {
      const orderRepo = manager.getRepository(Orders);
      const detailRepo = manager.getRepository(OrderDetails);
      const historyRepo = manager.getRepository(OrderStatusHistory);

      const order = orderRepo.create({
        userId,
        businessId,
        customerName,
        customerPhone,
        deliveryAddress,
        orderNotes: notes,
        total: total.toString(),
        status: "pending",
        deliveryStatus: "unassigned",
        orderDate: new Date(),
      });
      await orderRepo.save(order);

      for (const item of items) {
        await detailRepo.save(
          detailRepo.create({
            orderId: order.orderId,
            menuId: item.id,
            quantity: item.quantity,
            subtotal: (item.price * item.quantity).toString(),
            notes: item.note || null,
          }),
        );
      }

      await historyRepo.save(
        historyRepo.create({
          orderId: order.orderId,
          status: "pending",
          not: "Orden creada",
          changedBy: userId,
        }),
      );

      return order.orderId;
    });

    // Recargar con relaciones y emitir DESPUÉS de commitear la transacción.
    const fullOrder = await this.orderRepo.findOne({
      where: { orderId: newOrderId },
      relations: ["orderDetails", "orderDetails.menu", "orderStatusHistories"],
    });

    const formatted = formatOrder(fullOrder!);
    emitNewOrder(businessId, formatted);
    return formatted;
  }

  // PATCH /api/orders/:id/status
  async updateStatus(
    orderId: number,
    status: string,
    note: string | undefined,
    changedBy?: number,
  ) {
    if (!isValidStatus(status)) {
      throw new HttpError(400, "Estado inválido");
    }

    const order = await this.orderRepo.findOne({ where: { orderId } });
    if (!order) throw new HttpError(404, "Orden no encontrada");

    order.status = status;
    await this.orderRepo.save(order);

    await AppDataSource.getRepository(OrderStatusHistory).save(
      AppDataSource.getRepository(OrderStatusHistory).create({
        orderId: order.orderId,
        status,
        not: note || `Estado cambiado a ${status}`,
        changedBy,
      }),
    );

    emitOrderStatusUpdate(order.userId!, {
      orderId: order.orderId,
      status: order.status,
      statusLabel: getStatusLabel(order.status!),
      timestamp: new Date().toISOString(),
    });

    return { orderId: order.orderId, status: order.status };
  }
}