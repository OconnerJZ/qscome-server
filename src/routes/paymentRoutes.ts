import { Router } from "express";
import { authenticate } from "../middlewares/authMiddleware";
import { PaymentController } from "../controllers/PaymentController";
import { requirePaymentAccess } from "../middlewares/ownership";

const router = Router();
const paymentController = new PaymentController();

router.post("/", authenticate, paymentController.create);

router.get("/:id/verify", 
  authenticate,
  requirePaymentAccess("id"),
  paymentController.verify,
);


export default router;
