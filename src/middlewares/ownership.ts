// src/middlewares/ownership.ts
//
// Verificación de PROPIEDAD (no sólo de rol). `authorize()` sólo comprueba el
// rol, no que el recurso pertenezca al solicitante, lo que dejaba pasar IDOR.
// La propiedad de un negocio se resuelve por la tabla `business_owners`.

import { Response, NextFunction } from "express";
import { AuthRequest } from "./authMiddleware";
import { AppDataSource } from "../utils/db";
import { BusinessOwners } from "../entities/BusinessOwners";
import { Orders } from "../entities/Orders";
import { Menus } from "../entities/Menus";
import { Payments } from "../entities/Payments";
import { BusinessPermission, getBusinessMembership } from "../security/businessAccess";
import { hasDirectPaymentAccess } from "../security/paymentAccess";
import { getActiveSharedOrderParticipant } from "../security/sharedOrderAccess";

export const isAdmin = (user: any): boolean => user?.role === "admin";

const parseId = (value: any): number | null => {
  const n = Number.parseInt(value, 10);
  return Number.isNaN(n) ? null : n;
};

/** ¿El usuario pertenece (owner/manager/staff) al negocio? Reutilizable en socket. */
export const ownsBusiness = async (
  userId?: number,
  businessId?: number,
): Promise<boolean> => {
  if (!userId || !businessId) return false;
  const link = await AppDataSource.getRepository(BusinessOwners).findOne({
    where: { userId, businessId },
  });
  return !!link;
};

const authorizeBusinessPermission = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
  businessId: number | null,
  permission: BusinessPermission,
) => {
  if (!businessId) return res.status(400).json({ success: false, message: "businessId inválido" });
  if (isAdmin(req.user)) {
    req.businessAccess = { businessId, role: "admin", permissions: [permission] };
    return next();
  }
  const access = await getBusinessMembership(Number(req.user?.userId), businessId);
  if (!access || !access.permissions.includes(permission)) {
    return res.status(403).json({ success: false, message: "No tienes permiso para realizar esta acción" });
  }
  req.businessAccess = { businessId, role: access.role, permissions: access.permissions };
  return next();
};

export const requireBusinessPermission = (permission: BusinessPermission, param = "businessId") =>
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { return await authorizeBusinessPermission(req, res, next, parseId(req.params[param]), permission); }
    catch (error: any) { return res.status(500).json({ success: false, message: error.message }); }
  };

export const requireBusinessPermissionFromBody = (permission: BusinessPermission, field = "business_id") =>
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { return await authorizeBusinessPermission(req, res, next, parseId(req.body?.[field]), permission); }
    catch (error: any) { return res.status(500).json({ success: false, message: error.message }); }
  };

export const requireOrderBusinessPermission = (permission: BusinessPermission, param = "id") =>
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const orderId = parseId(req.params[param]);
      if (!orderId) return res.status(400).json({ success: false, message: "orderId inválido" });
      const order = await AppDataSource.getRepository(Orders).findOne({ where: { orderId } });
      if (!order) return res.status(404).json({ success: false, message: "Orden no encontrada" });
      return await authorizeBusinessPermission(req, res, next, Number(order.businessId), permission);
    } catch (error: any) { return res.status(500).json({ success: false, message: error.message }); }
  };

export const requireOrderStatusAccess = (param = "id") =>
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const orderId = parseId(req.params[param]);
      if (!orderId) return res.status(400).json({ success: false, message: "orderId inválido" });
      const order = await AppDataSource.getRepository(Orders).findOne({ where: { orderId } });
      if (!order) return res.status(404).json({ success: false, message: "Orden no encontrada" });
      if (order.userId === req.user?.userId && req.body?.status === "cancelled") return next();
      return await authorizeBusinessPermission(req, res, next, Number(order.businessId), "orders.accept");
    } catch (error: any) { return res.status(500).json({ success: false, message: error.message }); }
  };

export const requireOrderCustomerOwnership = (param = "id") =>
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    const orderId = parseId(req.params[param]);
    if (!orderId) return res.status(400).json({ success: false, message: "orderId inválido" });
    const order = await AppDataSource.getRepository(Orders).findOne({ where: { orderId } });
    if (!order) return res.status(404).json({ success: false, message: "Orden no encontrada" });
    if (isAdmin(req.user) || order.userId === req.user?.userId) return next();
    return res.status(403).json({ success: false, message: "Sólo el cliente puede editar su orden" });
  };

export const requireMenuBusinessPermission = (permission: BusinessPermission, param = "id") =>
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const menuId = parseId(req.params[param]);
      if (!menuId) return res.status(400).json({ success: false, message: "menuId inválido" });
      const menu = await AppDataSource.getRepository(Menus).findOne({ where: { menuId } });
      if (!menu) return res.status(404).json({ success: false, message: "Producto no encontrado" });
      return await authorizeBusinessPermission(req, res, next, Number(menu.businessId), permission);
    } catch (error: any) { return res.status(500).json({ success: false, message: error.message }); }
  };

/** Dueño del negocio en req.params[param] (admin pasa). */
export const requireBusinessOwnership =
  (param = "businessId") =>
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (isAdmin(req.user)) return next();

      const businessId = parseId(req.params[param]);
      if (!businessId) {
        return res
          .status(400)
          .json({ success: false, message: "businessId inválido" });
      }
      if (await ownsBusiness(req.user?.userId, businessId)) return next();

      return res
        .status(403)
        .json({ success: false, message: "No tienes acceso a este negocio" });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  };

