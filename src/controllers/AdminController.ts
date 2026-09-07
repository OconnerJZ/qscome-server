import { NextFunction, Request, Response } from "express";
import { AdminService } from "../services/AdminService";
import { AdminDashboardService } from "../services/AdminDashboardService";
import { BusinessPlanImpactService } from "../services/BusinessPlanImpactService";

export class AdminController {
  private readonly service = new AdminService();
  private readonly dashboardService = new AdminDashboardService();
  private readonly planImpact = new BusinessPlanImpactService();

  dashboard = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      res.json({
        success: true,
        data: await this.dashboardService.getDashboard(),
      });
    } catch (error) {
      next(error);
    }
  };

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
