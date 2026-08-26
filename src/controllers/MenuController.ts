// src/controllers/MenuController.ts
// Controller delgado: parsea HTTP y delega en MenuService. Errores → errorHandler.

import { Request, Response, NextFunction } from "express";
import { MenuService } from "../services/MenuService";

export class MenuController {
  private readonly service = new MenuService();

  // GET /api/menus
  getAll = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      res.json({ success: true, data: await this.service.list() });
    } catch (error) {
      next(error);
    }
  };

  // GET /api/menus/:id
  getById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.service.getById(Number.parseInt(req.params.id, 10));
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  };

  // GET /api/menus/business/:businessId
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

  // POST /api/menus
  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.service.create(req.body);
      res
        .status(201)
        .json({ success: true, message: "Producto creado exitosamente", data });
    } catch (error) {
      next(error);
    }
  };

  // PUT /api/menus/:id
  update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.service.update(
        Number.parseInt(req.params.id, 10),
        req.body,
      );
      res.json({ success: true, message: "Producto actualizado", data });
    } catch (error) {
      next(error);
    }
  };

  // DELETE /api/menus/:id
  remove = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this.service.softDelete(Number.parseInt(req.params.id, 10));
      res.json({ success: true, message: "Producto eliminado" });
    } catch (error) {
      next(error);
    }
  };
}