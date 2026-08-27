import { Router } from "express";
import { OrderController } from "../controllers/OrderController";
import { authenticate } from "../middlewares/authMiddleware";
import { authorize } from "../middlewares/roleMiddleware";
import { requireBusinessOwnership, requireOrderAccess, requireSelfOrAdmin } from "../middlewares/ownership";
import { createOrderValidation } from "../validators/orderValidators";
import { validateRequest } from "../middlewares/validationMiddleware";

const router = Router();
const orderController = new OrderController();

router.get("/", authenticate, authorize("admin"), orderController.getAll);
router.get("/user/:userId", authenticate, requireSelfOrAdmin("userId"), orderController.getByUser);
router.get("/business/:businessId", authenticate, authorize("admin", "owner"), requireBusinessOwnership("businessId"), orderController.getByBusiness);
router.get("/:id/audit", authenticate, requireOrderAccess("id"), orderController.getAudit);
router.get("/:id", authenticate, requireOrderAccess("id"), orderController.getById);

router.post("/", authenticate, createOrderValidation, validateRequest, orderController.create);
router.put("/:id/items", authenticate, requireOrderAccess("id"), orderController.updatePendingOrder);
router.patch("/:id/status", authenticate, requireOrderAccess("id"), orderController.updateStatus);
router.patch("/:id/items/:detailId/kitchen-status", authenticate, requireOrderAccess("id"), orderController.updateKitchenItemStatus);

export default router;
