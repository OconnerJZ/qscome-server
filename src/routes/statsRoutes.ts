import { Router } from "express";
import { StatsController } from "../controllers/StatsController";
import { authenticate } from "../middlewares/authMiddleware";
import { requireBusinessPermission } from "../middlewares/ownership";

const router = Router();
const statsController = new StatsController();

router.get(
  "/business/:businessId",
  authenticate,
  requireBusinessPermission("reports.read", "businessId"),
  statsController.getBusinessStats,
);

export default router;
