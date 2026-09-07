import { Router } from "express";
import { LoyaltyController } from "../controllers/LoyaltyController";
import { authenticate } from "../middlewares/authMiddleware";
import { requireBusinessPermission } from "../middlewares/ownership";

const router = Router();
const controller = new LoyaltyController();

router.get("/business/:businessId/program", controller.getProgram);
router.get("/business/:businessId/me", authenticate, controller.getMyProgress);
router.get("/me", authenticate, controller.listMine);
router.put(
  "/business/:businessId/program",
  authenticate,
  requireBusinessPermission("loyalty.manage", "businessId"),
  controller.saveProgram,
);

export default router;
