import { Router, Request, Response } from "express";
import { UploadController } from "../controllers/UploadController";
import { authenticate } from "../middlewares/authMiddleware";
import { upload } from "../middlewares/upload";

const router = Router();
const uploadController = new UploadController();

router.post("/image", 
    authenticate,
    upload.single('file'),
    (req: Request, res: Response) => uploadController.uploadImage(req, res)
);

export default router;