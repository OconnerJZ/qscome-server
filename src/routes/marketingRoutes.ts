import { Router } from "express";
import { MarketingController } from "../controllers/MarketingController";
import { authenticate } from "../middlewares/authMiddleware";
import { requireActiveBusinessParam } from "../middlewares/businessPlatform";
import { requireBusinessFeature } from "../middlewares/featureControl";
import { requireBusinessPermission } from "../middlewares/ownership";

const router = Router();
const controller = new MarketingController();

router.get("/sponsored", controller.sponsored);

router.get(
  "/business/:businessId",
  authenticate,
  requireBusinessPermission("marketing.manage", "businessId"),
  requireActiveBusinessParam("businessId"),
  controller.overview,
);
router.get(
  "/business/:businessId/segments",
  authenticate,
  requireBusinessPermission("marketing.manage", "businessId"),
  requireActiveBusinessParam("businessId"),
  controller.segments,
);
router.post(
  "/business/:businessId/campaigns",
  authenticate,
  requireBusinessPermission("marketing.manage", "businessId"),
  requireActiveBusinessParam("businessId"),
  requireBusinessFeature("marketing.center", "write", "businessId"),
  controller.createCampaign,
);
router.patch(
  "/business/:businessId/campaigns/:campaignId/status",
  authenticate,
  requireBusinessPermission("marketing.manage", "businessId"),
  requireActiveBusinessParam("businessId"),
  requireBusinessFeature("marketing.center", "write", "businessId"),
  controller.setCampaignStatus,
);
router.post(
  "/business/:businessId/ads",
  authenticate,
  requireBusinessPermission("marketing.manage", "businessId"),
  requireActiveBusinessParam("businessId"),
  controller.createAd,
);
router.post(
  "/business/:businessId/ads/:adCampaignId/submit",
  authenticate,
  requireBusinessPermission("marketing.manage", "businessId"),
  requireActiveBusinessParam("businessId"),
  controller.submitAd,
);
router.post(
  "/business/:businessId/ads/:adCampaignId/pause",
  authenticate,
  requireBusinessPermission("marketing.manage", "businessId"),
  requireActiveBusinessParam("businessId"),
  controller.pauseAd,
);

export default router;
