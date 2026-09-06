import { NextFunction, Request, Response } from "express";
import { AdminService } from "../services/AdminService";
import { BusinessPlanImpactService } from "../services/BusinessPlanImpactService";

export class AdminController {
  private readonly service = new AdminService();
  private readonly planImpact = new BusinessPlanImpactService();

  searchBusinesses = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const limit = Number.parseInt(String(req.query.limit || "20"), 10);
      res.json({
        success: true,
        data: await this.service.searchBusinesses(String(req.query.q || ""), limit),
      });
    } catch (error) {
      next(error);
    }
  };

  previewPlanImpact = async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.json({
        success: true,
        data: await this.planImpact.preview(
          Number(req.params.id),
          String(req.query.planCode || ""),
        ),
      });
    } catch (error) {
      next(error);
    }
  };
}
