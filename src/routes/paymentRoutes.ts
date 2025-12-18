import { Router, Request, Response } from "express";
import { authenticate } from "../middlewares/authMiddleware";
import { PaymentController } from "../controllers/PaymentController";

const router = Router();
const paymentController = new PaymentController();

router.post("/", 
  authenticate,
  (req: Request, res: Response) => paymentController.create(req, res)
);

router.get("/:id/verify", 
  authenticate,
  (req: Request, res: Response) => paymentController.verify(req, res)
);


export default router;
