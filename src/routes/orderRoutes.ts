import { Router } from "express";
import { OrderController } from "../controllers/OrderController";
import { authenticate } from "../middlewares/authMiddleware";
import { authorize } from "../middlewares/roleMiddleware";
import {
  requireBusinessOwnership,
  requireOrderAccess,
  requireSelfOrAdmin,
} from "../middlewares/ownership";
import { createOrderValidation } from "../validators/orderValidators";
import { validateRequest } from "../middlewares/validationMiddleware";

const router = Router();
const orderController = new OrderController();

router.get("/", authenticate, authorize("admin"), orderController.getAll);

router.get(
  "/:id",
  authenticate,
  requireOrderAccess("id"),
  orderController.getById,
);

router.get(
  "/user/:userId",
  authenticate,
  requireSelfOrAdmin("userId"),
  orderController.getByUser,
);

router.get(
  "/business/:businessId",
  authenticate,
  authorize("admin", "owner"),
  requireBusinessOwnership("businessId"),
  orderController.getByBusiness,
);

router.post(
  "/",
  authenticate,
  createOrderValidation,
  validateRequest,
  orderController.create,
);

// El middleware resuelve si el actor es cliente de la orden, miembro del negocio o admin.
// Las transiciones permitidas se validan finalmente en OrderService.
router.patch(
  "/:id/status",
  authenticate,
  requireOrderAccess("id"),
  orderController.updateStatus,
);

export default router;
