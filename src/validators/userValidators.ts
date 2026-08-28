import { body } from "express-validator";

export const registerValidation = [
    body("user_name")
        .notEmpty().withMessage("El nombre es requerido")
        .isLength({ min: 2 }).withMessage("El nombre debe tener al menos 2 caracteres"),
    body("email")
        .isEmail().withMessage("Email inválido")
        .normalizeEmail(),
    body("password")
        .isLength({ min: 6 }).withMessage("La contraseña debe tener al menos 6 caracteres")
        .matches(/\d/).withMessage("La contraseña debe contener al menos un número"),
    body("phone")
        .optional()
        .isMobilePhone("es-MX").withMessage("Número de teléfono inválido"),
    body("isBusiness")
        .optional()
        .isBoolean({ strict: true }).withMessage("isBusiness debe ser booleano"),
    body("role")
        .not().exists().withMessage("El rol no se puede asignar desde el registro público")
];

export const loginValidation = [
    body("email")
        .isEmail().withMessage("Email inválido")
        .normalizeEmail(),
    body("password")
        .notEmpty().withMessage("La contraseña es requerida")
];
