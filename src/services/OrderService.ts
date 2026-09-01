// src/services/OrderService.ts
import { AppDataSource } from "../utils/db";
import { Orders } from "../entities/Orders";
import { OrderDetails } from "../entities/OrderDetails";
import { OrderDetailOptions, OrderModifierState } from "../entities/OrderDetailOptions";
import { OrderStatusHistory } from "../entities/OrderStatusHistory";
import { Menus } from "../entities/Menus";
import { UserAddresses } from "../entities/UserAddresses";
import { BusinessPaymentMethods } from "../entities/BusinessPaymentMethods";
import { assertUsableTransferConfig, normalizeTransferBankConfig } from "../security/transferPayment";
import { HttpError } from "../utils/httpError";
import { formatOrder, getStatusLabel, isValidStatus } from "../serializers/order.serializer";
import { emitNewOrder, emitOrderStatusUpdate } from "../utils/socket";
import { OrderAuditService } from "./OrderAuditService";
import { EntityManager, In } from "typeorm";
import { SharedOrderParticipant } from "../entities/SharedOrderParticipant";
import { getSharedOrderParticipantUserIds } from "../security/sharedOrderAccess";

export interface CreateOrderModifier { choiceId: number; state?: OrderModifierState; }
export interface CreateOrderItem { id: number; quantity: number; note?: string | null; price?: number; modifiers?: CreateOrderModifier[]; participantLabel?: string | null; }
export interface CreateOrderInput {
  userId: number; businessId: number; items: CreateOrderItem[]; total?: number; orderType?: "pickup" | "delivery";
  paymentMethod?: "cash" | "card" | "wallet" | "transfer";
  customerName?: string; customerPhone?: string; deliveryAddress?: string; deliveryAddressId?: number | null;
  deliveryLocation?: { latitude?: number; longitude?: number; city?: string; postalCode?: string; state?: string; } | null;
  notes?: string;
  sharedSessionId?: string | null;
}
interface OrderActor { userId?: number; role?: string; }
interface ModifierSnapshot { choiceId: number; groupTitle: string; choiceName: string; priceExtra: number; selectionState: OrderModifierState; }
interface PricedOrderItem extends CreateOrderItem { itemName: string; basePrice: number; unitPrice: number; subtotal: number; modifierSnapshots: ModifierSnapshot[]; }

const DETAIL_RELATIONS = ["business", "orderDetails", "orderDetails.menu", "orderDetails.orderDetailOptions", "orderStatusHistories"];
const canMoveToStatus = (order: Orders, nextStatus: string) => {
  const current = order.status;
  if (!current) return false;
  if (nextStatus === "cancelled") return !["completed", "cancelled"].includes(current);
  const expected = current === "pending" ? "accepted" : current === "accepted" ? "preparing" : current === "preparing" ? "ready" : current === "ready" ? (order.orderType === "pickup" ? "completed" : "in_delivery") : current === "in_delivery" ? "completed" : null;
  return expected === nextStatus;
};

