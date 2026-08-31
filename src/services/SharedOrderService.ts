import { randomUUID } from "node:crypto";
import { EntityManager } from "typeorm";
import { AppDataSource } from "../utils/db";
import { SharedOrderSession } from "../entities/SharedOrderSession";
import { SharedOrderParticipant } from "../entities/SharedOrderParticipant";
import { SharedOrderItem } from "../entities/SharedOrderItem";
import { SharedOrderSuborder } from "../entities/SharedOrderSuborder";
import { Menus } from "../entities/Menus";
import { HttpError } from "../utils/httpError";
import { buildModifierSnapshots, CreateOrderInput, CreateOrderModifier, OrderService } from "./OrderService";
import { createSharedOrderExpiry, createSharedOrderSecrets, hashSharedOrderCode, hashSharedOrderToken, SharedOrderCodeLength, sharedParticipantLabel } from "../security/sharedOrder";
import { emitSharedOrderUpdated } from "../utils/socket";
import { SharedOrderAuditService } from "./SharedOrderAuditService";

interface SharedItemInput { businessId: number; menuId: number; quantity: number; note?: string; modifiers?: CreateOrderModifier[]; expectedVersion: number; }
interface SharedItemUpdateInput { quantity: number; note?: string; modifiers?: CreateOrderModifier[]; expectedVersion: number; }
interface SharedItemsInput { items: Omit<SharedItemInput, "expectedVersion">[]; expectedVersion: number; }
interface SuborderCheckoutInput extends Omit<CreateOrderInput, "userId" | "items" | "businessId" | "sharedSessionId"> { businessId: number; }
const SESSION_RELATIONS = ["participants", "items", "items.participant", "items.menu", "items.menu.business", "items.menu.business.businessPaymentMethods", "suborders", "suborders.order"];

export class SharedOrderService {
  private readonly sessions = AppDataSource.getRepository(SharedOrderSession);
  private readonly orderService = new OrderService();
  private readonly auditService = new SharedOrderAuditService();

  async create(hostUserId: number, title: string | undefined, codeLength: SharedOrderCodeLength) {
    const secrets = createSharedOrderSecrets(codeLength);
    const session = await AppDataSource.transaction(async (manager) => {
      await this.assertNoOtherActiveSession(manager, hostUserId);
      const sessionRepo = manager.getRepository(SharedOrderSession);
      const participantRepo = manager.getRepository(SharedOrderParticipant);
      const created = await sessionRepo.save(sessionRepo.create({ sessionId: randomUUID(), hostUserId, title: String(title || "").trim().slice(0, 100) || null, status: "open", codeHash: hashSharedOrderCode(secrets.code), linkTokenHash: hashSharedOrderToken(secrets.token), codeLength, expiresAt: createSharedOrderExpiry(), lockedAt: null, submittedAt: null }));
      await participantRepo.save(participantRepo.create({ sessionId: created.sessionId, userId: hostUserId, role: "host", packagingNumber: 1, status: "active" }));
      await this.auditService.record(created.sessionId, hostUserId, "SHARED_SESSION_CREATED", created.version, { codeLength }, manager);
      return created;
    });
    return { session: await this.get(session.sessionId, hostUserId), secrets };
  }

  async joinByCode(code: string, userId: number) {
    const session = await this.sessions.findOne({ where: { codeHash: hashSharedOrderCode(code) } });
    if (!session) throw new HttpError(404, "Orden compartida no encontrada");
    return this.join(session.sessionId, userId);
  }

  async joinByToken(token: string, userId: number) {
    const session = await this.sessions.findOne({ where: { linkTokenHash: hashSharedOrderToken(token) } });
    if (!session) throw new HttpError(404, "Enlace de orden compartida inválido");
    return this.join(session.sessionId, userId);
  }

  private async join(sessionId: string, userId: number) {
    await AppDataSource.transaction(async (manager) => {
      const sessionRepo = manager.getRepository(SharedOrderSession);
      const participantRepo = manager.getRepository(SharedOrderParticipant);
      await this.assertNoOtherActiveSession(manager, userId, sessionId);
      const session = await sessionRepo.findOne({ where: { sessionId }, lock: { mode: "pessimistic_write" } });
      this.assertJoinable(session);
      const existing = await participantRepo.findOne({ where: { sessionId, userId } });
      if (existing) {
        existing.status = "active";
        await participantRepo.save(existing);
      } else {
        const participants = await participantRepo.find({ where: { sessionId } });
        if (participants.length >= 50) throw new HttpError(409, "La orden compartida alcanzó el límite de participantes");
        const packagingNumber = Math.max(0, ...participants.map((participant) => participant.packagingNumber)) + 1;
        await participantRepo.save(participantRepo.create({ sessionId, userId, role: "member", packagingNumber, status: "active" }));
      }
      session!.updatedAt = new Date();
      await sessionRepo.save(session!);
      await this.auditService.record(sessionId, userId, "SHARED_PARTICIPANT_JOINED", session!.version, null, manager);
    });
    emitSharedOrderUpdated(sessionId, { sessionId, reason: "participant_joined" });
    return this.get(sessionId, userId);
  }

