import { Router, Request, Response } from "express";
import { AuthController } from "../controllers/AuthController";
import { loginValidation, registerValidation } from "../validators/userValidators";
import { validateRequest } from "../middlewares/validationMiddleware";
import { authenticate } from "../middlewares/authMiddleware";

const router = Router();
const authController = new AuthController();

router.post("/register", 
    registerValidation, 
    validateRequest,
    (req: Request, res: Response) => authController.register(req, res)
);

router.post("/login", 
    loginValidation, 
    validateRequest,
    (req: Request, res: Response) => authController.login(req, res)
);

router.post("/google", 
    (req: Request, res: Response) => authController.googleAuth(req, res)
);

router.post("/facebook", 
    (req: Request, res: Response) => authController.facebookAuth(req, res)
);

router.get("/me", 
    authenticate,
    (req: Request, res: Response) => authController.getMe(req, res)
);

export default router;