export const buildModifierSnapshots = (menu: Menus, requested: CreateOrderModifier[] = []) => {
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

export class OrderService {
  private readonly orderRepo = AppDataSource.getRepository(Orders);
  private readonly auditService = new OrderAuditService();

  async list() {
    const orders = await this.orderRepo.find({ relations: ["user", ...DETAIL_RELATIONS], order: { createdAt: "DESC" }, take: 100 });
    return orders.map(formatOrder);
  }
  async getById(orderId: number) {
    const order = await this.orderRepo.findOne({ where: { orderId }, relations: ["user", ...DETAIL_RELATIONS] });
    if (!order) throw new HttpError(404, "Orden no encontrada");
    return formatOrder(order);
  }
  async getByUser(userId: number) {
    const memberships = await AppDataSource.getRepository(SharedOrderParticipant).find({ where: { userId, status: "active" } });
    const sharedSessionIds = [...new Set(memberships.map((membership) => membership.sessionId))];
    const where = sharedSessionIds.length ? [{ userId }, { sharedSessionId: In(sharedSessionIds) }] : { userId };
    const orders = await this.orderRepo.find({ where, relations: DETAIL_RELATIONS, order: { createdAt: "DESC" } });
    return orders.map((order) => ({
      ...formatOrder(order),
      viewerCanManage: Number(order.userId) === Number(userId),
    }));
  }
  async getByBusiness(businessId: number) { return (await this.orderRepo.find({ where: { businessId }, relations: ["user", "orderDetails", "orderDetails.menu", "orderDetails.orderDetailOptions", "orderStatusHistories"], order: { createdAt: "DESC" } })).map(formatOrder); }

  async create(input: CreateOrderInput) {
    return (await this.createBatch([input]))[0];
  }

  async createBatch(
    inputs: CreateOrderInput[],
    finalize?: (manager: EntityManager, created: Array<{ input: CreateOrderInput; orderId: number }>) => Promise<void>,
    beforePersist?: (manager: EntityManager) => Promise<void>,
  ) {
    const created = await AppDataSource.transaction(async (manager) => {
      const rows: Array<{ input: CreateOrderInput; orderId: number }> = [];
      await beforePersist?.(manager);
      for (const input of inputs) rows.push({ input, orderId: await this.persist(input, manager) });
      await finalize?.(manager, rows);
      return rows;
    });
    const formatted = [];
    for (const row of created) {
      const fullOrder = await this.orderRepo.findOne({ where: { orderId: row.orderId }, relations: DETAIL_RELATIONS });
      const data = formatOrder(fullOrder!);
      emitNewOrder(Number(row.input.businessId), data);
      formatted.push(data);
    }
    return formatted;
  }

  private async persist(input: CreateOrderInput, manager: EntityManager) {
    const { userId, businessId, items, orderType = "pickup", paymentMethod = "cash", customerName, customerPhone, deliveryAddress, deliveryAddressId, deliveryLocation, notes } = input;
    const normalizedBusinessId = Number(businessId);
    if (!userId) throw new HttpError(401, "Usuario no autenticado");
    if (!Number.isInteger(normalizedBusinessId) || normalizedBusinessId < 1) throw new HttpError(400, "Negocio inválido");
    if (!items?.length) throw new HttpError(400, "La orden debe contener al menos un item");
    if (orderType === "delivery" && !deliveryAddress?.trim()) throw new HttpError(400, "La dirección de entrega es requerida para delivery");

      const orderRepo = manager.getRepository(Orders), detailRepo = manager.getRepository(OrderDetails), detailOptionRepo = manager.getRepository(OrderDetailOptions), historyRepo = manager.getRepository(OrderStatusHistory), menuRepo = manager.getRepository(Menus);
      const configuredMethod = await manager.getRepository(BusinessPaymentMethods).findOne({ where: { businessId: normalizedBusinessId, method: paymentMethod } });
      if (!configuredMethod?.isActive) throw new HttpError(400, "El método de pago seleccionado no está disponible");
      let transferBankSnapshotJson: string | null = null;
      if (paymentMethod === "transfer") {
        let rawConfig: unknown = {};
        try { rawConfig = configuredMethod.configJson ? JSON.parse(configuredMethod.configJson) : {}; } catch { rawConfig = {}; }
        const normalizedConfig = normalizeTransferBankConfig(rawConfig);
        assertUsableTransferConfig(normalizedConfig);
        transferBankSnapshotJson = JSON.stringify(normalizedConfig);
      }
      const normalizedAddressId = orderType === "delivery" && deliveryAddressId ? Number(deliveryAddressId) : null;
      if (normalizedAddressId) {
        const address = await manager.getRepository(UserAddresses).findOne({
          where: { addressId: normalizedAddressId, userId },
        });
        if (!address) throw new HttpError(403, "La dirección guardada no pertenece al cliente");
      }
      const pricedItems: PricedOrderItem[] = [];
      let calculatedTotal = 0;
      for (const item of items) {
        const quantity = Number(item.quantity);
        if (!Number.isInteger(quantity) || quantity < 1) throw new HttpError(400, "Cantidad de producto inválida");
        const menu = await menuRepo.findOne({ where: { menuId: Number(item.id) }, relations: ["menuOptionGroups", "menuOptionGroups.menuOptionChoices"] });
        if (!menu || Number(menu.businessId) !== normalizedBusinessId) throw new HttpError(400, `El producto ${item.id} no pertenece a este negocio`);
        if (!menu.isAvailable || menu.isArchived) throw new HttpError(409, `${menu.itemName || "El producto"} ya no está disponible`);
        const basePrice = Number.parseFloat(menu.price || "0");
        const { snapshots, extraPerUnit } = buildModifierSnapshots(menu, item.modifiers || []);
        const unitPrice = Number((basePrice + extraPerUnit).toFixed(2)), subtotal = Number((unitPrice * quantity).toFixed(2));
        calculatedTotal = Number((calculatedTotal + subtotal).toFixed(2));
        pricedItems.push({ ...item, quantity, itemName: menu.itemName || `Producto ${menu.menuId}`, basePrice, unitPrice, subtotal, modifierSnapshots: snapshots });
      }
      const hasCoords = orderType === "delivery" && deliveryLocation?.latitude != null && deliveryLocation?.longitude != null;
      const order = orderRepo.create({ userId, businessId: normalizedBusinessId, orderType, paymentMethod, transferBankSnapshotJson, sharedSessionId: input.sharedSessionId || null, customerName, customerPhone, deliveryAddress: orderType === "delivery" ? deliveryAddress : null, deliveryAddressId: normalizedAddressId, deliveryLatitude: hasCoords ? Number(deliveryLocation!.latitude).toFixed(8) : null, deliveryLongitude: hasCoords ? Number(deliveryLocation!.longitude).toFixed(8) : null, deliveryCity: orderType === "delivery" ? deliveryLocation?.city || null : null, deliveryPostalCode: orderType === "delivery" ? deliveryLocation?.postalCode || null : null, orderNotes: notes, total: calculatedTotal.toFixed(2), status: "pending", deliveryStatus: "unassigned", orderDate: new Date() });
      await orderRepo.save(order);
      for (const item of pricedItems) {
        const detail = await detailRepo.save(detailRepo.create({ orderId: order.orderId, menuId: item.id, itemName: item.itemName, unitPrice: item.unitPrice.toFixed(2), quantity: item.quantity, subtotal: item.subtotal.toFixed(2), notes: item.note || null, sharedParticipantLabel: item.participantLabel || null, kitchenStatus: "pending" }));
        if (item.modifierSnapshots.length) await detailOptionRepo.save(item.modifierSnapshots.map((modifier) => detailOptionRepo.create({ orderDetailId: detail.orderDetailId, optionId: null, choiceId: modifier.choiceId, groupTitle: modifier.groupTitle, choiceName: modifier.choiceName, priceExtra: modifier.priceExtra.toFixed(2), selectionState: modifier.selectionState })));
      }
      await historyRepo.save(historyRepo.create({ orderId: order.orderId, status: "pending", not: "Orden creada", changedBy: userId }));
      await this.auditService.record({
        orderId: order.orderId,
        businessId: normalizedBusinessId,
        actorUserId: userId,
        actorRole: "customer",
        action: "ORDER_CREATED",
        orderVersion: order.version,
        metadata: {
          orderType,
          total: calculatedTotal,
          itemCount: pricedItems.reduce((sum, item) => sum + item.quantity, 0),
          sharedSessionId: input.sharedSessionId || null,
          items: pricedItems.map((item) => ({ menuId: item.id, name: item.itemName, quantity: item.quantity, subtotal: item.subtotal, participantLabel: item.participantLabel || null, modifiers: item.modifierSnapshots })),
        },
      }, manager);
      return order.orderId;
  }

  async updateStatus(orderId: number, status: string, note: string | undefined, actor: OrderActor = {}) {
    if (!isValidStatus(status)) throw new HttpError(400, "Estado inválido");
    const order = await AppDataSource.transaction(async (manager) => {
      const orderRepo = manager.getRepository(Orders);
      const historyRepo = manager.getRepository(OrderStatusHistory);
      const currentOrder = await orderRepo.findOne({ where: { orderId } });
      if (!currentOrder) throw new HttpError(404, "Orden no encontrada");
      const previousStatus = currentOrder.status;
      const isPrivilegedRole = ["admin", "owner", "primary_owner", "co_owner", "manager", "cashier"].includes(actor.role || "");
      const isCustomerActor = actor.userId === currentOrder.userId && !isPrivilegedRole;
      if (isCustomerActor) {
        if (status !== "cancelled") throw new HttpError(403, "El cliente sólo puede cancelar su orden");
        if (currentOrder.status !== "pending") throw new HttpError(409, "La orden ya fue aceptada y no puede cancelarse desde la aplicación");
      }
      if (!canMoveToStatus(currentOrder, status)) throw new HttpError(409, `Transición inválida: ${currentOrder.status} → ${status}`);
      currentOrder.status = status;
      await orderRepo.save(currentOrder);
      await historyRepo.save(historyRepo.create({ orderId: currentOrder.orderId, status, not: note || `Estado cambiado a ${status}`, changedBy: actor.userId }));
      await this.auditService.record({ orderId, businessId: currentOrder.businessId, actorUserId: actor.userId, actorRole: actor.role, action: status === "cancelled" ? "ORDER_CANCELLED" : "ORDER_STATUS_CHANGED", orderVersion: currentOrder.version, metadata: { from: previousStatus, to: status, note: note || null } }, manager);
      return currentOrder;
    });
    const participantIds = order.sharedSessionId ? await getSharedOrderParticipantUserIds(order.sharedSessionId) : [];
    if (order.userId) emitOrderStatusUpdate([order.userId, ...participantIds], { orderId: order.orderId, status: order.status, statusLabel: getStatusLabel(order.status!), timestamp: new Date().toISOString() });
    return { orderId: order.orderId, status: order.status };
  }
}