  async get(sessionId: string, userId: number) {
    const session = await this.sessions.findOne({ where: { sessionId }, relations: SESSION_RELATIONS });
    if (!session) throw new HttpError(404, "Orden compartida no encontrada");
    const self = session.participants.find((participant) => participant.userId === userId && participant.status === "active");
    if (!self) throw new HttpError(403, "No perteneces a esta orden compartida");
    return this.format(session, self);
  }

  async getActive(userId: number) {
    const memberships = await AppDataSource.getRepository(SharedOrderParticipant).find({
      where: { userId, status: "active" },
      relations: ["session"],
      order: { joinedAt: "DESC" },
    });
    const membership = memberships.find((entry) =>
      entry.session?.status === "open" && entry.session.expiresAt.getTime() > Date.now(),
    );
    return membership ? this.get(membership.sessionId, userId) : null;
  }

  async getAudit(sessionId: string, userId: number) {
    const session = await this.sessions.findOne({ where: { sessionId } });
    this.assertHost(session, userId);
    return this.auditService.list(sessionId);
  }

  async addItem(sessionId: string, userId: number, input: SharedItemInput) {
    await AppDataSource.transaction(async (manager) => {
      const { session, participant } = await this.lockEditableMembership(manager, sessionId, userId, input.expectedVersion);
      const menu = await this.loadValidMenu(manager, input.menuId, input.businessId, input.quantity, input.modifiers || []);
      const { extraPerUnit } = buildModifierSnapshots(menu, input.modifiers || []);
      const unitPrice = Number((Number(menu.price || 0) + extraPerUnit).toFixed(2));
      await manager.getRepository(SharedOrderItem).save(manager.getRepository(SharedOrderItem).create({ sessionId, participantId: participant.participantId, userId, businessId: input.businessId, menuId: input.menuId, quantity: input.quantity, note: String(input.note || "").trim().slice(0, 500) || null, modifiersJson: JSON.stringify(input.modifiers || []), unitPriceSnapshot: unitPrice.toFixed(2) }));
      await this.bumpSession(manager, session);
      await this.auditService.record(sessionId, userId, "SHARED_ITEM_ADDED", session.version, { businessId: input.businessId, menuId: input.menuId, quantity: input.quantity }, manager);
    });
    emitSharedOrderUpdated(sessionId, { sessionId, reason: "item_added" });
    return this.get(sessionId, userId);
  }

  async addItems(sessionId: string, userId: number, input: SharedItemsInput) {
    if (!input.items?.length || input.items.length > 100) throw new HttpError(400, "El carrito debe contener entre 1 y 100 productos");
    await AppDataSource.transaction(async (manager) => {
      const { session, participant } = await this.lockEditableMembership(manager, sessionId, userId, input.expectedVersion);
      const repo = manager.getRepository(SharedOrderItem);
      const created: SharedOrderItem[] = [];
      for (const item of input.items) {
        const menu = await this.loadValidMenu(manager, item.menuId, item.businessId, item.quantity, item.modifiers || []);
        const { extraPerUnit } = buildModifierSnapshots(menu, item.modifiers || []);
        created.push(repo.create({ sessionId, participantId: participant.participantId, userId, businessId: item.businessId, menuId: item.menuId, quantity: item.quantity, note: String(item.note || "").trim().slice(0, 500) || null, modifiersJson: JSON.stringify(item.modifiers || []), unitPriceSnapshot: Number((Number(menu.price || 0) + extraPerUnit).toFixed(2)).toFixed(2) }));
      }
      await repo.save(created);
      await this.bumpSession(manager, session);
      await this.auditService.record(sessionId, userId, "SHARED_CART_IMPORTED", session.version, { itemCount: created.length, businessIds: [...new Set(created.map((item) => item.businessId))] }, manager);
    });
    emitSharedOrderUpdated(sessionId, { sessionId, reason: "cart_imported" });
    return this.get(sessionId, userId);
  }

