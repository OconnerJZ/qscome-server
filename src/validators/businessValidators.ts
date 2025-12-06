import { body } from "express-validator";

export const createBusinessValidation = [
    body("business_name")
        .notEmpty().withMessage("El nombre del negocio es requerido")
        .isLength({ min: 3 }).withMessage("El nombre debe tener al menos 3 caracteres"),
    body("phone")
        .optional()
        .isMobilePhone("es-MX").withMessage("Número de teléfono inválido"),
    body("email")
        .optional()
        .isEmail().withMessage("Email inválido")
];
