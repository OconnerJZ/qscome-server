import { Router } from "express";
import { register, login } from "../controllers/authController";
import { body } from "express-validator";
import { validateRequest } from "../middlewares/validationMiddleware";

const router = Router();

router.post(
    "/register",
    [
        body("user_name").notEmpty().withMessage("El nombre es requerido"),
        body("email").isEmail().withMessage("Email inválido"),
        body("password").isLength({ min: 6 }).withMessage("La contraseña debe tener al menos 6 caracteres"),
        validateRequest
    ],
    register
);

router.post(
    "/login",
    [
        body("email").isEmail().withMessage("Email inválido"),
        body("password").notEmpty().withMessage("La contraseña es requerida"),
        validateRequest
    ],
    login
);

export default router;