/** Dueño del negocio indicado en el BODY (para creates que reciben business_id). */
export const requireBusinessOwnershipFromBody =
  (field = "business_id") =>
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (isAdmin(req.user)) return next();

      const businessId = parseId(req.body?.[field]);
      if (!businessId) {
        return res
          .status(400)
          .json({ success: false, message: `${field} inválido` });
      }
      if (await ownsBusiness(req.user?.userId, businessId)) return next();

      return res
        .status(403)
        .json({ success: false, message: "No tienes acceso a este negocio" });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  };

/** Dueño del negocio al que pertenece la orden en req.params[param]. */
export const requireOrderBusinessOwnership =
  (param = "id") =>
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (isAdmin(req.user)) return next();

      const orderId = parseId(req.params[param]);
      if (!orderId) {
        return res
          .status(400)
          .json({ success: false, message: "orderId inválido" });
      }

      const order = await AppDataSource.getRepository(Orders).findOne({
        where: { orderId },
      });
      if (!order) {
        return res
          .status(404)
          .json({ success: false, message: "Orden no encontrada" });
      }
      if (order.businessId && (await ownsBusiness(req.user?.userId, order.businessId))) {
        return next();
      }

      return res
        .status(403)
        .json({ success: false, message: "No tienes acceso a esta orden" });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  };

/** Dueño del negocio al que pertenece el producto de menú en req.params[param]. */
export const requireMenuOwnership =
  (param = "id") =>
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (isAdmin(req.user)) return next();

      const menuId = parseId(req.params[param]);
      if (!menuId) {
        return res
          .status(400)
          .json({ success: false, message: "menuId inválido" });
      }

      const menu = await AppDataSource.getRepository(Menus).findOne({
        where: { menuId },
      });
      if (!menu) {
        return res
          .status(404)
          .json({ success: false, message: "Producto no encontrado" });
      }
      if (menu.businessId && (await ownsBusiness(req.user?.userId, menu.businessId))) {
        return next();
      }

      return res
        .status(403)
        .json({ success: false, message: "No tienes acceso a este producto" });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  };

/** Acceso a una orden: cliente dueño, dueño del negocio, o admin. */
export const requireOrderAccess =
  (param = "id") =>
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (isAdmin(req.user)) return next();

      const orderId = parseId(req.params[param]);
      if (!orderId) {
        return res
          .status(400)
          .json({ success: false, message: "orderId inválido" });
      }

      const order = await AppDataSource.getRepository(Orders).findOne({
        where: { orderId },
      });
      if (!order) {
        return res
          .status(404)
          .json({ success: false, message: "Orden no encontrada" });
      }

      const uid = req.user?.userId;
      if (order.userId === uid) return next();
      if (uid && order.sharedSessionId && await getActiveSharedOrderParticipant(order.sharedSessionId, uid)) {
        return next();
      }
      if (order.businessId && (await ownsBusiness(uid, order.businessId))) {
        return next();
      }

      return res
        .status(403)
        .json({ success: false, message: "No tienes acceso a esta orden" });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  };

/** Acceso a pago: cliente de la orden, admin o miembro con payments.review. */
export const requirePaymentAccess =
  (param = "id") =>
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const paymentId = parseId(req.params[param]);
      if (!paymentId) return res.status(400).json({ success: false, message: "Pago inválido" });
      const payment = await AppDataSource.getRepository(Payments).findOne({
        where: { paymentId },
        relations: ["order"],
      });
      if (!payment) return res.status(404).json({ success: false, message: "Pago no encontrado" });
      if (hasDirectPaymentAccess({
        requesterUserId: req.user?.userId,
        globalRole: req.user?.role,
        paymentUserId: payment.userId,
        orderUserId: payment.order?.userId,
      })) return next();
      const businessId = Number(payment.order?.businessId);
      const access = businessId ? await getBusinessMembership(Number(req.user?.userId), businessId) : null;
      if (access?.permissions.includes("payments.review")) {
        req.businessAccess = { businessId, role: access.role, permissions: access.permissions };
        return next();
      }
      return res.status(403).json({ success: false, message: "No tienes acceso a este pago" });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  };

/** Datos de transferencia: cliente de la orden o equipo con payments.review. */
export const requireOrderPaymentAccess = (param = "id") =>
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const orderId = parseId(req.params[param]);
      if (!orderId) return res.status(400).json({ success: false, message: "Orden inválida" });
      const order = await AppDataSource.getRepository(Orders).findOne({ where: { orderId } });
      if (!order) return res.status(404).json({ success: false, message: "Orden no encontrada" });
      if (isAdmin(req.user) || order.userId === req.user?.userId) return next();
      return await authorizeBusinessPermission(req, res, next, Number(order.businessId), "payments.review");
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  };

/** El usuario sólo accede a su propio recurso por param (o admin). */
export const requireSelfOrAdmin =
  (param = "userId") =>
  (req: AuthRequest, res: Response, next: NextFunction) => {
    if (isAdmin(req.user)) return next();

    const targetId = parseId(req.params[param]);
    if (targetId && req.user?.userId === targetId) return next();

    return res
      .status(403)
      .json({ success: false, message: "No tienes acceso a estos datos" });
  };
