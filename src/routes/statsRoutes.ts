import { Router } from "express";
import { StatsController } from "../controllers/StatsController";
import { authenticate } from "../middlewares/authMiddleware";
import { requireActiveBusinessParam } from "../middlewares/businessPlatform";
import { requireBusinessPermission } from "../middlewares/ownership";

const router = Router();
const statsController = new StatsController();

router.get(
  "/business/:businessId/customers",
  authenticate,
  requireBusinessPermission("reports.read", "businessId"),
  requireActiveBusinessParam("businessId"),
  statsController.getCustomerIntelligence,
);

router.get(
  "/business/:businessId",
  authenticate,
  requireBusinessPermission("reports.read", "businessId"),
  requireActiveBusinessParam("businessId"),
  statsController.getBusinessStats,
);

export default router;
