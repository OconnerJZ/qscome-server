import { Router } from "express";
import { MenuController } from "../controllers/MenuController";
import { authenticate } from "../middlewares/authMiddleware";
import { authorize } from "../middlewares/roleMiddleware";
import {
  requireMenuOwnership,
  requireBusinessOwnershipFromBody,
} from "../middlewares/ownership";
import { createMenuValidation } from "../validators/menuValidators";
import { validateRequest } from "../middlewares/validationMiddleware";

const router = Router();
const menuController = new MenuController();

router.get("/", menuController.getAll);
router.get("/:id", menuController.getById);
router.get("/business/:businessId", menuController.getByBusiness);

router.post(
  "/",
  authenticate,
  authorize("admin", "owner"),
  createMenuValidation,
  validateRequest,
  requireBusinessOwnershipFromBody("business_id"), // dueño del negocio del body
  menuController.create,
);

router.put(
  "/:id",
  authenticate,
  authorize("admin", "owner"),
  requireMenuOwnership("id"), // dueño del negocio de ESE producto
  menuController.update,
);

router.delete(
  "/:id",
  authenticate,
  authorize("admin", "owner"),
  requireMenuOwnership("id"),
  menuController.remove,
);

export default router;