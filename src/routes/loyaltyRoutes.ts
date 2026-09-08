import { Router } from "express";
import { LoyaltyController } from "../controllers/LoyaltyController";
import { authenticate } from "../middlewares/authMiddleware";
import { requireActiveBusinessParam } from "../middlewares/businessPlatform";
import { requireBusinessFeature } from "../middlewares/featureControl";
import { requireBusinessPermission } from "../middlewares/ownership";

const router = Router();
const controller = new LoyaltyController();

router.get(
  "/business/:businessId/program",
  requireActiveBusinessParam("businessId"),
  controller.getProgram,
);
router.get(
  "/business/:businessId/me",
  authenticate,
  requireActiveBusinessParam("businessId"),
  controller.getMyProgress,
);
router.get("/me", authenticate, controller.listMine);
router.put(
  "/business/:businessId/program",
  authenticate,
  requireBusinessPermission("loyalty.manage", "businessId"),
  requireActiveBusinessParam("businessId"),
  requireBusinessFeature("loyalty.management", "write", "businessId"),
  controller.saveProgram,
);

export default router;
