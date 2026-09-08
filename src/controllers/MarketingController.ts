import { NextFunction, Request, Response } from "express";
import { BusinessPlatformService } from "../services/BusinessPlatformService";
import { MarketingService } from "../services/MarketingService";

export class MarketingController {
  private readonly service = new MarketingService();
  private readonly platform = new BusinessPlatformService();

  overview = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const businessId = Number.parseInt(req.params.businessId, 10);
      res.json({ success: true, data: await this.service.overview(businessId) });
    } catch (error) { next(error); }
  };

  createCampaign = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const businessId = Number.parseInt(req.params.businessId, 10);
      const actorUserId = Number((req as any).user?.userId);
      res.status(201).json({ success: true, data: await this.service.createCampaign(businessId, actorUserId, req.body) });
    } catch (error) { next(error); }
  };

  setCampaignStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const businessId = Number.parseInt(req.params.businessId, 10);
      const campaignId = Number.parseInt(req.params.campaignId, 10);
      res.json({ success: true, data: await this.service.setCampaignStatus(businessId, campaignId, req.body?.status) });
    } catch (error) { next(error); }
  };

  segments = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const businessId = Number.parseInt(req.params.businessId, 10);
      res.json({ success: true, data: await this.service.segments(businessId) });
    } catch (error) { next(error); }
  };

  createAd = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const businessId = Number.parseInt(req.params.businessId, 10);
      const actorUserId = Number((req as any).user?.userId);
      res.status(201).json({ success: true, data: await this.service.createAd(businessId, actorUserId, req.body) });
    } catch (error) { next(error); }
  };

  submitAd = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const businessId = Number.parseInt(req.params.businessId, 10);
      const adCampaignId = Number.parseInt(req.params.adCampaignId, 10);
      res.json({ success: true, data: await this.service.submitAd(businessId, adCampaignId) });
    } catch (error) { next(error); }
  };

  pauseAd = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const businessId = Number.parseInt(req.params.businessId, 10);
      const adCampaignId = Number.parseInt(req.params.adCampaignId, 10);
      res.json({ success: true, data: await this.service.pauseAd(businessId, adCampaignId) });
    } catch (error) { next(error); }
  };

  sponsored = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const surface = String(req.query.surface || "explore") as "explore" | "hero";
      const data = await this.service.sponsored(surface);
      res.json({ success: true, data: await this.platform.filterActive(data) });
    } catch (error) { next(error); }
  };
}
