import { AppDataSource } from "../utils/db";
import { OrderDetails, KitchenItemStatus } from "../entities/OrderDetails";
import { Orders } from "../entities/Orders";
import { OrderStatusHistory } from "../entities/OrderStatusHistory";
import { HttpError } from "../utils/httpError";
import { formatOrder, getStatusLabel } from "../serializers/order.serializer";
import { emitKitchenItemUpdate, emitOrderStatusUpdate } from "../utils/socket";
import { OrderAuditService } from "./OrderAuditService";

interface KitchenActor { userId?: number; role?: string; }
const KITCHEN_STATUSES: KitchenItemStatus[] = ["pending", "preparing", "ready"];
const ACTIVE_ORDER_STATUSES = new Set(["accepted", "preparing", "ready"]);
const canMoveKitchenStatus = (current: KitchenItemStatus, next: KitchenItemStatus) => current === next || (current === "pending" && next === "preparing") || (current === "preparing" && next === "ready");

export class KitchenService {
  private readonly detailRepo = AppDataSource.getRepository(OrderDetails);
  private readonly orderRepo = AppDataSource.getRepository(Orders);
  private readonly auditService = new OrderAuditService();

  async assertAllItemsReady(orderId: number) {
    const details = await this.detailRepo.find({ where: { orderId } });
    if (!details.length) throw new HttpError(409, "La orden no tiene productos para preparar");
    const pending = details.filter((item) => item.kitchenStatus !== "ready");
    if (pending.length > 0) {
      const readyUnits = details.reduce((sum, item) => sum + (item.kitchenStatus === "ready" ? Number(item.quantity || 0) : 0), 0);
      const totalUnits = details.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
      throw new HttpError(409, `Aún faltan productos por terminar (${readyUnits}/${totalUnits} listos)`);
    }
  }

  async updateItemStatus(orderId: number, detailId: number, status: KitchenItemStatus, actor: KitchenActor = {}) {
    if (!KITCHEN_STATUSES.includes(status)) throw new HttpError(400, "Estado de cocina inválido");
    if (!["owner", "admin"].includes(actor.role || "")) throw new HttpError(403, "Sólo el negocio puede actualizar la preparación de productos");

    const detail = await this.detailRepo.findOne({ where: { orderDetailId: detailId }, relations: ["order"] });
    if (!detail || Number(detail.orderId) !== Number(orderId)) throw new HttpError(404, "Producto de la orden no encontrado");
    const order = detail.order;
    if (!order || !ACTIVE_ORDER_STATUSES.has(order.status || "")) throw new HttpError(409, "La orden debe estar aceptada antes de iniciar la preparación");

    const current = (detail.kitchenStatus || "pending") as KitchenItemStatus;
    if (!canMoveKitchenStatus(current, status)) throw new HttpError(409, `Transición de cocina inválida: ${current} → ${status}`);
    let orderStatusChanged = false;

    await AppDataSource.transaction(async (manager) => {
      const detailRepo = manager.getRepository(OrderDetails);
      const orderRepo = manager.getRepository(Orders);
      const historyRepo = manager.getRepository(OrderStatusHistory);
      if (current !== status) {
        detail.kitchenStatus = status;
        await detailRepo.save(detail);
      }
      if (status === "preparing" && order.status === "accepted") {
        order.status = "preparing";
        await orderRepo.save(order);
        await historyRepo.save(historyRepo.create({ orderId: order.orderId, status: "preparing", not: "Preparación iniciada", changedBy: actor.userId }));
        await this.auditService.record({
          orderId,
          businessId: order.businessId,
          actorUserId: actor.userId,
          actorRole: actor.role,
          action: "ORDER_STATUS_CHANGED",
          orderVersion: order.version,
          metadata: { from: "accepted", to: "preparing", trigger: "KITCHEN_ITEM_STATUS_CHANGED", detailId },
        }, manager);
        orderStatusChanged = true;
      }
      if (current !== status) {
        await this.auditService.record({
          orderId,
          businessId: order.businessId,
          actorUserId: actor.userId,
          actorRole: actor.role,
          action: "KITCHEN_ITEM_STATUS_CHANGED",
          entityType: "order_item",
          entityId: detailId,
          orderVersion: order.version,
          metadata: { itemName: detail.itemName, from: current, to: status, quantity: detail.quantity },
        }, manager);
      }
    });

    const fullOrder = await this.orderRepo.findOne({ where: { orderId }, relations: ["user", "business", "orderDetails", "orderDetails.menu", "orderDetails.orderDetailOptions", "orderStatusHistories"] });
    if (!fullOrder) throw new HttpError(404, "Orden no encontrada");
    const formatted = formatOrder(fullOrder);
    const updatedItem = formatted.items.find((item) => Number(item.detailId) === Number(detailId));

    const payload = { orderId, businessId: fullOrder.businessId, detailId, status, orderStatus: fullOrder.status, item: updatedItem, kitchenProgress: formatted.kitchenProgress, timestamp: new Date().toISOString(), changedBy: actor.userId };
    emitKitchenItemUpdate(Number(fullOrder.businessId), fullOrder.userId, payload);
    if (orderStatusChanged && fullOrder.userId) emitOrderStatusUpdate(fullOrder.userId, { orderId: fullOrder.orderId, status: fullOrder.status, statusLabel: getStatusLabel(fullOrder.status || "preparing"), timestamp: new Date().toISOString() });
    return { orderId, detailId, status, orderStatus: fullOrder.status, kitchenProgress: formatted.kitchenProgress, item: updatedItem };
  }
}