  async updateItem(sessionId: string, itemId: number, userId: number, input: SharedItemUpdateInput) {
    await AppDataSource.transaction(async (manager) => {
      const { session } = await this.lockEditableMembership(manager, sessionId, userId, input.expectedVersion);
      const repo = manager.getRepository(SharedOrderItem);
      const item = await repo.findOne({ where: { sharedItemId: itemId, sessionId }, lock: { mode: "pessimistic_write" } });
      if (!item) throw new HttpError(404, "Producto compartido no encontrado");
      if (item.userId !== userId) throw new HttpError(403, "Sólo puedes modificar tus productos");
      const menu = await this.loadValidMenu(manager, item.menuId, item.businessId, input.quantity, input.modifiers || []);
      const { extraPerUnit } = buildModifierSnapshots(menu, input.modifiers || []);
      item.quantity = input.quantity;
      item.note = String(input.note || "").trim().slice(0, 500) || null;
      item.modifiersJson = JSON.stringify(input.modifiers || []);
      item.unitPriceSnapshot = Number((Number(menu.price || 0) + extraPerUnit).toFixed(2)).toFixed(2);
      await repo.save(item);
      await this.bumpSession(manager, session);
      await this.auditService.record(sessionId, userId, "SHARED_ITEM_UPDATED", session.version, { itemId, quantity: input.quantity }, manager);
    });
    emitSharedOrderUpdated(sessionId, { sessionId, reason: "item_updated" });
    return this.get(sessionId, userId);
  }

  async deleteItem(sessionId: string, itemId: number, userId: number, expectedVersion: number) {
    await AppDataSource.transaction(async (manager) => {
      const { session } = await this.lockEditableMembership(manager, sessionId, userId, expectedVersion);
      const repo = manager.getRepository(SharedOrderItem);
      const item = await repo.findOne({ where: { sharedItemId: itemId, sessionId }, lock: { mode: "pessimistic_write" } });
      if (!item) throw new HttpError(404, "Producto compartido no encontrado");
      if (item.userId !== userId) throw new HttpError(403, "Sólo puedes eliminar tus productos");
      await repo.remove(item);
      await this.bumpSession(manager, session);
      await this.auditService.record(sessionId, userId, "SHARED_ITEM_REMOVED", session.version, { itemId }, manager);
    });
    emitSharedOrderUpdated(sessionId, { sessionId, reason: "item_deleted" });
    return this.get(sessionId, userId);
  }

  async rotateSecrets(sessionId: string, userId: number, expectedVersion: number, codeLength: SharedOrderCodeLength) {
    const secrets = createSharedOrderSecrets(codeLength);
    await AppDataSource.transaction(async (manager) => {
      const session = await manager.getRepository(SharedOrderSession).findOne({ where: { sessionId }, lock: { mode: "pessimistic_write" } });
      this.assertHost(session, userId);
      this.assertExpectedVersion(session!, expectedVersion);
      if (session!.status !== "open") throw new HttpError(409, "La sesión ya no admite nuevos participantes");
      session!.codeHash = hashSharedOrderCode(secrets.code);
      session!.linkTokenHash = hashSharedOrderToken(secrets.token);
      session!.codeLength = codeLength;
      await manager.getRepository(SharedOrderSession).save(session!);
      await this.auditService.record(sessionId, userId, "SHARED_INVITE_ROTATED", session!.version, { codeLength }, manager);
    });
    return { session: await this.get(sessionId, userId), secrets };
  }

  async leave(sessionId: string, userId: number, expectedVersion: number) {
    await AppDataSource.transaction(async (manager) => {
      const { session, participant } = await this.lockEditableMembership(manager, sessionId, userId, expectedVersion);
      if (participant.role === "host") throw new HttpError(409, "El anfitrión debe cancelar la orden compartida");
      await manager.getRepository(SharedOrderItem).delete({ sessionId, participantId: participant.participantId });
      participant.status = "left";
      await manager.getRepository(SharedOrderParticipant).save(participant);
      await this.bumpSession(manager, session);
      await this.auditService.record(sessionId, userId, "SHARED_PARTICIPANT_LEFT", session.version, null, manager);
    });
    emitSharedOrderUpdated(sessionId, { sessionId, reason: "participant_left" });
    return { success: true };
  }

