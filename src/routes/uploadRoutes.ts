import { Router, Request, Response } from "express";
import { UploadController } from "../controllers/UploadController";
import { authenticate } from "../middlewares/authMiddleware";
import { authorize } from "../middlewares/roleMiddleware";
import { handleMulterError, uploadSecure } from "../middlewares/uploadImproved";

const router = Router();
const uploadController = new UploadController();

router.post("/image", 
  authenticate,
  authorize("admin", "owner","customer"),
  uploadSecure.single('file'),
  handleMulterError,
  (req: Request, res: Response) => uploadController.uploadImage(req, res)
);

export default router;