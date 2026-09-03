// src/serializers/order.serializer.ts
import { Orders } from "../entities/Orders";

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
  version: Number(order.version || 1),
  userId: order.userId,
  businessId: order.businessId,
  sharedSessionId: order.sharedSessionId,
  businessName: order.business?.businessName,
  customerName: order.customerName,
  customerPhone: order.customerPhone,
  customerEmail: order.user?.email,
  status: order.status,
  orderType: order.orderType,
  paymentMethod: order.paymentMethod || "cash",
  deliveryStatus: order.deliveryStatus,
  deliveryAddress: order.deliveryAddress,
  deliveryAddressId: order.deliveryAddressId,
  deliveryLocation:
    order.deliveryLatitude && order.deliveryLongitude
      ? {
          latitude: Number(order.deliveryLatitude),
          longitude: Number(order.deliveryLongitude),
          city: order.deliveryCity || "",
          postalCode: order.deliveryPostalCode || "",
        }
      : null,
  notes: order.orderNotes,
  total: Number.parseFloat(order.total || "0"),
  items: order.orderDetails?.map((d) => {
    const quantity = Number(d.quantity || 0);
    const subtotal = Number.parseFloat(d.subtotal || "0");
    const historicalPrice = d.unitPrice
      ? Number.parseFloat(d.unitPrice)
      : quantity > 0
        ? Number((subtotal / quantity).toFixed(2))
        : Number.parseFloat(d.menu?.price || "0");

    return {
      detailId: d.orderDetailId,
      id: d.menuId,
      name: d.itemName || d.menu?.itemName || "Producto",
      quantity: d.quantity,
      price: historicalPrice,
      subtotal,
      note: d.notes,
      kitchenStatus: d.kitchenStatus || "pending",
      participantLabel: d.sharedParticipantLabel || null,
      modifiers: (d.orderDetailOptions || []).map((modifier) => ({
        choiceId: modifier.choiceId,
        group: modifier.groupTitle,
        name: modifier.choiceName || modifier.option?.optionName || "Opción",
        priceExtra: Number.parseFloat(modifier.priceExtra || "0"),
        state: modifier.selectionState || "selected",
      })),
    };
  }) || [],
  kitchenProgress: (() => {
    const items = order.orderDetails || [];
    const totalItems = items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
    const readyItems = items.reduce((sum, item) => sum + (item.kitchenStatus === "ready" ? Number(item.quantity || 0) : 0), 0);
    return { ready: readyItems, total: totalItems };
  })(),
  statusHistory: order.orderStatusHistories?.map((h) => ({
    status: h.status,
    timestamp: h.createdAt,
    createdAt: h.createdAt,
    note: h.not,
    changedBy: h.changedBy,
  })) || [],
  createdAt: order.createdAt,
  updatedAt: order.updatedAt,
});
