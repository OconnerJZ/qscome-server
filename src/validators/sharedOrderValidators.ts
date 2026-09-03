import { body, param } from "express-validator";

const expectedVersion = body("expectedVersion").isInt({ min: 1 }).withMessage("La versión esperada es requerida");
const sessionId = param("id").isUUID().withMessage("Sesión inválida");
const itemFields = [
  body("quantity").isInt({ min: 1, max: 50 }).withMessage("Cantidad inválida"),
  body("note").optional({ nullable: true }).isString().isLength({ max: 500 }),
  body("modifiers").optional().isArray(),
];

export const createSharedOrderValidation = [
  body("title").optional({ nullable: true }).isString().isLength({ max: 100 }),
  body("codeLength").optional().isIn([4, 6, "4", "6"]).withMessage("El código debe tener 4 o 6 dígitos"),
];
export const joinSharedOrderCodeValidation = [body("code").isString().matches(/^\s*\d{4}(?:\d{2})?\s*$/).withMessage("Código inválido")];
export const sharedSessionValidation = [sessionId];
export const addSharedItemValidation = [sessionId, body("businessId").isInt({ min: 1 }), body("menuId").isInt({ min: 1 }), ...itemFields, expectedVersion];
export const addSharedItemsValidation = [
  sessionId,
  body("items").isArray({ min: 1, max: 100 }),
  body("items.*.businessId").isInt({ min: 1 }),
  body("items.*.menuId").isInt({ min: 1 }),
  body("items.*.quantity").isInt({ min: 1, max: 50 }),
  body("items.*.note").optional({ nullable: true }).isString().isLength({ max: 500 }),
  body("items.*.modifiers").optional().isArray(),
  expectedVersion,
];
export const updateSharedItemValidation = [sessionId, param("itemId").isInt({ min: 1 }), ...itemFields, expectedVersion];
export const deleteSharedItemValidation = [sessionId, param("itemId").isInt({ min: 1 }), expectedVersion];
export const mutateSharedSessionValidation = [sessionId, expectedVersion];
export const rotateSharedOrderValidation = [sessionId, expectedVersion, body("codeLength").isIn([4, 6, "4", "6"])];
export const submitSharedOrderValidation = [
  sessionId,
  expectedVersion,
  body("checkout").isArray({ min: 1 }).withMessage("Configura cada negocio"),
  body("checkout.*.businessId").isInt({ min: 1 }),
  body("checkout.*.orderType").isIn(["pickup", "delivery"]),
  body("checkout.*.paymentMethod").isIn(["cash", "card", "wallet", "transfer"]),
  body("checkout.*.customerPhone").optional({ nullable: true }).isString().isLength({ max: 30 }),
  body("checkout.*.deliveryAddress").if(body("checkout.*.orderType").equals("delivery")).notEmpty().withMessage("Falta la dirección de entrega"),
];
