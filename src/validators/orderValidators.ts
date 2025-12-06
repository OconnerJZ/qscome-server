import { body } from "express-validator";

export const createOrderValidation = [
    body("user_id")
        .notEmpty().withMessage("El ID del usuario es requerido"),
    body("business_id")
        .notEmpty().withMessage("El ID del negocio es requerido"),
    body("orderDetails")
        .isArray({ min: 1 }).withMessage("Debe haber al menos un producto en la orden"),
    body("orderDetails.*.menu_id")
        .notEmpty().withMessage("El ID del producto es requerido"),
    body("orderDetails.*.quantity")
        .isInt({ min: 1 }).withMessage("La cantidad debe ser al menos 1")
];