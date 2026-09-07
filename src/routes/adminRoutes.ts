import { Router } from "express";
import { AdminController } from "../controllers/AdminController";
import { authenticate } from "../middlewares/authMiddleware";
import { authorize } from "../middlewares/roleMiddleware";
import { validateDto } from "../middlewares/validateDto";
import {
  UpdateAdminBusinessStatusDto,
  UpdateAdminBusinessVerificationDto,
} from "../dtos/adminBusiness.dto";
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
const adminOnly = [authenticate, authorize("admin")] as const;

router.get("/dashboard", ...adminOnly, adminController.dashboard);

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
