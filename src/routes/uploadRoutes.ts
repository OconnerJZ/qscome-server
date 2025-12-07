import { Router, Request, Response } from "express";
import { UploadController } from "../controllers/UploadController";
import { authenticate } from "../middlewares/authMiddleware";

const router = Router();
const uploadController = new UploadController();

router.post("/image", 
    authenticate,
    (req: Request, res: Response) => uploadController.uploadImage(req, res)
);

export default router;