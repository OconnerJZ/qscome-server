import { Router, Request, Response } from "express";
import { UploadController } from "../controllers/UploadController";
import { authenticate } from "../middlewares/authMiddleware";
import { authorize } from "../middlewares/roleMiddleware";
import { handleMulterError, uploadSecure } from "../middlewares/uploadImproved";
import { createRateLimiter } from "../middlewares/rateLimit";
import { validateUploadedImage } from "../middlewares/imageValidation";

const router = Router();
const uploadController = new UploadController();
const imageUploadLimiter = createRateLimiter({
  limit: 30,
  windowMs: 60 * 60 * 1000,
  message: "Alcanzaste el límite de imágenes por hora. Espera antes de subir otra.",
});

router.post("/image", 
  authenticate,
  authorize("admin", "owner","customer"),
  imageUploadLimiter,
  uploadSecure.single('file'),
  handleMulterError,
  validateUploadedImage,
  (req: Request, res: Response) => uploadController.uploadImage(req, res)
);

export default router;
