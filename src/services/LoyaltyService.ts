import { EntityManager } from "typeorm";
import { AppDataSource } from "../utils/db";
import { LoyaltyProgram } from "../entities/LoyaltyProgram";
import { LoyaltyAccount } from "../entities/LoyaltyAccount";
import { LoyaltyEvent } from "../entities/LoyaltyEvent";
import { Orders } from "../entities/Orders";
import { Business } from "../entities/Business";
import { BusinessPlanService } from "./BusinessPlanService";
import { HttpError } from "../utils/httpError";

export interface LoyaltyProgramInput {
  isActive: boolean;
  ordersRequired: number;
  rewardPercent: number;
  minOrderAmount?: number;
}

export class LoyaltyService {
  private readonly programs = AppDataSource.getRepository(LoyaltyProgram);
  private readonly accounts = AppDataSource.getRepository(LoyaltyAccount);
  private readonly plans = new BusinessPlanService();

  async getProgram(businessId: number) {
    this.assertBusinessId(businessId);
    const business = await AppDataSource.getRepository(Business).findOne({ where: { businessId } });
    if (!business) throw new HttpError(404, "Negocio no encontrado");
    const program = await this.programs.findOne({ where: { businessId } });
    return program ? this.serializeProgram(program) : null;
  }

  async saveProgram(businessId: number, input: LoyaltyProgramInput) {
    this.assertBusinessId(businessId);
    await this.assertManagementEntitlement(businessId);
    const ordersRequired = Number(input.ordersRequired);
    const rewardPercent = Number(input.rewardPercent);
    const minOrderAmount = Number(input.minOrderAmount || 0);
    if (!Number.isInteger(ordersRequired) || ordersRequired < 2 || ordersRequired > 20) {
      throw new HttpError(400, "Las órdenes requeridas deben estar entre 2 y 20");
    }
    if (!Number.isInteger(rewardPercent) || rewardPercent < 5 || rewardPercent > 30) {
      throw new HttpError(400, "La recompensa debe ser un descuento entero entre 5% y 30%");
    }
    if (!Number.isFinite(minOrderAmount) || minOrderAmount < 0 || minOrderAmount > 100000) {
      throw new HttpError(400, "El monto mínimo de orden no es válido");
    }

    const program = await AppDataSource.transaction(async (manager) => {
      const business = await manager.getRepository(Business).createQueryBuilder("business")
        .setLock("pessimistic_write")
        .where("business.business_id = :businessId", { businessId })
        .getOne();
      if (!business) throw new HttpError(404, "Negocio no encontrado");
      const repo = manager.getRepository(LoyaltyProgram);
      let row = await repo.findOne({ where: { businessId } });
      if (!row) row = repo.create({ businessId });
      row.isActive = Boolean(input.isActive);
      row.ordersRequired = ordersRequired;
      row.rewardPercent = rewardPercent;
      row.minOrderAmount = minOrderAmount.toFixed(2);
      return repo.save(row);
    });
    return this.serializeProgram(program);
  }

  async getCustomerProgress(userId: number, businessId: number) {
    this.assertUserId(userId);
    this.assertBusinessId(businessId);
    const program = await this.programs.findOne({ where: { businessId } });
    if (!program || !program.isActive) {
      return { businessId, active: false, program: program ? this.serializeProgram(program) : null, progress: null };
    }

    await this.reconcileCustomerOrders(userId, businessId);
    const account = await this.accounts.findOne({ where: { businessId, userId } });
    return {
      businessId,
      active: true,
      program: this.serializeProgram(program),
      progress: {
        stamps: account?.stamps || 0,
        ordersRequired: program.ordersRequired,
        remaining: Math.max(0, program.ordersRequired - (account?.stamps || 0)),
        availableRewards: account?.availableRewards || 0,
        lifetimeStamps: account?.lifetimeStamps || 0,
      },
    };
  }

  async listCustomerPrograms(userId: number) {
    this.assertUserId(userId);
    const eligibleBusinesses = await AppDataSource.query(
      `SELECT DISTINCT o.business_id
       FROM orders o
       INNER JOIN loyalty_programs p ON p.business_id = o.business_id AND p.is_active = 1
       WHERE o.user_id = ? AND o.status = 'completed' AND o.business_id IS NOT NULL
       ORDER BY o.business_id ASC
       LIMIT 100`,
      [userId],
    );
    for (const row of eligibleBusinesses) {
      await this.reconcileCustomerOrders(userId, Number(row.business_id));
    }

    const rows = await AppDataSource.query(
      `SELECT a.business_id, a.stamps, a.available_rewards, a.lifetime_stamps,
              p.orders_required, p.reward_percent, p.min_order_amount, p.is_active,
              b.business_name
       FROM loyalty_accounts a
       INNER JOIN loyalty_programs p ON p.business_id = a.business_id
       INNER JOIN business b ON b.business_id = a.business_id
       WHERE a.user_id = ?
       ORDER BY a.updated_at DESC`,
      [userId],
    );
    return rows.map((row: any) => ({
      businessId: Number(row.business_id),
      businessName: row.business_name || "Negocio",
      active: Boolean(row.is_active),
      program: {
        ordersRequired: Number(row.orders_required),
        rewardPercent: Number(row.reward_percent),
        minOrderAmount: Number(row.min_order_amount || 0),
      },
      progress: {
        stamps: Number(row.stamps || 0),
        remaining: Math.max(0, Number(row.orders_required) - Number(row.stamps || 0)),
        availableRewards: Number(row.available_rewards || 0),
        lifetimeStamps: Number(row.lifetime_stamps || 0),
      },
    }));
  }

