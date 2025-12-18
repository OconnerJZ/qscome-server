import { Router, Request, Response } from "express";
import { StatsController } from "../controllers/StatsController";
import { authenticate } from "../middlewares/authMiddleware";
import { authorize } from "../middlewares/roleMiddleware";

const router = Router();
const statsController = new StatsController();

router.get("/business/:businessId", 
  authenticate,
  authorize("admin", "owner"),
  (req: Request, res: Response) => statsController.getBusinessStats(req, res)
);

export default router;