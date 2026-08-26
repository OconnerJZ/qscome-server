import { Router } from "express";
import { BusinessController } from "../controllers/BusinessController";
import { authenticate } from "../middlewares/authMiddleware";
import { authorize } from "../middlewares/roleMiddleware";
import { requireBusinessOwnership } from "../middlewares/ownership";
import { validateDto } from "../middlewares/validateDto";
import { CreateBusinessDto } from "../dtos/business.dto";

const router = Router();
const businessController = new BusinessController();

router.get("/", businessController.getAll);
router.get("/owner/:ownerId", businessController.getByOwner);
router.get("/:id/menu", businessController.getMenu);
router.get("/:id", businessController.getById);

router.post(
  "/",
  authenticate,
  authorize("admin", "owner", "customer"),
  validateDto(CreateBusinessDto),
  businessController.create,
);

const ownerOnly = [
  authenticate,
  authorize("admin", "owner"),
  requireBusinessOwnership("id"),
] as const;

router.put("/:id", ...ownerOnly, businessController.update);
router.put("/:id/location", ...ownerOnly, businessController.updateLocation);
router.put("/:id/schedules", ...ownerOnly, businessController.updateSchedules);
router.put(
  "/:id/delivery-settings",
  ...ownerOnly,
  businessController.updateDeliverySettings,
);
router.put(
  "/:id/payment-methods",
  ...ownerOnly,
  businessController.updatePaymentMethods,
);
router.put("/:id/food-types", ...ownerOnly, businessController.updateFoodTypes);
router.post("/:id/photos", ...ownerOnly, businessController.addPhoto);
router.delete(
  "/:id/photos/:photoId",
  ...ownerOnly,
  businessController.deletePhoto,
);

export default router;
