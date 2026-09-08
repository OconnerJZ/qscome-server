import { NextFunction, Request, Response } from "express";
import { BusinessPlanService } from "../services/BusinessPlanService";
import { HttpError } from "../utils/httpError";

const plans = new BusinessPlanService();

export const requireBusinessFeature = (
  featureKey: string,
  access: "read" | "write" = "read",
  paramName = "businessId",
) => async (req: Request, _res: Response, next: NextFunction) => {
  try {
    const businessId = Number.parseInt(String(req.params[paramName] || ""), 10);
    if (!Number.isInteger(businessId) || businessId < 1) {
      throw new HttpError(400, "Negocio inválido");
    }

    const capabilities = await plans.resolveCapabilities(businessId);
    const feature = capabilities.features.find((item) => item.key === featureKey);
    if (!feature?.included || feature.status !== "available") {
      throw new HttpError(403, "Esta funcionalidad no está habilitada para el negocio");
    }
    if (access === "write" && feature.accessMode !== "enabled") {
      throw new HttpError(403, "Esta funcionalidad está disponible en modo solo lectura");
    }

    next();
  } catch (error) {
    next(error);
  }
};
