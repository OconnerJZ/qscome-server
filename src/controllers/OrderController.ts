// src/controllers/OrderController.ts
// Controller delgado: sólo traduce HTTP ↔ service. La lógica vive en OrderService
// y el formateo en el serializer. Los errores se delegan al errorHandler global.

import { Request, Response, NextFunction } from "express";
import { OrderService } from "../services/OrderService";

export class OrderController {
  private readonly service = new OrderService();

  // GET /api/orders
  getAll = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.service.list();
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  };

  // GET /api/orders/:id
  getById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.service.getById(Number.parseInt(req.params.id, 10));
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  };

  // GET /api/orders/user/:userId
  getByUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.service.getByUser(
        Number.parseInt(req.params.userId, 10),
      );
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  };

  // GET /api/orders/business/:businessId
  getByBusiness = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.service.getByBusiness(
        Number.parseInt(req.params.businessId, 10),
      );
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  };

  // POST /api/orders
  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.service.create(req.body);
      res
        .status(201)
        .json({ success: true, message: "Orden creada exitosamente", data });
    } catch (error) {
      next(error);
    }
  };

  // PATCH /api/orders/:id/status
  updateStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const changedBy = (req as any).user?.userId;
      const data = await this.service.updateStatus(
        Number.parseInt(req.params.id, 10),
        req.body.status,
        req.body.note,
        changedBy,
      );
      res.json({ success: true, message: "Estado actualizado", data });
    } catch (error) {
      next(error);
    }
  };
}