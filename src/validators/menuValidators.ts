import { body } from "express-validator";

export const createMenuValidation = [
    body("item_name")
        .notEmpty().withMessage("El nombre del producto es requerido"),
    body("price")
        .isFloat({ min: 0 }).withMessage("El precio debe ser un número positivo"),
    body("business_id")
        .notEmpty().withMessage("El ID del negocio es requerido")
        .isInt().withMessage("ID de negocio inválido")
];
