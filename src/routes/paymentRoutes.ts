import { Router, Request, Response } from "express";
import { authenticate } from "../middlewares/authMiddleware";
import { PaymentController } from "../controllers/paymentController";

const router = Router();
const paymentController = new PaymentController();

router.post("/payments", 
    authenticate,
    (req: Request, res: Response) => paymentController.create(req, res)
);

router.get("/payments/:id/verify", 
    authenticate,
    (req: Request, res: Response) => paymentController.verify(req, res)
);

export default router;