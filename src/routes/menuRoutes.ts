import { Router } from "express";
import { MenuController } from "../controllers/MenuController";
import { authenticate } from "../middlewares/authMiddleware";
import { authorize } from "../middlewares/roleMiddleware";
import {
  requireMenuOwnership,
  requireBusinessOwnership,
  requireBusinessOwnershipFromBody,
} from "../middlewares/ownership";
import {
  createMenuValidation,
  updateMenuValidation,
} from "../validators/menuValidators";
import { validateRequest } from "../middlewares/validationMiddleware";

const router = Router();
const menuController = new MenuController();

router.get("/", menuController.getAll);
router.get("/business/:businessId", menuController.getByBusiness);
router.get(
  "/business/:businessId/manage",
  authenticate,
  authorize("admin", "owner"),
  requireBusinessOwnership("businessId"),
  menuController.getManagedByBusiness,
);
router.get("/:id", menuController.getById);
router.get(
  "/:id/modifiers",
  authenticate,
  authorize("admin", "owner"),
  requireMenuOwnership("id"),
  menuController.getModifierGroups,
);

router.post(
  "/",
  authenticate,
  authorize("admin", "owner"),
  createMenuValidation,
  validateRequest,
  requireBusinessOwnershipFromBody("business_id"),
  menuController.create,
);

router.put(
  "/:id",
  authenticate,
  authorize("admin", "owner"),
  requireMenuOwnership("id"),
  updateMenuValidation,
  validateRequest,
  menuController.update,
);

router.put(
  "/:id/modifiers",
  authenticate,
  authorize("admin", "owner"),
  requireMenuOwnership("id"),
  menuController.replaceModifierGroups,
);

router.delete(
  "/:id",
  authenticate,
  authorize("admin", "owner"),
  requireMenuOwnership("id"),
  menuController.remove,
);

export default router;
