// src/controllers/OrderController.ts
// Controller delgado: sólo traduce HTTP ↔ service. La lógica vive en OrderService
// y el formateo en el serializer. Los errores se delegan al errorHandler global.

import { Request, Response, NextFunction } from "express";
import { OrderService } from "../services/OrderService";

export class OrderController {
  private readonly service = new OrderService();

  getAll = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.service.list();
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.service.getById(Number.parseInt(req.params.id, 10));
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  };

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

  // El usuario de la orden siempre sale del JWT; nunca confiamos en userId del body.
  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authenticatedUserId = (req as any).user?.userId;
      const data = await this.service.create({
        ...req.body,
        userId: authenticatedUserId,
      });
      res
        .status(201)
        .json({ success: true, message: "Orden creada exitosamente", data });
    } catch (error) {
      next(error);
    }
  };

  updateStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const actor = (req as any).user;
      const data = await this.service.updateStatus(
        Number.parseInt(req.params.id, 10),
        req.body.status,
        req.body.note,
        { userId: actor?.userId, role: actor?.role },
      );
      res.json({ success: true, message: "Estado actualizado", data });
    } catch (error) {
      next(error);
    }
  };
}
