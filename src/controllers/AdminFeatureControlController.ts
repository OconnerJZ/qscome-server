import { NextFunction, Response } from "express";
import { AuthRequest } from "../middlewares/authMiddleware";
import { AdminFeatureControlService } from "../services/AdminFeatureControlService";

export class AdminFeatureControlController {
  private readonly service = new AdminFeatureControlService();

  list = async (_req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      res.json({ success: true, data: await this.service.catalog() });
    } catch (error) {
      next(error);
    }
  };

  business = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      res.json({
        success: true,
        data: await this.service.business(Number(req.params.businessId)),
      });
    } catch (error) {
      next(error);
    }
  };

  updateGlobal = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      res.json({
        success: true,
        message: req.body.mode == null ? "Override global retirado" : "Override global actualizado",
        data: await this.service.setGlobal(
          String(req.params.featureKey || ""),
          req.body.mode,
          req.body.reason,
          Number(req.user?.userId),
        ),
      });
    } catch (error) {
      next(error);
    }
  };

  updatePlan = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      res.json({
        success: true,
        message: req.body.mode == null ? "Override de plan retirado" : "Override de plan actualizado",
        data: await this.service.setPlan(
          String(req.params.featureKey || ""),
          String(req.params.planCode || ""),
          req.body.mode,
          req.body.reason,
          Number(req.user?.userId),
        ),
      });
    } catch (error) {
      next(error);
    }
  };

  updateBusiness = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      res.json({
        success: true,
        message: req.body.mode == null ? "Override de negocio retirado" : "Override de negocio actualizado",
        data: await this.service.setBusiness(
          String(req.params.featureKey || ""),
          Number(req.params.businessId),
          req.body.mode,
          req.body.reason,
          Number(req.user?.userId),
        ),
      });
    } catch (error) {
      next(error);
    }
  };
}
