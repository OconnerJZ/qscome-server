// src/services/OrderService.ts
import { AppDataSource } from "../utils/db";
import { Orders } from "../entities/Orders";
import { OrderDetails } from "../entities/OrderDetails";
import { OrderStatusHistory } from "../entities/OrderStatusHistory";
import { Menus } from "../entities/Menus";
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
  note?: string | null;
  price?: number;
}
export interface CreateOrderInput {
  userId: number;
  businessId: number;
  items: CreateOrderItem[];
  total?: number;
  orderType?: "pickup" | "delivery";
  customerName?: string;
  customerPhone?: string;
  deliveryAddress?: string;
  deliveryAddressId?: number | null;
  deliveryLocation?: {
    latitude?: number;
    longitude?: number;
    city?: string;
    postalCode?: string;
    state?: string;
  } | null;
  notes?: string;
}
interface OrderActor {
  userId?: number;
  role?: string;
}
const DETAIL_RELATIONS = [
  "business",
  "orderDetails",
  "orderDetails.menu",
  "orderStatusHistories",
];

const canMoveToStatus = (order: Orders, nextStatus: string) => {
  const current = order.status;
  if (!current) return false;
  if (nextStatus === "cancelled")
    return !["completed", "cancelled"].includes(current);
  const expected =
    current === "pending"
      ? "accepted"
      : current === "accepted"
        ? "preparing"
        : current === "preparing"
          ? "ready"
          : current === "ready"
            ? order.orderType === "pickup"
              ? "completed"
              : "in_delivery"
            : current === "in_delivery"
              ? "completed"
              : null;
  return expected === nextStatus;
};

export class OrderService {
  private readonly orderRepo = AppDataSource.getRepository(Orders);

  async list() {
    const orders = await this.orderRepo.find({
      relations: ["user", "business", "orderDetails", "orderDetails.menu"],
      order: { createdAt: "DESC" },
      take: 100,
    });
    return orders.map(formatOrder);
  }
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
  async getByUser(userId: number) {
    const orders = await this.orderRepo.find({
      where: { userId },
      relations: DETAIL_RELATIONS,
      order: { createdAt: "DESC" },
    });
    return orders.map(formatOrder);
  }
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

