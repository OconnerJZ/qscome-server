import { Router } from "express";
import { AdminAuditController } from "../controllers/AdminAuditController";
import { AdminController } from "../controllers/AdminController";
import { AdminFeatureControlController } from "../controllers/AdminFeatureControlController";
import { AdminHealthController } from "../controllers/AdminHealthController";
import { AdminMarketingController } from "../controllers/AdminMarketingController";
import { AdminPaymentsController } from "../controllers/AdminPaymentsController";
import { authenticate } from "../middlewares/authMiddleware";
import { authorize } from "../middlewares/roleMiddleware";
import { validateDto } from "../middlewares/validateDto";
import {
  UpdateAdminBusinessStatusDto,
  UpdateAdminBusinessVerificationDto,
} from "../dtos/adminBusiness.dto";
import { UpdateFeatureControlOverrideDto } from "../dtos/adminFeatureControl.dto";
import {
  AdminMarketingInterventionDto,
  ModerateAdminAdDto,
} from "../dtos/adminMarketing.dto";
import {
  UpdateAdminUserRoleDto,
  UpdateAdminUserStatusDto,
} from "../dtos/adminUser.dto";
import {
  AssignBusinessPlanDto,
  CancelBusinessPlanTrialDto,
  GrantBusinessPlanTrialDto,
} from "../dtos/businessPlan.dto";

const router = Router();
const adminController = new AdminController();
const auditController = new AdminAuditController();
const featureController = new AdminFeatureControlController();
const healthController = new AdminHealthController();
const marketingController = new AdminMarketingController();
const paymentsController = new AdminPaymentsController();
const adminOnly = [authenticate, authorize("admin")] as const;

router.get("/dashboard", ...adminOnly, adminController.dashboard);
router.get("/health", ...adminOnly, healthController.snapshot);
router.get("/audit/summary", ...adminOnly, auditController.summary);
router.get("/audit", ...adminOnly, auditController.list);

router.get("/users", ...adminOnly, adminController.searchUsers);
router.get("/users/:id", ...adminOnly, adminController.userDetail);
router.patch(
  "/users/:id/status",
  ...adminOnly,
  validateDto(UpdateAdminUserStatusDto),
  adminController.updateUserStatus,
);
router.patch(
  "/users/:id/role",
  ...adminOnly,
  validateDto(UpdateAdminUserRoleDto),
  adminController.updateUserRole,
);

router.get("/plans/summary", ...adminOnly, adminController.planSummary);

router.get("/features", ...adminOnly, featureController.list);
router.get("/features/businesses/:businessId", ...adminOnly, featureController.business);
router.patch(
  "/features/:featureKey/global",
  ...adminOnly,
  validateDto(UpdateFeatureControlOverrideDto),
  featureController.updateGlobal,
);
router.patch(
  "/features/:featureKey/plans/:planCode",
  ...adminOnly,
  validateDto(UpdateFeatureControlOverrideDto),
  featureController.updatePlan,
);
router.patch(
  "/features/:featureKey/businesses/:businessId",
  ...adminOnly,
  validateDto(UpdateFeatureControlOverrideDto),
  featureController.updateBusiness,
);

router.get("/marketing/summary", ...adminOnly, marketingController.summary);
router.get("/marketing/campaigns", ...adminOnly, marketingController.campaigns);
router.patch(
  "/marketing/campaigns/:campaignId/status",
  ...adminOnly,
  validateDto(AdminMarketingInterventionDto),
  marketingController.setCampaignStatus,
);
router.get("/marketing/ads", ...adminOnly, marketingController.ads);
router.patch(
  "/marketing/ads/:adCampaignId/moderation",
  ...adminOnly,
  validateDto(ModerateAdminAdDto),
  marketingController.moderateAd,
);
router.patch(
  "/marketing/ads/:adCampaignId/status",
  ...adminOnly,
  validateDto(AdminMarketingInterventionDto),
  marketingController.setAdStatus,
);

router.get("/payments/summary", ...adminOnly, paymentsController.summary);
router.get("/payments/transfers", ...adminOnly, paymentsController.transfers);
router.get("/payments/transfers/:orderId", ...adminOnly, paymentsController.detail);

router.get("/businesses", ...adminOnly, adminController.searchBusinesses);
router.get("/businesses/:id", ...adminOnly, adminController.businessDetail);
router.patch(
  "/businesses/:id/status",
  ...adminOnly,
  validateDto(UpdateAdminBusinessStatusDto),
  adminController.updateBusinessStatus,
);
router.patch(
  "/businesses/:id/verification",
  ...adminOnly,
  validateDto(UpdateAdminBusinessVerificationDto),
  adminController.updateBusinessVerification,
);
router.get("/businesses/:id/plan", ...adminOnly, adminController.businessPlan);
router.get("/businesses/:id/plan/impact", ...adminOnly, adminController.previewPlanImpact);
router.patch(
  "/businesses/:id/plan",
  ...adminOnly,
  validateDto(AssignBusinessPlanDto),
  adminController.assignBusinessPlan,
);
router.post(
  "/businesses/:id/trial",
  ...adminOnly,
  validateDto(GrantBusinessPlanTrialDto),
  adminController.grantBusinessTrial,
);
router.post(
  "/businesses/:id/trial/cancel",
  ...adminOnly,
  validateDto(CancelBusinessPlanTrialDto),
  adminController.cancelBusinessTrial,
);
router.get("/businesses/:id/plan/history", ...adminOnly, adminController.businessPlanHistory);

export default router;
