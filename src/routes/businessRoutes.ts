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
router.get("/:id", businessController.getById);
router.get("/owner/:ownerId", businessController.getByOwner);
router.get("/:id/menu", businessController.getMenu);

router.post(
  "/",
  authenticate,
  authorize("admin", "owner", "customer"),
  validateDto(CreateBusinessDto),
  businessController.create,
);

router.put(
  "/:id",
  authenticate,
  authorize("admin", "owner"),
  requireBusinessOwnership("id"), // debe ser dueño de ESE negocio
  businessController.update,
);

export default router;