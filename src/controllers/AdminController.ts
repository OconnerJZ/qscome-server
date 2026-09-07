import { NextFunction, Request, Response } from "express";
import { AuthRequest } from "../middlewares/authMiddleware";
import { AdminService } from "../services/AdminService";
import { AdminBusinessService } from "../services/AdminBusinessService";
import { AdminDashboardService } from "../services/AdminDashboardService";
import { BusinessPlanImpactService } from "../services/BusinessPlanImpactService";

export class AdminController {
  private readonly service = new AdminService();
  private readonly businesses = new AdminBusinessService();
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

  businessDetail = async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.json({
        success: true,
        data: await this.businesses.get(Number(req.params.id)),
      });
    } catch (error) {
      next(error);
    }
  };

  updateBusinessStatus = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const data = await this.businesses.setPlatformStatus(
        Number(req.params.id),
        String(req.body.status || ""),
        req.body.reason,
        Number(req.user?.userId),
      );
      res.json({
        success: true,
        message: req.body.status === "suspended" ? "Negocio suspendido" : "Negocio reactivado",
        data,
      });
    } catch (error) {
      next(error);
    }
  };

  updateBusinessVerification = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const verified = req.body.verified === true;
      const data = await this.businesses.setVerification(
        Number(req.params.id),
        verified,
        Number(req.user?.userId),
      );
      res.json({
        success: true,
        message: verified ? "Negocio verificado" : "Verificación retirada",
        data,
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
