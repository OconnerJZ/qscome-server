import { Router } from "express";
import {
    getAllOrders,
    getOrderById,
    createOrder,
    updateOrderStatus
} from "../controllers/orderController";
import { authenticate } from "../middlewares/authMiddleware";
import { authorize } from "../middlewares/roleMiddleware";

const router = Router();

router.get("/", authenticate, getAllOrders);
router.get("/:id", authenticate, getOrderById);
router.post("/", authenticate, createOrder);
router.patch("/:id/status", authenticate, authorize("admin", "owner", "delivery"), updateOrderStatus);

export default router;
