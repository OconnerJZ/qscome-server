import { Router } from "express";
import { SharedOrderController } from "../controllers/SharedOrderController";
import { authenticate } from "../middlewares/authMiddleware";
import { createRateLimiter } from "../middlewares/rateLimit";
import { validateRequest } from "../middlewares/validationMiddleware";
import { addSharedItemValidation, addSharedItemsValidation, createSharedOrderValidation, deleteSharedItemValidation, joinSharedOrderCodeValidation, mutateSharedSessionValidation, rotateSharedOrderValidation, sharedSessionValidation, submitSharedOrderValidation, updateSharedItemValidation } from "../validators/sharedOrderValidators";

const router = Router();
const controller = new SharedOrderController();
const joinLimiter = createRateLimiter({ limit: 8, windowMs: 15 * 60 * 1000, message: "Demasiados intentos de acceso. Espera antes de probar otro código." });

router.use(authenticate);
router.post("/", createSharedOrderValidation, validateRequest, controller.create);
router.post("/join/code", joinLimiter, joinSharedOrderCodeValidation, validateRequest, controller.joinCode);
router.post("/join/:token", joinLimiter, controller.joinToken);
router.get("/:id/audit", sharedSessionValidation, validateRequest, controller.audit);
router.get("/:id", sharedSessionValidation, validateRequest, controller.get);
router.post("/:id/items", addSharedItemValidation, validateRequest, controller.addItem);
router.post("/:id/items/batch", addSharedItemsValidation, validateRequest, controller.addItems);
router.put("/:id/items/:itemId", updateSharedItemValidation, validateRequest, controller.updateItem);
router.delete("/:id/items/:itemId", deleteSharedItemValidation, validateRequest, controller.deleteItem);
router.post("/:id/rotate-invite", rotateSharedOrderValidation, validateRequest, controller.rotate);
router.post("/:id/leave", mutateSharedSessionValidation, validateRequest, controller.leave);
router.post("/:id/cancel", mutateSharedSessionValidation, validateRequest, controller.cancel);
router.post("/:id/submit", submitSharedOrderValidation, validateRequest, controller.submit);

export default router;