  async creditOrderById(orderId: number) {
    if (!Number.isInteger(orderId) || orderId <= 0) throw new HttpError(400, "Orden inválida");
    return AppDataSource.transaction(async (manager) => {
      const order = await manager.getRepository(Orders).findOne({ where: { orderId } });
      if (!order) throw new HttpError(404, "Orden no encontrada");
      return this.creditCompletedOrder(order, manager);
    });
  }

  async reconcileCustomerOrders(userId: number, businessId: number) {
    this.assertUserId(userId);
    this.assertBusinessId(businessId);
    const rows = await AppDataSource.query(
      `SELECT o.order_id
       FROM orders o
       LEFT JOIN loyalty_events e ON e.order_id = o.order_id
       WHERE o.user_id = ?
         AND o.business_id = ?
         AND o.status = 'completed'
         AND e.order_id IS NULL
       ORDER BY o.order_id ASC
       LIMIT 100`,
      [userId, businessId],
    );
    for (const row of rows) await this.creditOrderById(Number(row.order_id));
  }

  async creditCompletedOrder(order: Orders, manager: EntityManager) {
    if (order.status !== "completed" || !order.userId || !order.businessId) return null;
    const programRepo = manager.getRepository(LoyaltyProgram);
    const accountRepo = manager.getRepository(LoyaltyAccount);
    const eventRepo = manager.getRepository(LoyaltyEvent);

    const program = await programRepo.findOne({ where: { businessId: order.businessId, isActive: true } });
    if (!program) return null;
    if (Number(order.total || 0) < Number(program.minOrderAmount || 0)) return null;

    let account = await accountRepo.createQueryBuilder("account")
      .setLock("pessimistic_write")
      .where("account.business_id = :businessId AND account.user_id = :userId", {
        businessId: order.businessId,
        userId: order.userId,
      })
      .getOne();
    if (!account) {
      try {
        account = await accountRepo.save(accountRepo.create({
          businessId: order.businessId,
          userId: order.userId,
          stamps: 0,
          availableRewards: 0,
          lifetimeStamps: 0,
        }));
      } catch (error: any) {
        if (error?.code !== "ER_DUP_ENTRY" && Number(error?.errno) !== 1062) throw error;
        account = await accountRepo.createQueryBuilder("account")
          .setLock("pessimistic_write")
          .where("account.business_id = :businessId AND account.user_id = :userId", {
            businessId: order.businessId,
            userId: order.userId,
          })
          .getOne();
        if (!account) throw error;
      }
    }

    const existingEvent = await eventRepo.findOne({ where: { orderId: order.orderId } });
    if (existingEvent) return null;

    const totalStamps = Number(account.stamps || 0) + 1;
    const earnedRewards = Math.floor(totalStamps / program.ordersRequired);
    account.stamps = totalStamps % program.ordersRequired;
    account.availableRewards = Number(account.availableRewards || 0) + earnedRewards;
    account.lifetimeStamps = Number(account.lifetimeStamps || 0) + 1;
    await accountRepo.save(account);

    await eventRepo.save(eventRepo.create({
      loyaltyAccountId: account.loyaltyAccountId,
      orderId: order.orderId,
      eventType: "order_completed",
      stampDelta: 1,
      rewardDelta: earnedRewards,
      metadataJson: JSON.stringify({
        orderTotal: Number(order.total || 0),
        ordersRequired: program.ordersRequired,
        rewardPercent: program.rewardPercent,
      }),
    }));

    return { stamps: account.stamps, availableRewards: account.availableRewards, earnedRewards };
  }

  private async assertManagementEntitlement(businessId: number) {
    const capabilities = await this.plans.resolveCapabilities(businessId);
    const feature = capabilities.features.find((item) => item.key === "loyalty.management");
    if (!feature?.included || feature.status !== "available") {
      throw new HttpError(403, "La gestión de lealtad requiere Nivel 1 o superior");
    }
  }

  private serializeProgram(program: LoyaltyProgram) {
    return {
      businessId: program.businessId,
      active: Boolean(program.isActive),
      ordersRequired: program.ordersRequired,
      rewardPercent: program.rewardPercent,
      minOrderAmount: Number(program.minOrderAmount || 0),
      updatedAt: program.updatedAt,
    };
  }

  private assertBusinessId(businessId: number) {
    if (!Number.isInteger(businessId) || businessId <= 0) throw new HttpError(400, "Negocio inválido");
  }

  private assertUserId(userId: number) {
    if (!Number.isInteger(userId) || userId <= 0) throw new HttpError(401, "Usuario no autenticado");
  }
}
