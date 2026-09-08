import { Router } from "express";
import { MenuController } from "../controllers/MenuController";
import { authenticate } from "../middlewares/authMiddleware";
import {
  requireActiveBusinessBody,
  requireActiveBusinessParam,
  requireActiveMenuBusiness,
} from "../middlewares/businessPlatform";
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
router.get(
  "/business/:businessId",
  requireActiveBusinessParam("businessId"),
  menuController.getByBusiness,
);
router.get(
  "/business/:businessId/manage",
  authenticate,
  requireBusinessPermission("menu.manage", "businessId"),
  requireActiveBusinessParam("businessId"),
  menuController.getManagedByBusiness,
);
router.get("/:id", requireActiveMenuBusiness("id"), menuController.getById);
router.get(
  "/:id/modifiers",
  authenticate,
  requireMenuBusinessPermission("menu.manage", "id"),
  requireActiveMenuBusiness("id"),
  menuController.getModifierGroups,
);

router.post(
  "/",
  authenticate,
  createMenuValidation,
  validateRequest,
  requireBusinessPermissionFromBody("menu.manage", "business_id"),
  requireActiveBusinessBody("business_id"),
  menuController.create,
);

router.put(
  "/:id",
  authenticate,
  requireMenuBusinessPermission("menu.manage", "id"),
  requireActiveMenuBusiness("id"),
  updateMenuValidation,
  validateRequest,
  menuController.update,
);

router.put(
  "/:id/modifiers",
  authenticate,
  requireMenuBusinessPermission("menu.manage", "id"),
  requireActiveMenuBusiness("id"),
  menuController.replaceModifierGroups,
);

router.delete(
  "/:id",
  authenticate,
  requireMenuBusinessPermission("menu.manage", "id"),
  requireActiveMenuBusiness("id"),
  menuController.remove,
);

export default router;
