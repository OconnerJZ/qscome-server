import { AppDataSource } from "../utils/db";
import { Orders } from "../entities/Orders";
import { OrderDetails } from "../entities/OrderDetails";
import { OrderDetailOptions, OrderModifierState } from "../entities/OrderDetailOptions";
import { Menus } from "../entities/Menus";
import { OrderStatusHistory } from "../entities/OrderStatusHistory";
import { HttpError } from "../utils/httpError";
import { formatOrder } from "../serializers/order.serializer";
import { emitOrderUpdated } from "../utils/socket";
import { OrderAuditService } from "./OrderAuditService";

export interface PendingOrderModifierInput { choiceId: number; state?: OrderModifierState; }
export interface PendingOrderItemInput { id: number; quantity: number; note?: string | null; modifiers?: PendingOrderModifierInput[]; }
interface PendingOrderActor { userId?: number; role?: string; }
interface ModifierSnapshot { choiceId: number; groupTitle: string; choiceName: string; priceExtra: number; selectionState: OrderModifierState; }
interface PricedItem extends PendingOrderItemInput { itemName: string; unitPrice: number; subtotal: number; modifierSnapshots: ModifierSnapshot[]; }

const buildModifierSnapshots = (menu: Menus, requested: PendingOrderModifierInput[] = []) => {
  const groups = menu.menuOptionGroups || [];
  if (!groups.length) {
    if (requested.length) throw new HttpError(400, `${menu.itemName || "El producto"} no admite personalización`);
    return { snapshots: [] as ModifierSnapshot[], extraPerUnit: 0 };
  }
  const requestedByChoice = new Map<number, OrderModifierState>();
  for (const modifier of requested) {
    const choiceId = Number(modifier.choiceId);
    if (!Number.isInteger(choiceId) || choiceId < 1) throw new HttpError(400, "Opción de producto inválida");
    requestedByChoice.set(choiceId, modifier.state === "removed" ? "removed" : "selected");
  }
  const knownChoiceIds = new Set(groups.flatMap((group) => (group.menuOptionChoices || []).map((choice) => choice.choiceId)));
  for (const choiceId of requestedByChoice.keys()) if (!knownChoiceIds.has(choiceId)) throw new HttpError(400, `La opción ${choiceId} no pertenece a ${menu.itemName || "este producto"}`);

  const snapshots: ModifierSnapshot[] = [];
  let extraPerUnit = 0;
  for (const group of groups) {
    const choices = group.menuOptionChoices || [];
    const effectiveSelected = choices.filter((choice) => {
      const override = requestedByChoice.get(choice.choiceId);
      if (override === "selected") return true;
      if (override === "removed") return false;
      return Boolean(choice.isDefault);
    });
    const min = Number(group.minSelect || 0);
    const configuredMax = Number(group.maxSelect || 0);
    const max = configuredMax > 0 ? configuredMax : choices.length;
    if (effectiveSelected.length < min) throw new HttpError(400, `${group.title}: selecciona al menos ${min} opción${min === 1 ? "" : "es"}`);
    if (effectiveSelected.length > max) throw new HttpError(400, `${group.title}: puedes seleccionar máximo ${max} opción${max === 1 ? "" : "es"}`);
    for (const choice of effectiveSelected) {
      const priceExtra = Number.parseFloat(choice.priceExtra || "0");
      extraPerUnit = Number((extraPerUnit + priceExtra).toFixed(2));
      snapshots.push({ choiceId: choice.choiceId, groupTitle: group.title, choiceName: choice.name, priceExtra, selectionState: "selected" });
    }
    for (const choice of choices) if (choice.isDefault && requestedByChoice.get(choice.choiceId) === "removed") snapshots.push({ choiceId: choice.choiceId, groupTitle: group.title, choiceName: choice.name, priceExtra: 0, selectionState: "removed" });
  }
  return { snapshots, extraPerUnit };
};

export class PendingOrderService {
  private readonly auditService = new OrderAuditService();

