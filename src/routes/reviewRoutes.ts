import { Router } from "express";
import { ReviewController } from "../controllers/ReviewController";
import { authenticate } from "../middlewares/authMiddleware";
import { requireActiveBusinessParam } from "../middlewares/businessPlatform";
import { requireBusinessPermission } from "../middlewares/ownership";
import { validateDto } from "../middlewares/validateDto";
import { CreateVerifiedReviewDto, RespondToReviewDto } from "../dtos/review.dto";

const router = Router();
const controller = new ReviewController();

// Las reseñas y su resumen forman parte del escaparate público del negocio.
router.get(
  "/business/:businessId",
  requireActiveBusinessParam("businessId"),
  controller.listByBusiness,
);
router.get(
  "/business/:businessId/summary",
  requireActiveBusinessParam("businessId"),
  controller.summary,
);

// Reputation Insights es información privada del negocio. Requiere acceso
// business-scoped y además el servicio valida el entitlement comercial Level 1+.
router.get(
  "/business/:businessId/insights",
  authenticate,
  requireBusinessPermission("reviews.manage", "businessId"),
  requireActiveBusinessParam("businessId"),
  controller.reputationInsights,
);

// La elegibilidad y creación se resuelven contra la identidad autenticada y
// una orden realmente completada; el cliente nunca envía businessId ni userId.
router.get("/order/:orderId", authenticate, controller.getForOrder);
router.post("/", authenticate, validateDto(CreateVerifiedReviewDto), controller.create);

// Owners/co-owners/managers pueden responder en nombre del negocio. La
// autorización es business-scoped y no depende del plan comercial.
router.post(
  "/business/:businessId/:reviewId/response",
  authenticate,
  requireBusinessPermission("reviews.manage", "businessId"),
  requireActiveBusinessParam("businessId"),
  validateDto(RespondToReviewDto),
  controller.respond,
);

export default router;
