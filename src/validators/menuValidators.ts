import { body } from "express-validator";

export const createMenuValidation = [
  body("item_name")
    .trim()
    .notEmpty()
    .withMessage("El nombre del producto es requerido"),
  body("price")
    .isFloat({ gt: 0 })
    .withMessage("El precio debe ser mayor a 0"),
  body("business_id")
    .notEmpty()
    .withMessage("El ID del negocio es requerido")
    .isInt({ min: 1 })
    .withMessage("ID de negocio inválido"),
  body("is_available")
    .optional()
    .isBoolean()
    .withMessage("is_available debe ser boolean"),
];

export const updateMenuValidation = [
  body("item_name")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("El nombre del producto no puede estar vacío"),
  body("price")
    .optional()
    .isFloat({ gt: 0 })
    .withMessage("El precio debe ser mayor a 0"),
  body("is_available")
    .optional()
    .isBoolean()
    .withMessage("is_available debe ser boolean"),
];