  async replaceItems(orderId: number, items: PendingOrderItemInput[], expectedVersion: number, actor: PendingOrderActor = {}) {
    if (!actor.userId) throw new HttpError(401, "Usuario no autenticado");
    if (!Array.isArray(items) || items.length === 0) throw new HttpError(400, "La orden debe conservar al menos un producto");
    if (!Number.isInteger(expectedVersion) || expectedVersion < 1) throw new HttpError(400, "Versión de orden requerida");

    const order = await AppDataSource.getRepository(Orders).findOne({ where: { orderId }, relations: ["orderDetails", "orderDetails.orderDetailOptions"] });
    if (!order) throw new HttpError(404, "Orden no encontrada");
    if (Number(order.userId) !== Number(actor.userId)) throw new HttpError(403, "Sólo el cliente de la orden puede modificarla");
    if (order.status !== "pending") throw new HttpError(409, "La orden ya fue aceptada y está bloqueada para edición");
    if (Number(order.version) !== expectedVersion) throw new HttpError(409, "La orden cambió desde que comenzaste a editarla. Actualiza y vuelve a intentarlo");

    const before = {
      total: Number(order.total || 0),
      items: (order.orderDetails || []).map((d) => ({ detailId: d.orderDetailId, menuId: d.menuId, quantity: Number(d.quantity || 0), subtotal: Number(d.subtotal || 0) })),
    };

    await AppDataSource.transaction(async (manager) => {
      const orderRepo = manager.getRepository(Orders);
      const detailRepo = manager.getRepository(OrderDetails);
      const optionRepo = manager.getRepository(OrderDetailOptions);
      const menuRepo = manager.getRepository(Menus);
      const historyRepo = manager.getRepository(OrderStatusHistory);
      const pricedItems: PricedItem[] = [];
      let total = 0;

      for (const item of items) {
        const quantity = Number(item.quantity);
        if (!Number.isInteger(quantity) || quantity < 1) throw new HttpError(400, "Cantidad de producto inválida");
        const menu = await menuRepo.findOne({ where: { menuId: Number(item.id) }, relations: ["menuOptionGroups", "menuOptionGroups.menuOptionChoices"] });
        if (!menu || Number(menu.businessId) !== Number(order.businessId)) throw new HttpError(400, `El producto ${item.id} no pertenece a este negocio`);
        if (!menu.isAvailable || menu.isArchived) throw new HttpError(409, `${menu.itemName || "El producto"} ya no está disponible`);
        const basePrice = Number.parseFloat(menu.price || "0");
        const { snapshots, extraPerUnit } = buildModifierSnapshots(menu, item.modifiers || []);
        const unitPrice = Number((basePrice + extraPerUnit).toFixed(2));
        const subtotal = Number((unitPrice * quantity).toFixed(2));
        total = Number((total + subtotal).toFixed(2));
        pricedItems.push({ ...item, quantity, itemName: menu.itemName || `Producto ${menu.menuId}`, unitPrice, subtotal, modifierSnapshots: snapshots });
      }

      const lockedOrder = await orderRepo.findOne({ where: { orderId } });
      if (!lockedOrder || lockedOrder.status !== "pending") throw new HttpError(409, "La orden acaba de ser aceptada y ya no puede modificarse");
      if (Number(lockedOrder.version) !== expectedVersion) throw new HttpError(409, "Otra sesión modificó esta orden. Actualiza antes de guardar nuevos cambios");

      const existingDetails = await detailRepo.find({ where: { orderId } });
      const detailIds = existingDetails.map((detail) => detail.orderDetailId);
      if (detailIds.length) {
        await optionRepo.createQueryBuilder().delete().where("order_detail_id IN (:...ids)", { ids: detailIds }).execute();
        await detailRepo.delete({ orderId });
      }

      for (const item of pricedItems) {
        const detail = await detailRepo.save(detailRepo.create({ orderId, menuId: item.id, itemName: item.itemName, unitPrice: item.unitPrice.toFixed(2), quantity: item.quantity, subtotal: item.subtotal.toFixed(2), notes: item.note || null, kitchenStatus: "pending" }));
        if (item.modifierSnapshots.length) await optionRepo.save(item.modifierSnapshots.map((modifier) => optionRepo.create({ orderDetailId: detail.orderDetailId, optionId: null, choiceId: modifier.choiceId, groupTitle: modifier.groupTitle, choiceName: modifier.choiceName, priceExtra: modifier.priceExtra.toFixed(2), selectionState: modifier.selectionState })));
      }

      lockedOrder.total = total.toFixed(2);
      await orderRepo.save(lockedOrder);
      await historyRepo.save(historyRepo.create({ orderId, status: "pending", not: `Orden modificada por el cliente (v${expectedVersion} → v${expectedVersion + 1})`, changedBy: actor.userId }));
      await this.auditService.record({
        orderId,
        businessId: lockedOrder.businessId,
        actorUserId: actor.userId,
        actorRole: actor.role || "customer",
        action: "ORDER_ITEMS_UPDATED",
        orderVersion: lockedOrder.version,
        metadata: {
          before,
          after: { total, items: pricedItems.map((item) => ({ menuId: item.id, name: item.itemName, quantity: item.quantity, subtotal: item.subtotal, modifiers: item.modifierSnapshots })) },
          previousVersion: expectedVersion,
        },
      }, manager);
    });

    const refreshed = await AppDataSource.getRepository(Orders).findOne({ where: { orderId }, relations: ["user", "business", "orderDetails", "orderDetails.menu", "orderDetails.orderDetailOptions", "orderStatusHistories"] });
    if (!refreshed) throw new HttpError(404, "Orden no encontrada");
    const formatted = formatOrder(refreshed);

    emitOrderUpdated(Number(refreshed.businessId), refreshed.userId, formatted);
    return formatted;
  }
}
