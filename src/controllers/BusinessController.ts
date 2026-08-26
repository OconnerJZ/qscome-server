// src/controllers/BusinessController.ts
// Controller delgado: parsea HTTP y delega en BusinessService. El formateo vive
// en el serializer y los errores en el errorHandler global (via next).

import { Request, Response, NextFunction } from "express";
import { BusinessService } from "../services/BusinessService";

export class BusinessController {
  private readonly service = new BusinessService();

  // GET /api/business
  getAll = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      res.json({ success: true, data: await this.service.list() });
    } catch (error) {
      next(error);
    }
  };

  // GET /api/business/:id
  getById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.service.getById(Number.parseInt(req.params.id, 10));
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  };

  // GET /api/business/owner/:ownerId
  getByOwner = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.service.getByOwner(
        Number.parseInt(req.params.ownerId, 10),
      );
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  };

  // GET /api/business/:id/menu
  getMenu = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.service.getMenu(Number.parseInt(req.params.id, 10));
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  };

  // POST /api/business
  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.service.create(req.body);
      res
        .status(201)
        .json({ success: true, message: "Negocio creado exitosamente", data });
    } catch (error) {
      next(error);
    }
  };

  // PUT /api/business/:id
  update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.service.update(
        Number.parseInt(req.params.id, 10),
        req.body,
      );
      res.json({ success: true, message: "Negocio actualizado", data });
    } catch (error) {
      next(error);
    }
  };

  // ==========================================================================
  // SUB-RECURSOS (listos para rutear cuando se necesiten)
  // ==========================================================================

  updateLocation = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.service.updateLocation(
        Number.parseInt(req.params.id, 10),
        req.body,
      );
      res.json({ success: true, message: "Ubicación actualizada", data });
    } catch (error) {
      next(error);
    }
  };

  updateSchedules = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.service.updateSchedules(
        Number.parseInt(req.params.id, 10),
        req.body.schedules,
      );
      res.json({ success: true, message: "Horarios actualizados", data });
    } catch (error) {
      next(error);
    }
  };

  updateDeliverySettings = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const data = await this.service.updateDeliverySettings(
        Number.parseInt(req.params.id, 10),
        req.body,
      );
      res.json({
        success: true,
        message: "Configuración de delivery actualizada",
        data,
      });
    } catch (error) {
      next(error);
    }
  };

  updatePaymentMethods = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const data = await this.service.updatePaymentMethods(
        Number.parseInt(req.params.id, 10),
        req.body.payment_methods,
      );
      res.json({ success: true, message: "Métodos de pago actualizados", data });
    } catch (error) {
      next(error);
    }
  };

  updateFoodTypes = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.service.updateFoodTypes(
        Number.parseInt(req.params.id, 10),
        req.body.food_type_ids,
      );
      res.json({ success: true, message: "Tipos de comida actualizados", data });
    } catch (error) {
      next(error);
    }
  };

  addPhoto = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.service.addPhoto(
        Number.parseInt(req.params.id, 10),
        req.body.photo_url,
      );
      res.json({ success: true, message: "Foto agregada", data });
    } catch (error) {
      next(error);
    }
  };

  deletePhoto = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this.service.deletePhoto(Number.parseInt(req.params.photoId, 10));
      res.json({ success: true, message: "Foto eliminada" });
    } catch (error) {
      next(error);
    }
  };
}