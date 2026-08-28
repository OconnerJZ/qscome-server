import { body } from "express-validator";

export const reviewTransferPaymentValidation = [
  body("status").isIn(["reviewed", "requires_clarification"]).withMessage("Estado de revisión inválido"),
  body("expectedVersion").isInt({ min: 1 }).withMessage("Versión de comprobante requerida"),
  body("message").optional().isString().trim().isLength({ max: 1000 }).withMessage("El mensaje no puede exceder 1000 caracteres"),
];
