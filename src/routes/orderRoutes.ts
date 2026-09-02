import { Router } from "express";
import { OrderController } from "../controllers/OrderController";
import { authenticate } from "../middlewares/authMiddleware";
import { authorize } from "../middlewares/roleMiddleware";
import { requireBusinessPermission, requireOrderAccess, requireOrderBusinessPermission, requireOrderCustomerOwnership, requireOrderPaymentAccess, requireOrderStatusAccess, requireSelfOrAdmin } from "../middlewares/ownership";
import { createOrderValidation } from "../validators/orderValidators";
import { validateRequest } from "../middlewares/validationMiddleware";
import { TransferPaymentController } from "../controllers/TransferPaymentController";
import { uploadEvidenceSecure, handleMulterError } from "../middlewares/uploadImproved";
import { reviewTransferPaymentValidation } from "../validators/transferPaymentValidators";
import { createRateLimiter } from "../middlewares/rateLimit";
import { validateUploadedImage } from "../middlewares/imageValidation";

const router = Router();
const orderController = new OrderController();
const transferPaymentController = new TransferPaymentController();
const evidenceUploadLimiter = createRateLimiter({ limit: 8, windowMs: 60 * 60 * 1000, message: "Alcanzaste el límite de comprobantes por hora. Espera antes de enviar otro." });

router.get("/", authenticate, authorize("admin"), orderController.getAll);
router.get("/user/:userId", authenticate, requireSelfOrAdmin("userId"), orderController.getByUser);
router.get("/business/:businessId", authenticate, requireBusinessPermission("orders.read", "businessId"), orderController.getByBusiness);
router.get("/:id/audit", authenticate, requireOrderAccess("id"), orderController.getAudit);
router.get("/:id", authenticate, requireOrderAccess("id"), orderController.getById);
router.get("/:id/transfer-payment", authenticate, requireOrderPaymentAccess("id"), transferPaymentController.get);
router.get("/:id/transfer-payment/evidence/:evidenceId/file", authenticate, requireOrderPaymentAccess("id"), transferPaymentController.file);

router.post("/", authenticate, createOrderValidation, validateRequest, orderController.create);
router.put("/:id/items", authenticate, requireOrderCustomerOwnership("id"), orderController.updatePendingOrder);
router.patch("/:id/status", authenticate, requireOrderStatusAccess("id"), orderController.updateStatus);
router.patch("/:id/items/:detailId/kitchen-status", authenticate, requireOrderBusinessPermission("kitchen.update", "id"), orderController.updateKitchenItemStatus);
router.post("/:id/transfer-payment/evidence", authenticate, requireOrderCustomerOwnership("id"), evidenceUploadLimiter, uploadEvidenceSecure.single("file"), handleMulterError, validateUploadedImage, transferPaymentController.submitEvidence);
router.patch("/:id/transfer-payment/review", authenticate, requireOrderBusinessPermission("payments.review", "id"), reviewTransferPaymentValidation, validateRequest, transferPaymentController.review);

export default router;
