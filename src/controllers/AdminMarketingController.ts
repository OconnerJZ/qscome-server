import { NextFunction, Response } from "express";
import { AuthRequest } from "../middlewares/authMiddleware";
import { AdminMarketingService } from "../services/AdminMarketingService";

export class AdminMarketingController {
  private readonly service = new AdminMarketingService();

  summary = async (_req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      res.json({ success: true, data: await this.service.summary() });
    } catch (error) {
      next(error);
    }
  };

  campaigns = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      res.json({
        success: true,
        data: await this.service.campaigns({
          q: req.query.q,
          status: req.query.status,
          limit: req.query.limit,
        }),
      });
    } catch (error) {
      next(error);
    }
  };

  ads = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      res.json({
        success: true,
        data: await this.service.ads({
          q: req.query.q,
          status: req.query.status,
          moderation: req.query.moderation,
          limit: req.query.limit,
        }),
      });
    } catch (error) {
      next(error);
    }
  };

  moderateAd = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      res.json({
        success: true,
        message: req.body.decision === "approved" ? "Campaña aprobada por moderación" : "Campaña rechazada por moderación",
        data: await this.service.moderateAd(
          Number(req.params.adCampaignId),
          req.body.decision,
          req.body.reason,
          Number(req.user?.userId),
        ),
      });
    } catch (error) {
      next(error);
    }
  };

  setCampaignStatus = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      res.json({
        success: true,
        message: req.body.status === "paused" ? "Campaña pausada por administración" : "Campaña finalizada por administración",
        data: await this.service.setCampaignStatus(
          Number(req.params.campaignId),
          req.body.status,
          req.body.reason,
          Number(req.user?.userId),
        ),
      });
    } catch (error) {
      next(error);
    }
  };

  setAdStatus = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      res.json({
        success: true,
        message: req.body.status === "paused" ? "Campaña publicitaria pausada" : "Campaña publicitaria finalizada",
        data: await this.service.setAdStatus(
          Number(req.params.adCampaignId),
          req.body.status,
          req.body.reason,
          Number(req.user?.userId),
        ),
      });
    } catch (error) {
      next(error);
    }
  };
}
