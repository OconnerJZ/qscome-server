import { Router } from "express";
import { OrderController } from "../controllers/OrderController";
import { authenticate } from "../middlewares/authMiddleware";
import { authorize } from "../middlewares/roleMiddleware";
import {
  requireBusinessOwnership,
  requireOrderBusinessOwnership,
  requireOrderAccess,
  requireSelfOrAdmin,
} from "../middlewares/ownership";
import { createOrderValidation } from "../validators/orderValidators";
import { validateRequest } from "../middlewares/validationMiddleware";

const router = Router();
const orderController = new OrderController();

// Los handlers son métodos arrow (this ya ligado): se pasan directos y Express
// inyecta (req, res, next). Los errores caen en el errorHandler global.

router.get("/", authenticate, authorize("admin"), orderController.getAll);

router.get(
  "/:id",
  authenticate,
  requireOrderAccess("id"), // dueño de la orden, dueño del negocio o admin
  orderController.getById,
);

router.get(
  "/user/:userId",
  authenticate,
  requireSelfOrAdmin("userId"), // sólo tus propias órdenes (o admin)
  orderController.getByUser,
);

router.get(
  "/business/:businessId",
  authenticate,
  authorize("admin", "owner"),
  requireBusinessOwnership("businessId"), // debe ser dueño de ESE negocio
  orderController.getByBusiness,
);

router.post(
  "/",
  authenticate,
  createOrderValidation,
  validateRequest,
  orderController.create,
);

router.patch(
  "/:id/status",
  authenticate,
  authorize("admin", "owner"),
  requireOrderBusinessOwnership("id"), // dueño del negocio de esa orden
  orderController.updateStatus,
);

export default router;