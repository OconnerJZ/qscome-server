import { Router } from "express";
import { AdminController } from "../controllers/AdminController";
import { BusinessPlanController } from "../controllers/BusinessPlanController";
import { authenticate } from "../middlewares/authMiddleware";
import { authorize } from "../middlewares/roleMiddleware";
import { validateDto } from "../middlewares/validateDto";
import {
  AssignBusinessPlanDto,
  CancelBusinessPlanTrialDto,
  GrantBusinessPlanTrialDto,
} from "../dtos/businessPlan.dto";

const router = Router();
const adminController = new AdminController();
const planController = new BusinessPlanController();
const adminOnly = [authenticate, authorize("admin")] as const;

router.get("/businesses", ...adminOnly, adminController.searchBusinesses);
router.get("/businesses/:id/plan", ...adminOnly, planController.get);
router.get("/businesses/:id/plan/impact", ...adminOnly, adminController.previewPlanImpact);
router.patch(
  "/businesses/:id/plan",
  ...adminOnly,
  validateDto(AssignBusinessPlanDto),
  planController.assign,
);
router.post(
  "/businesses/:id/trial",
  ...adminOnly,
  validateDto(GrantBusinessPlanTrialDto),
  planController.grantTrial,
);
router.post(
  "/businesses/:id/trial/cancel",
  ...adminOnly,
  validateDto(CancelBusinessPlanTrialDto),
  planController.cancelTrial,
);
router.get("/businesses/:id/plan/history", ...adminOnly, planController.history);

export default router;
