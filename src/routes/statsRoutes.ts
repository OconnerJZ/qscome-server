import { Router } from "express";
import { StatsController } from "../controllers/StatsController";
import { authenticate } from "../middlewares/authMiddleware";
import { authorize } from "../middlewares/roleMiddleware";
import { requireBusinessOwnership } from "../middlewares/ownership";

const router = Router();
const statsController = new StatsController();

router.get(
  "/business/:businessId",
  authenticate,
  authorize("admin", "owner"),
  requireBusinessOwnership("businessId"), // dueño de ESE negocio
  statsController.getBusinessStats,
);

export default router;