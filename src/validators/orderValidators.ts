import { body } from "express-validator";

export const createOrderValidation = [
  body("businessId").notEmpty().withMessage("El ID del negocio es requerido"),
  body("orderType")
    .optional()
    .isIn(["pickup", "delivery"])
    .withMessage("El tipo de orden debe ser pickup o delivery"),
  body("deliveryAddress")
    .if(body("orderType").equals("delivery"))
    .notEmpty()
    .withMessage("La dirección de entrega es requerida para delivery"),
  body("items")
    .isArray({ min: 1 })
    .withMessage("Debe haber al menos un producto en la orden"),
  body("items.*.id").notEmpty().withMessage("El ID del producto es requerido"),
  body("items.*.quantity")
    .isInt({ min: 1 })
    .withMessage("La cantidad debe ser al menos 1"),
];
