import { Router } from "express";
import {
    createPayment,
    updatePaymentStatus
} from "../controllers/paymentController";
import { authenticate } from "../middlewares/authMiddleware";

const router = Router();

router.post("/", authenticate, createPayment);
router.patch("/:id/status", authenticate, updatePaymentStatus);

export default router;