  async create(input: CreateOrderInput) {
    const {
      userId,
      businessId,
      items,
      orderType = "pickup",
      customerName,
      customerPhone,
      deliveryAddress,
      deliveryAddressId,
      deliveryLocation,
      notes,
    } = input;
    const normalizedBusinessId = Number(businessId);
    if (!userId) throw new HttpError(401, "Usuario no autenticado");
    if (!Number.isInteger(normalizedBusinessId) || normalizedBusinessId < 1)
      throw new HttpError(400, "Negocio inválido");
    if (!items?.length)
      throw new HttpError(400, "La orden debe contener al menos un item");
    if (orderType === "delivery" && !deliveryAddress?.trim())
      throw new HttpError(
        400,
        "La dirección de entrega es requerida para delivery",
      );

    const newOrderId = await AppDataSource.transaction(async (manager) => {
      const orderRepo = manager.getRepository(Orders);
      const detailRepo = manager.getRepository(OrderDetails);
      const historyRepo = manager.getRepository(OrderStatusHistory);
      const menuRepo = manager.getRepository(Menus);
      const pricedItems: Array<
        CreateOrderItem & {
          itemName: string;
          unitPrice: number;
          subtotal: number;
        }
      > = [];
      let calculatedTotal = 0;
      for (const item of items) {
        const quantity = Number(item.quantity);
        if (!Number.isInteger(quantity) || quantity < 1)
          throw new HttpError(400, "Cantidad de producto inválida");
        const menu = await menuRepo.findOne({
          where: { menuId: Number(item.id) },
        });
        if (!menu || Number(menu.businessId) !== normalizedBusinessId)
          throw new HttpError(
            400,
            `El producto ${item.id} no pertenece a este negocio`,
          );
        if (!menu.isAvailable)
          throw new HttpError(
            409,
            `${menu.itemName || "El producto"} ya no está disponible`,
          );
        const unitPrice = Number.parseFloat(menu.price || "0");
        const subtotal = Number((unitPrice * quantity).toFixed(2));
        calculatedTotal = Number((calculatedTotal + subtotal).toFixed(2));
        pricedItems.push({
          ...item,
          quantity,
          itemName: menu.itemName || `Producto ${menu.menuId}`,
          unitPrice,
          subtotal,
        });
      }

      const hasCoords =
        orderType === "delivery" &&
        deliveryLocation?.latitude != null &&
        deliveryLocation?.longitude != null;
      const order = orderRepo.create({
        userId,
        businessId: normalizedBusinessId,
        orderType,
        customerName,
        customerPhone,
        deliveryAddress: orderType === "delivery" ? deliveryAddress : null,
        deliveryAddressId:
          orderType === "delivery" && deliveryAddressId
            ? Number(deliveryAddressId)
            : null,
        deliveryLatitude: hasCoords
          ? Number(deliveryLocation!.latitude).toFixed(8)
          : null,
        deliveryLongitude: hasCoords
          ? Number(deliveryLocation!.longitude).toFixed(8)
          : null,
        deliveryCity:
          orderType === "delivery" ? deliveryLocation?.city || null : null,
        deliveryPostalCode:
          orderType === "delivery"
            ? deliveryLocation?.postalCode || null
            : null,
        orderNotes: notes,
        total: calculatedTotal.toFixed(2),
        status: "pending",
        deliveryStatus: "unassigned",
        orderDate: new Date(),
      });
      await orderRepo.save(order);
      for (const item of pricedItems)
        await detailRepo.save(
          detailRepo.create({
            orderId: order.orderId,
            menuId: item.id,
            itemName: item.itemName,
            unitPrice: item.unitPrice.toFixed(2),
            quantity: item.quantity,
            subtotal: item.subtotal.toFixed(2),
            notes: item.note || null,
          }),
        );
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

    const fullOrder = await this.orderRepo.findOne({
      where: { orderId: newOrderId },
      relations: ["orderDetails", "orderDetails.menu", "orderStatusHistories"],
    });
    const formatted = formatOrder(fullOrder!);
    emitNewOrder(normalizedBusinessId, formatted);
    return formatted;
  }

  async updateStatus(
    orderId: number,
    status: string,
    note: string | undefined,
    actor: OrderActor = {},
  ) {
    if (!isValidStatus(status)) throw new HttpError(400, "Estado inválido");
    const order = await this.orderRepo.findOne({ where: { orderId } });
    if (!order) throw new HttpError(404, "Orden no encontrada");
    const isPrivilegedRole = actor.role === "admin" || actor.role === "owner";
    const isCustomerActor = actor.userId === order.userId && !isPrivilegedRole;
    if (isCustomerActor) {
      if (status !== "cancelled")
        throw new HttpError(403, "El cliente sólo puede cancelar su orden");
      if (order.status !== "pending")
        throw new HttpError(
          409,
          "La orden ya fue aceptada y no puede cancelarse desde la aplicación",
        );
    }
    if (!canMoveToStatus(order, status))
      throw new HttpError(
        409,
        `Transición inválida: ${order.status} → ${status}`,
      );
    order.status = status;
    await this.orderRepo.save(order);
    await AppDataSource.getRepository(OrderStatusHistory).save(
      AppDataSource.getRepository(OrderStatusHistory).create({
        orderId: order.orderId,
        status,
        not: note || `Estado cambiado a ${status}`,
        changedBy: actor.userId,
      }),
    );
    if (order.userId)
      emitOrderStatusUpdate(order.userId, {
        orderId: order.orderId,
        status: order.status,
        statusLabel: getStatusLabel(order.status!),
        timestamp: new Date().toISOString(),
      });
    return { orderId: order.orderId, status: order.status };
  }
}
