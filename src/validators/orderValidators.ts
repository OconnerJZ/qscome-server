import { body } from "express-validator";

export const createOrderValidation = [
  body("userId").notEmpty().withMessage("El ID del usuario es requerido"),
  body("businessId").notEmpty().withMessage("El ID del negocio es requerido"),
  body("items")
    .isArray({ min: 1 })
    .withMessage("Debe haber al menos un producto en la orden"),
  body("items.*.id").notEmpty().withMessage("El ID del producto es requerido"),
  body("items.*.quantity")
    .isInt({ min: 1 })
    .withMessage("La cantidad debe ser al menos 1"),
];
