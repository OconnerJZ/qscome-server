import { NextFunction, Request, Response } from "express";
import { AuthRequest } from "../middlewares/authMiddleware";
import { AdminService } from "../services/AdminService";
import { AdminBusinessService } from "../services/AdminBusinessService";
import { AdminUserService } from "../services/AdminUserService";
import { AdminDashboardService } from "../services/AdminDashboardService";
import { AdminPlanService } from "../services/AdminPlanService";
import { BusinessPlanImpactService } from "../services/BusinessPlanImpactService";

export class AdminController {
  private readonly service = new AdminService();
  private readonly businesses = new AdminBusinessService();
  private readonly users = new AdminUserService();
  private readonly plans = new AdminPlanService();
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

  searchUsers = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const limit = Number.parseInt(String(req.query.limit || "20"), 10);
      res.json({
        success: true,
        data: await this.users.search(String(req.query.q || ""), limit),
      });
    } catch (error) {
      next(error);
    }
  };

  userDetail = async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.json({
        success: true,
        data: await this.users.get(Number(req.params.id)),
      });
    } catch (error) {
      next(error);
    }
  };

  updateUserStatus = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const data = await this.users.setStatus(
        Number(req.params.id),
        String(req.body.status || ""),
        req.body.reason,
        Number(req.user?.userId),
      );
      res.json({
        success: true,
        message: req.body.status === "blocked" ? "Usuario bloqueado" : "Usuario reactivado",
        data,
      });
    } catch (error) {
      next(error);
    }
  };

  updateUserRole = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const data = await this.users.setRole(
        Number(req.params.id),
        String(req.body.role || ""),
        Number(req.user?.userId),
      );
      res.json({
        success: true,
        message: "Rol global actualizado",
        data,
      });
    } catch (error) {
      next(error);
    }
  };

  planSummary = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      res.json({ success: true, data: await this.plans.summary() });
    } catch (error) {
      next(error);
    }
  };

  businessPlan = async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.json({ success: true, data: await this.plans.get(Number(req.params.id)) });
    } catch (error) {
      next(error);
    }
  };

  assignBusinessPlan = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      res.json({
        success: true,
        message: "Plan base actualizado",
        data: await this.plans.assign(
          Number(req.params.id),
          String(req.body.planCode || ""),
          Number(req.user?.userId),
          req.body.expectedVersion,
        ),
      });
    } catch (error) {
      next(error);
    }
  };

  grantBusinessTrial = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const startsAt = req.body.startsAt ? new Date(req.body.startsAt) : undefined;
      const data = await this.plans.grantTrial(
        Number(req.params.id),
        Number(req.user?.userId),
        {
          planCode: String(req.body.planCode || ""),
          startsAt,
          endsAt: new Date(req.body.endsAt),
          expectedVersion: req.body.expectedVersion,
        },
      );
      res.json({
        success: true,
        message: data.trial?.lifecycle === "scheduled" ? "Trial programado" : "Trial activado",
        data,
      });
    } catch (error) {
      next(error);
    }
  };

  cancelBusinessTrial = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      res.json({
        success: true,
        message: "Trial cancelado",
        data: await this.plans.cancelTrial(
          Number(req.params.id),
          Number(req.user?.userId),
          req.body.expectedVersion,
        ),
      });
    } catch (error) {
      next(error);
    }
  };

  businessPlanHistory = async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.json({
        success: true,
        data: await this.plans.history(Number(req.params.id)),
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
