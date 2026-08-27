// src/controllers/OrderController.ts
// Controller delgado: sólo traduce HTTP ↔ service. La lógica vive en servicios
// y el formateo en el serializer. Los errores se delegan al errorHandler global.

import { Request, Response, NextFunction } from "express";
import { OrderService } from "../services/OrderService";
import { KitchenService } from "../services/KitchenService";
import { PendingOrderService } from "../services/PendingOrderService";
import { OrderAuditService } from "../services/OrderAuditService";
import { KitchenItemStatus } from "../entities/OrderDetails";

export class OrderController {
  private readonly service = new OrderService();
  private readonly kitchenService = new KitchenService();
  private readonly pendingOrderService = new PendingOrderService();
  private readonly auditService = new OrderAuditService();

  getAll = async (_req: Request, res: Response, next: NextFunction) => {
    try { res.json({ success: true, data: await this.service.list() }); } catch (error) { next(error); }
  };

  getById = async (req: Request, res: Response, next: NextFunction) => {
    try { res.json({ success: true, data: await this.service.getById(Number.parseInt(req.params.id, 10)) }); } catch (error) { next(error); }
  };

  getAudit = async (req: Request, res: Response, next: NextFunction) => {
    try { res.json({ success: true, data: await this.auditService.listByOrder(Number.parseInt(req.params.id, 10)) }); } catch (error) { next(error); }
  };

  getByUser = async (req: Request, res: Response, next: NextFunction) => {
    try { res.json({ success: true, data: await this.service.getByUser(Number.parseInt(req.params.userId, 10)) }); } catch (error) { next(error); }
  };

  getByBusiness = async (req: Request, res: Response, next: NextFunction) => {
    try { res.json({ success: true, data: await this.service.getByBusiness(Number.parseInt(req.params.businessId, 10)) }); } catch (error) { next(error); }
  };

  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authenticatedUserId = (req as any).user?.userId;
      const data = await this.service.create({ ...req.body, businessId: Number(req.body.businessId), userId: authenticatedUserId });
      res.status(201).json({ success: true, message: "Orden creada exitosamente", data });
    } catch (error) { next(error); }
  };

  updatePendingOrder = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const actor = (req as any).user;
      const data = await this.pendingOrderService.replaceItems(
        Number.parseInt(req.params.id, 10), req.body.items, Number(req.body.expectedVersion),
        { userId: actor?.userId, role: actor?.role },
      );
      res.json({ success: true, message: "Orden actualizada", data });
    } catch (error) { next(error); }
  };

  updateStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const actor = (req as any).user;
      const orderId = Number.parseInt(req.params.id, 10);
      if (req.body.status === "ready") await this.kitchenService.assertAllItemsReady(orderId);
      const data = await this.service.updateStatus(orderId, req.body.status, req.body.note, { userId: actor?.userId, role: actor?.role });
      res.json({ success: true, message: "Estado actualizado", data });
    } catch (error) { next(error); }
  };

  updateKitchenItemStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const actor = (req as any).user;
      const data = await this.kitchenService.updateItemStatus(
        Number.parseInt(req.params.id, 10), Number.parseInt(req.params.detailId, 10), req.body.status as KitchenItemStatus,
        { userId: actor?.userId, role: actor?.role },
      );
      res.json({ success: true, message: "Producto actualizado", data });
    } catch (error) { next(error); }
  };
}
