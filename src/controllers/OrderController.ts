import { Request, Response } from "express";
import { AppDataSource } from "../utils/db";
import { Orders } from "../entities/Orders";
import { OrderDetails } from "../entities/OrderDetails";
import { OrderStatusHistory } from "../entities/OrderStatusHistory";
import { emitNewOrder, emitOrderStatusUpdate } from "../utils/socket";

export class OrderController {
  private orderRepo = AppDataSource.getRepository(Orders);
  private detailRepo = AppDataSource.getRepository(OrderDetails);
  private historyRepo = AppDataSource.getRepository(OrderStatusHistory);

  // GET /api/orders
  async getAll(req: Request, res: Response) {
    try {
      const orders = await this.orderRepo.find({
        relations: ["user", "business", "orderDetails", "orderDetails.menu"],
        order: { createdAt: "DESC" },
        take: 100,
      });

      return res.json({
        success: true,
        data: orders.map((o) => this.formatOrder(o)),
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // GET /api/orders/:id
  async getById(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const order = await this.orderRepo.findOne({
        where: { orderId: Number.parseInt(id) },
        relations: [
          "user",
          "business",
          "orderDetails",
          "orderDetails.menu",
          "orderStatusHistories",
        ],
      });

      if (!order) {
        return res.status(404).json({
          success: false,
          message: "Orden no encontrada",
        });
      }

      return res.json({
        success: true,
        data: this.formatOrder(order),
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // GET /api/orders/user/:userId
  async getByUser(req: Request, res: Response) {
    try {
      const { userId } = req.params;

      const orders = await this.orderRepo.find({
        where: { userId: Number.parseInt(userId) },
        relations: [
          "business",
          "orderDetails",
          "orderDetails.menu",
          "orderStatusHistories",
        ],
        order: { createdAt: "DESC" },
      });

      return res.json({
        success: true,
        data: orders.map((o) => this.formatOrder(o)),
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // GET /api/orders/business/:businessId
  async getByBusiness(req: Request, res: Response) {
    try {
      const { businessId } = req.params;

      const orders = await this.orderRepo.find({
        where: { businessId: Number.parseInt(businessId) },
        relations: [
          "user",
          "orderDetails",
          "orderDetails.menu",
          "orderStatusHistories",
        ],
        order: { createdAt: "DESC" },
      });

      return res.json({
        success: true,
        data: orders.map((o) => this.formatOrder(o)),
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // POST /api/orders
  async create(req: Request, res: Response) {
    try {
      const {
        userId,
        businessId,
        items,
        total,
        customerName,
        customerPhone,
        deliveryAddress,
        notes,
      } = req.body;

      // Crear orden
      const order = this.orderRepo.create({
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

      await this.orderRepo.save(order);

      // Crear detalles de orden
      for (const item of items) {
        const detail = this.detailRepo.create({
          orderId: order.orderId,
          menuId: item.id,
          quantity: item.quantity,
          subtotal: (item.price * item.quantity).toString(),
          notes: item.note || null,
        });
        await this.detailRepo.save(detail);
      }

      // Crear historial de estado
      const history = this.historyRepo.create({
        orderId: order.orderId,
        status: "pending",
        not: "Orden creada",
        changedBy: userId,
      });
      await this.historyRepo.save(history);

      // Recargar orden con relaciones
      const fullOrder = await this.orderRepo.findOne({
        where: { orderId: order.orderId },
        relations: [
          "orderDetails",
          "orderDetails.menu",
          "orderStatusHistories",
        ],
      });
      // ✅ EMITIR EVENTO DE SOCKET.IO
      emitNewOrder(businessId, this.formatOrder(fullOrder!));

      return res.status(201).json({
        success: true,
        message: "Orden creada exitosamente",
        data: this.formatOrder(fullOrder!),
      });
    } catch (error: any) {
      console.error("Error creando orden:", error);
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // PATCH /api/orders/:id/status
  async updateStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { status, note } = req.body;

      const validStatuses = [
        "pending",
        "accepted",
        "preparing",
        "ready",
        "in_delivery",
        "ready_for_pickup",
        "completed",
        "cancelled",
      ];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Estado inválido",
        });
      }

      const order = await this.orderRepo.findOne({
        where: { orderId: Number.parseInt(id) },
      });

      if (!order) {
        return res.status(404).json({
          success: false,
          message: "Orden no encontrada",
        });
      }

      // Actualizar estado
      order.status = status as any;
      await this.orderRepo.save(order);

      // Registrar en historial
      const history = this.historyRepo.create({
        orderId: order.orderId,
        status,
        not: note || `Estado cambiado a ${status}`,
        changedBy: (req as any).user?.userId,
      });
      await this.historyRepo.save(history);

      emitOrderStatusUpdate(order.userId!, {
        orderId: order.orderId,
        status: order.status,
        statusLabel: this.getStatusLabel(order.status!),
        timestamp: new Date().toISOString(),
      });

      return res.json({
        success: true,
        message: "Estado actualizado",
        data: { orderId: order.orderId, status: order.status },
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  private getStatusLabel(status: string): string {
  const labels: { [key: string]: string } = {
    'pending': 'Pendiente',
    'accepted': 'Aceptada',
    'preparing': 'Preparando',
    'ready': 'Lista',
    'in_delivery': 'En Camino',
    'ready_for_pickup': 'Lista para recoger',
    'completed': 'Completada',
    'cancelled': 'Cancelada'
  };
  return labels[status] || status;
}

  // Método auxiliar para formatear orden
  private formatOrder(order: Orders) {
    return {
      id: order.orderId,
      userId: order.userId,
      businessId: order.businessId,
      businessName: order.business?.businessName,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      customerEmail: order.user?.email,
      status: order.status,
      deliveryStatus: order.deliveryStatus,
      deliveryAddress: order.deliveryAddress,
      notes: order.orderNotes,
      total: Number.parseFloat(order.total || "0"),
      items:
        order.orderDetails?.map((d) => ({
          id: d.menuId,
          name: d.menu?.itemName,
          quantity: d.quantity,
          price: Number.parseFloat(d.menu?.price || "0"),
          subtotal: Number.parseFloat(d.subtotal || "0"),
          note: d.notes,
        })) || [],
      statusHistory:
        order.orderStatusHistories?.map((h) => ({
          status: h.status,
          timestamp: h.createdAt,
          note: h.not,
          changedBy: h.changedBy,
        })) || [],
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };
  }
}