  async cancel(sessionId: string, userId: number, expectedVersion: number) {
    await AppDataSource.transaction(async (manager) => {
      const session = await manager.getRepository(SharedOrderSession).findOne({ where: { sessionId }, lock: { mode: "pessimistic_write" } });
      this.assertHost(session, userId);
      this.assertExpectedVersion(session!, expectedVersion);
      if (session!.status !== "open") throw new HttpError(409, "La orden compartida ya no se puede cancelar");
      session!.status = "cancelled";
      session!.lockedAt = new Date();
      await manager.getRepository(SharedOrderSession).save(session!);
      await this.auditService.record(sessionId, userId, "SHARED_SESSION_CANCELLED", session!.version, null, manager);
    });
    emitSharedOrderUpdated(sessionId, { sessionId, reason: "cancelled" });
    return this.get(sessionId, userId);
  }

  async submit(sessionId: string, userId: number, expectedVersion: number, checkout: SuborderCheckoutInput[]) {
    const snapshot = await this.sessions.findOne({ where: { sessionId }, relations: SESSION_RELATIONS });
    this.assertHost(snapshot, userId);
    this.assertExpectedVersion(snapshot!, expectedVersion);
    if (snapshot!.status !== "open") throw new HttpError(409, "La orden compartida ya no está abierta");
    if (!snapshot!.items.length) throw new HttpError(400, "Agrega al menos un producto antes de crear las órdenes");
    const businessIds = [...new Set(snapshot!.items.map((item) => item.businessId))].sort((a, b) => a - b);
    const checkoutMap = new Map(checkout.map((config) => [Number(config.businessId), config]));
    if (checkoutMap.size !== businessIds.length || businessIds.some((id) => !checkoutMap.has(id))) throw new HttpError(400, "Configura entrega y pago para cada negocio");
    const participantById = new Map(snapshot!.participants.map((participant) => [participant.participantId, participant]));
    const inputs: CreateOrderInput[] = businessIds.map((businessId) => {
      const config = checkoutMap.get(businessId)!;
      return {
        ...config,
        businessId,
        userId,
        sharedSessionId: sessionId,
        items: snapshot!.items.filter((item) => item.businessId === businessId).map((item) => ({ id: item.menuId, quantity: item.quantity, note: item.note, modifiers: this.parseModifiers(item.modifiersJson), participantLabel: sharedParticipantLabel(participantById.get(item.participantId)?.packagingNumber || 0) })),
      };
    });
    const orders = await this.orderService.createBatch(inputs, async (manager, created) => {
      const sessionRepo = manager.getRepository(SharedOrderSession);
      const linkRepo = manager.getRepository(SharedOrderSuborder);
      const locked = await sessionRepo.findOne({ where: { sessionId }, lock: { mode: "pessimistic_write" } });
      if (!locked) throw new HttpError(404, "Orden compartida no encontrada");
      locked.status = "submitted";
      locked.lockedAt = new Date();
      locked.submittedAt = new Date();
      await sessionRepo.save(locked);
      await linkRepo.save(created.map(({ input, orderId }) => linkRepo.create({ sessionId, businessId: Number(input.businessId), orderId })));
      await this.auditService.record(sessionId, userId, "SHARED_SESSION_SUBMITTED", locked.version, { orderIds: created.map((entry) => entry.orderId), businessIds: created.map((entry) => Number(entry.input.businessId)) }, manager);
    }, async (manager) => {
      const locked = await manager.getRepository(SharedOrderSession).findOne({ where: { sessionId }, lock: { mode: "pessimistic_write" } });
      this.assertHost(locked, userId);
      this.assertExpectedVersion(locked!, expectedVersion);
      if (locked!.status !== "open") throw new HttpError(409, "La orden compartida cambió de estado");
      locked!.status = "locked";
      locked!.lockedAt = new Date();
      await manager.getRepository(SharedOrderSession).save(locked!);
    });
    emitSharedOrderUpdated(sessionId, { sessionId, reason: "submitted", orders: orders.map((order) => order.id) });
    return { session: await this.get(sessionId, userId), orders };
  }

  private async lockEditableMembership(manager: EntityManager, sessionId: string, userId: number, expectedVersion: number) {
    const session = await manager.getRepository(SharedOrderSession).findOne({ where: { sessionId }, lock: { mode: "pessimistic_write" } });
    if (!session) throw new HttpError(404, "Orden compartida no encontrada");
    this.assertExpectedVersion(session, expectedVersion);
    if (session.status !== "open") throw new HttpError(409, "La orden compartida está cerrada para cambios");
    if (session.expiresAt.getTime() <= Date.now()) throw new HttpError(410, "La orden compartida expiró");
    const participant = await manager.getRepository(SharedOrderParticipant).findOne({ where: { sessionId, userId, status: "active" } });
    if (!participant) throw new HttpError(403, "No perteneces a esta orden compartida");
    return { session, participant };
  }

