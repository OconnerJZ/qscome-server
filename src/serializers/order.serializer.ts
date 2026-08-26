// src/serializers/order.serializer.ts
// Presentación de órdenes en un solo lugar (antes vivía inline en el controller
// y se repetía). Convierte la entidad Orders a la forma que consume el front.

import { Orders } from "../entities/Orders";

// Estados válidos = enum real de Orders.status en la entidad.
// OJO: "ready_for_pickup" NO está en el enum de la entidad; si se necesita,
// primero hay que migrar el enum de la columna. Por eso no se acepta aquí
// (antes estaba en validStatuses y habría reventado al guardar).
export const ORDER_STATUSES = [
  "pending",
  "accepted",
  "preparing",
  "ready",
  "in_delivery",
  "completed",
  "cancelled",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendiente",
  accepted: "Aceptada",
  preparing: "Preparando",
  ready: "Lista",
  in_delivery: "En Camino",
  completed: "Completada",
  cancelled: "Cancelada",
};

export const getStatusLabel = (status: string): string =>
  STATUS_LABELS[status] || status;

export const isValidStatus = (status: string): status is OrderStatus =>
  (ORDER_STATUSES as readonly string[]).includes(status);

export const formatOrder = (order: Orders) => ({
  id: order.orderId,
  userId: order.userId,
  businessId: order.businessId,
  businessName: order.business?.businessName,
  customerName: order.customerName,
  customerPhone: order.customerPhone,
  customerEmail: order.user?.email,
  status: order.status,
  orderType: order.orderType,
  deliveryStatus: order.deliveryStatus,
  deliveryAddress: order.deliveryAddress,
  notes: order.orderNotes,
  total: Number.parseFloat(order.total || "0"),
  items:
    order.orderDetails?.map((d) => ({
      id: d.menuId,
      name: d.menu?.itemName,
      quantity: d.quantity,
      price: Number.parseFloat(d.menu?.price || "0"),
      subtotal: Number.parseFloat(d.subtotal || "0"),
      note: d.notes,
    })) || [],
  statusHistory:
    order.orderStatusHistories?.map((h) => ({
      status: h.status,
      timestamp: h.createdAt,
      note: h.not,
      changedBy: h.changedBy,
    })) || [],
  createdAt: order.createdAt,
  updatedAt: order.updatedAt,
});