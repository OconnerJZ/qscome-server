// src/controllers/MenuController.ts
// Controller delgado: parsea HTTP y delega en MenuService. Errores → errorHandler.

import { Request, Response, NextFunction } from "express";
import { MenuService } from "../services/MenuService";

export class MenuController {
  private readonly service = new MenuService();

  getAll = async (_req: Request, res: Response, next: NextFunction) => {
    try { res.json({ success: true, data: await this.service.list() }); } catch (error) { next(error); }
  };

  getById = async (req: Request, res: Response, next: NextFunction) => {
    try { res.json({ success: true, data: await this.service.getById(Number.parseInt(req.params.id, 10)) }); } catch (error) { next(error); }
  };

  getByBusiness = async (req: Request, res: Response, next: NextFunction) => {
    try { res.json({ success: true, data: await this.service.getByBusiness(Number.parseInt(req.params.businessId, 10)) }); } catch (error) { next(error); }
  };

  getManagedByBusiness = async (req: Request, res: Response, next: NextFunction) => {
    try { res.json({ success: true, data: await this.service.getManagedByBusiness(Number.parseInt(req.params.businessId, 10)) }); } catch (error) { next(error); }
  };

  getModifierGroups = async (req: Request, res: Response, next: NextFunction) => {
    try { res.json({ success: true, data: await this.service.getModifierGroups(Number.parseInt(req.params.id, 10)) }); } catch (error) { next(error); }
  };

  replaceModifierGroups = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.service.replaceModifierGroups(Number.parseInt(req.params.id, 10), req.body?.groups || []);
      res.json({ success: true, message: "Personalización actualizada", data });
    } catch (error) { next(error); }
  };

  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.service.create(req.body);
      res.status(201).json({ success: true, message: "Producto creado exitosamente", data });
    } catch (error) { next(error); }
  };

  update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.service.update(Number.parseInt(req.params.id, 10), req.body);
      res.json({ success: true, message: "Producto actualizado", data });
    } catch (error) { next(error); }
  };

  remove = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this.service.softDelete(Number.parseInt(req.params.id, 10));
      res.json({ success: true, message: "Producto eliminado" });
    } catch (error) { next(error); }
  };
}
