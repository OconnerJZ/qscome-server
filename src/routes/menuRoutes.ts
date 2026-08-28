import { Router } from "express";
import { MenuController } from "../controllers/MenuController";
import { authenticate } from "../middlewares/authMiddleware";
import {
  requireMenuBusinessPermission,
  requireBusinessPermission,
  requireBusinessPermissionFromBody,
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
  requireBusinessPermission("menu.manage", "businessId"),
  menuController.getManagedByBusiness,
);
router.get("/:id", menuController.getById);
router.get(
  "/:id/modifiers",
  authenticate,
  requireMenuBusinessPermission("menu.manage", "id"),
  menuController.getModifierGroups,
);

router.post(
  "/",
  authenticate,
  createMenuValidation,
  validateRequest,
  requireBusinessPermissionFromBody("menu.manage", "business_id"),
  menuController.create,
);

router.put(
  "/:id",
  authenticate,
  requireMenuBusinessPermission("menu.manage", "id"),
  updateMenuValidation,
  validateRequest,
  menuController.update,
);

router.put(
  "/:id/modifiers",
  authenticate,
  requireMenuBusinessPermission("menu.manage", "id"),
  menuController.replaceModifierGroups,
);

router.delete(
  "/:id",
  authenticate,
  requireMenuBusinessPermission("menu.manage", "id"),
  menuController.remove,
);

export default router;
