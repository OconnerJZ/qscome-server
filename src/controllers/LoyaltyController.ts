import { NextFunction, Request, Response } from "express";
import { BusinessPlanService } from "../services/BusinessPlanService";
import { LoyaltyService } from "../services/LoyaltyService";
import { HttpError } from "../utils/httpError";

export class LoyaltyController {
  private readonly service = new LoyaltyService();
  private readonly plans = new BusinessPlanService();

  getProgram = async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.json({ success: true, data: await this.service.getProgram(Number.parseInt(req.params.businessId, 10)) });
    } catch (error) { next(error); }
  };

  saveProgram = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const businessId = Number.parseInt(req.params.businessId, 10);
      const capabilities = await this.plans.resolveCapabilities(businessId);
      const management = capabilities.features.find((feature) => feature.key === "loyalty.management");
      if (management?.accessMode === "read_only") {
        throw new HttpError(409, "La gestión de lealtad está temporalmente en modo solo lectura");
      }
      res.json({
        success: true,
        message: "Programa de lealtad actualizado",
        data: await this.service.saveProgram(businessId, req.body),
      });
    } catch (error) { next(error); }
  };

  getMyProgress = async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.json({
        success: true,
        data: await this.service.getCustomerProgress(
          Number((req as any).user?.userId),
          Number.parseInt(req.params.businessId, 10),
        ),
      });
    } catch (error) { next(error); }
  };

  listMine = async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.json({ success: true, data: await this.service.listCustomerPrograms(Number((req as any).user?.userId)) });
    } catch (error) { next(error); }
  };
}