  private async loadValidMenu(manager: EntityManager, menuId: number, businessId: number, quantity: number, modifiers: CreateOrderModifier[]) {
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 50) throw new HttpError(400, "Cantidad inválida");
    const menu = await manager.getRepository(Menus).findOne({ where: { menuId }, relations: ["menuOptionGroups", "menuOptionGroups.menuOptionChoices"] });
    if (!menu || menu.businessId !== businessId) throw new HttpError(400, "El producto no pertenece al negocio indicado");
    if (!menu.isAvailable || menu.isArchived) throw new HttpError(409, "El producto ya no está disponible");
    buildModifierSnapshots(menu, modifiers);
    return menu;
  }

  private async assertNoOtherActiveSession(manager: EntityManager, userId: number, allowedSessionId?: string) {
    const memberships = await manager.getRepository(SharedOrderParticipant).find({
      where: { userId, status: "active" },
      relations: ["session"],
    });
    const active = memberships.find((entry) =>
      entry.sessionId !== allowedSessionId
      && entry.session?.status === "open"
      && entry.session.expiresAt.getTime() > Date.now(),
    );
    if (active) throw new HttpError(409, "Ya perteneces a una orden compartida. Sal del grupo actual antes de abrir otro.");
  }

  private async bumpSession(manager: EntityManager, session: SharedOrderSession) { session.updatedAt = new Date(); await manager.getRepository(SharedOrderSession).save(session); }
  private assertExpectedVersion(session: SharedOrderSession, expected: number) { if (session.version !== Number(expected)) throw new HttpError(409, "La orden compartida cambió; carga la versión más reciente"); }
  private assertJoinable(session: SharedOrderSession | null) { if (!session) throw new HttpError(404, "Orden compartida no encontrada"); if (session.status !== "open") throw new HttpError(409, "La orden compartida ya no admite participantes"); if (session.expiresAt.getTime() <= Date.now()) throw new HttpError(410, "La invitación expiró"); }
  private assertHost(session: SharedOrderSession | null, userId: number) { if (!session) throw new HttpError(404, "Orden compartida no encontrada"); if (session.hostUserId !== userId) throw new HttpError(403, "Sólo el anfitrión puede realizar esta acción"); }
  private parseModifiers(value: string | null): CreateOrderModifier[] { try { const parsed = value ? JSON.parse(value) : []; return Array.isArray(parsed) ? parsed : []; } catch { return []; } }

  private format(session: SharedOrderSession, self: SharedOrderParticipant) {
    const items = session.items.map((item) => ({ id: item.sharedItemId, businessId: item.businessId, menuId: item.menuId, businessName: item.menu?.business?.businessName || "Negocio", name: item.menu?.itemName || "Producto", quantity: item.quantity, note: item.note, modifiers: this.parseModifiers(item.modifiersJson), unitPrice: Number(item.unitPriceSnapshot), subtotal: Number(item.unitPriceSnapshot) * item.quantity, participantLabel: sharedParticipantLabel(item.participant?.packagingNumber || 0), mine: item.userId === self.userId, version: item.version }));
    const businesses = [...new Map(session.items.map((item) => [item.businessId, item.menu?.business])).entries()].map(([id, business]) => ({ id, name: business?.businessName || "Negocio", paymentMethods: (business?.businessPaymentMethods || []).map((method) => ({ method: method.method, active: Boolean(method.isActive) })) }));
    return { id: session.sessionId, title: session.title || "Orden compartida", status: session.status, version: session.version, expiresAt: session.expiresAt, isHost: self.role === "host", self: { role: self.role, label: sharedParticipantLabel(self.packagingNumber) }, participants: session.participants.filter((participant) => participant.status === "active").map((participant) => ({ label: sharedParticipantLabel(participant.packagingNumber), role: participant.role, itemCount: session.items.filter((item) => item.participantId === participant.participantId).reduce((sum, item) => sum + item.quantity, 0) })), items, businesses, grandTotal: items.reduce((sum, item) => sum + item.subtotal, 0), suborders: (session.suborders || []).map((suborder) => ({ businessId: suborder.businessId, orderId: suborder.orderId, status: suborder.order?.status })) };
  }
}
