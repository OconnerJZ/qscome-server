import { NextFunction, Request, Response } from "express";
import { AppDataSource } from "../utils/db";
import { SharedOrderItem } from "../entities/SharedOrderItem";
import { BusinessPlatformService } from "../services/BusinessPlatformService";
import { HttpError } from "../utils/httpError";

const platform = new BusinessPlatformService();
const parseBusinessId = (value: unknown) => {
  const id = Number(value);
  if (!Number.isInteger(id) || id < 1) throw new HttpError(400, "Negocio inválido");
  return id;
};

export const requireActiveBusinessParam = (param = "id") =>
  async (req: Request, _res: Response, next: NextFunction) => {
    try {
      await platform.assertActive(parseBusinessId(req.params[param]));
      next();
    } catch (error) {
      next(error);
    }
  };

export const requireActiveBusinessBody = (field = "businessId") =>
  async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const value = req.body?.[field] ?? req.body?.businessId ?? req.body?.business_id;
      await platform.assertActive(parseBusinessId(value));
      next();
    } catch (error) {
      next(error);
    }
  };

export const requireActiveBusinessesFromItemsBody = (field = "items") =>
  async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const items = Array.isArray(req.body?.[field]) ? req.body[field] : [];
      if (!items.length) throw new HttpError(400, "El carrito no contiene negocios válidos");
      await platform.assertActiveMany(items.map((item: any) => parseBusinessId(item?.businessId ?? item?.business_id)));
      next();
    } catch (error) {
      next(error);
    }
  };

export const requireActiveSharedSessionBusinesses = (param = "id") =>
  async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const sessionId = String(req.params[param] || "").trim();
      if (!sessionId) throw new HttpError(400, "Orden compartida inválida");
      const items = await AppDataSource.getRepository(SharedOrderItem).find({
        where: { sessionId },
        select: { businessId: true },
      });
      const businessIds = [...new Set(items.map((item) => Number(item.businessId)).filter((id) => Number.isInteger(id) && id > 0))];
      if (businessIds.length) await platform.assertActiveMany(businessIds);
      next();
    } catch (error) {
      next(error);
    }
  };
