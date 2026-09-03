import { Router, Request, Response } from "express";
import { AuthController } from "../controllers/AuthController";
import { loginValidation, registerValidation } from "../validators/userValidators";
import { validateRequest } from "../middlewares/validationMiddleware";
import { authenticate } from "../middlewares/authMiddleware";
import { createRateLimiter } from "../middlewares/rateLimit";
import { createHash } from "node:crypto";

const router = Router();
const authController = new AuthController();
const authIpKey = (req: Request) => `ip:${req.ip || "unknown"}`;
const authAccountKey = (req: Request) => {
    const email = String(req.body?.email || "").trim().toLowerCase();
    return email
        ? `account:${createHash("sha256").update(email).digest("hex")}`
        : authIpKey(req);
};
const registerLimiter = createRateLimiter({ limit: 8, windowMs: 60 * 60 * 1000, keyGenerator: authIpKey, message: "Demasiados registros desde esta conexión. Intenta más tarde." });
const loginIpLimiter = createRateLimiter({ limit: 30, windowMs: 15 * 60 * 1000, keyGenerator: authIpKey });
const loginAccountLimiter = createRateLimiter({ limit: 8, windowMs: 15 * 60 * 1000, keyGenerator: authAccountKey, message: "Demasiados intentos para esta cuenta. Espera antes de volver a intentarlo." });
const oauthLimiter = createRateLimiter({ limit: 20, windowMs: 15 * 60 * 1000, keyGenerator: authIpKey });

router.post("/register", 
    registerLimiter,
    registerValidation, 
    validateRequest,
    (req: Request, res: Response) => authController.register(req, res)
);

router.post("/login", 
    loginIpLimiter,
    loginAccountLimiter,
    loginValidation, 
    validateRequest,
    (req: Request, res: Response) => authController.login(req, res)
);

router.post("/google", 
    oauthLimiter,
    (req: Request, res: Response) => authController.googleAuth(req, res)
);

router.post("/facebook", 
    oauthLimiter,
    (req: Request, res: Response) => authController.facebookAuth(req, res)
);

router.get("/me", 
    authenticate,
    (req: Request, res: Response) => authController.getMe(req, res)
);

export default router;
