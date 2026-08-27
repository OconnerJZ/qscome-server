import { AppDataSource } from "../utils/db";
import { OrderDetails, KitchenItemStatus } from "../entities/OrderDetails";
import { Orders } from "../entities/Orders";
import { HttpError } from "../utils/httpError";
import { formatOrder } from "../serializers/order.serializer";
import { emitKitchenItemUpdate } from "../utils/socket";

interface KitchenActor {
  userId?: number;
  role?: string;
}

const KITCHEN_STATUSES: KitchenItemStatus[] = ["pending", "preparing", "ready"];
const ACTIVE_ORDER_STATUSES = new Set(["accepted", "preparing", "ready"]);

const canMoveKitchenStatus = (current: KitchenItemStatus, next: KitchenItemStatus) => {
  if (current === next) return true;
  if (current === "pending") return next === "preparing";
  if (current === "preparing") return next === "ready";
  return false;
};

export class KitchenService {
  private readonly detailRepo = AppDataSource.getRepository(OrderDetails);
  private readonly orderRepo = AppDataSource.getRepository(Orders);

  async updateItemStatus(
    orderId: number,
    detailId: number,
    status: KitchenItemStatus,
    actor: KitchenActor = {},
  ) {
    if (!KITCHEN_STATUSES.includes(status)) {
      throw new HttpError(400, "Estado de cocina inválido");
    }

    if (!["owner", "admin"].includes(actor.role || "")) {
      throw new HttpError(403, "Sólo el negocio puede actualizar la preparación de productos");
    }

    const detail = await this.detailRepo.findOne({
      where: { orderDetailId: detailId },
      relations: ["order"],
    });

    if (!detail || Number(detail.orderId) !== Number(orderId)) {
      throw new HttpError(404, "Producto de la orden no encontrado");
    }

    const order = detail.order;
    if (!order || !ACTIVE_ORDER_STATUSES.has(order.status || "")) {
      throw new HttpError(409, "La orden debe estar aceptada antes de iniciar la preparación");
    }

    const current = (detail.kitchenStatus || "pending") as KitchenItemStatus;
    if (!canMoveKitchenStatus(current, status)) {
      throw new HttpError(409, `Transición de cocina inválida: ${current} → ${status}`);
    }

    if (current !== status) {
      detail.kitchenStatus = status;
      await this.detailRepo.save(detail);
    }

    const fullOrder = await this.orderRepo.findOne({
      where: { orderId },
      relations: [
        "user",
        "business",
        "orderDetails",
        "orderDetails.menu",
        "orderDetails.orderDetailOptions",
        "orderStatusHistories",
      ],
    });

    if (!fullOrder) throw new HttpError(404, "Orden no encontrada");
    const formatted = formatOrder(fullOrder);
    const updatedItem = formatted.items.find((item) => Number(item.detailId) === Number(detailId));

    const payload = {
      orderId,
      businessId: fullOrder.businessId,
      detailId,
      status,
      item: updatedItem,
      kitchenProgress: formatted.kitchenProgress,
      timestamp: new Date().toISOString(),
      changedBy: actor.userId,
    };

    emitKitchenItemUpdate(Number(fullOrder.businessId), fullOrder.userId, payload);

    return {
      orderId,
      detailId,
      status,
      kitchenProgress: formatted.kitchenProgress,
      item: updatedItem,
    };
  }
}
