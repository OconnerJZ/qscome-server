import { IsNull, MoreThan } from "typeorm";
import { AppDataSource } from "../utils/db";
import { Business } from "../entities/Business";
import { BusinessPlanSubscription } from "../entities/BusinessPlanSubscription";
import { BusinessPlanAuditEvent } from "../entities/BusinessPlanAuditEvent";
import { BusinessPlanCode, BusinessPlanLimitKey, getBusinessPlanCatalog, getBusinessPlanDefinition, isBusinessPlanCode } from "../security/businessPlans";
import { HttpError } from "../utils/httpError";

export class BusinessPlanService {
  private readonly subscriptions = AppDataSource.getRepository(BusinessPlanSubscription);

  catalog() { return getBusinessPlanCatalog(); }

  async get(businessId: number) {
    const business = await AppDataSource.getRepository(Business).findOne({ where: { businessId } });
    if (!business) throw new HttpError(404, "Negocio no encontrado");
    const subscription = await this.effectiveSubscription(businessId);
    const definition = getBusinessPlanDefinition(subscription?.planCode);
    const usage = await this.getUsage(businessId);
    return {
      businessId,
      current: { code: definition.code, name: definition.name, description: definition.description, adsEnabled: definition.adsEnabled, price: null, currency: definition.currency, status: subscription?.status || "active", source: subscription?.source || "default", startsAt: subscription?.startsAt || business.createdAt, endsAt: subscription?.endsAt || null, version: subscription?.version || null },
      features: definition.features,
      limits: this.formatLimits(definition.limits, usage),
      usage,
      catalog: this.catalog(),
      billingEnabled: false,
      message: "Los niveles pagados aún no tienen precio ni cobro configurado.",
    };
  }

  async assign(businessId: number, planCode: string, actorUserId: number, expectedVersion?: number) {
    if (!isBusinessPlanCode(planCode)) throw new HttpError(400, "Plan inválido");
    await AppDataSource.transaction(async (manager) => {
      const business = await manager.getRepository(Business).findOne({ where: { businessId } });
      if (!business) throw new HttpError(404, "Negocio no encontrado");
      const repo = manager.getRepository(BusinessPlanSubscription);
      let current = await repo.findOne({ where: { businessId }, lock: { mode: "pessimistic_write" } });
      const previousPlan = current?.planCode || "free";
      if (current && Number(expectedVersion) !== current.version) throw new HttpError(409, "El plan cambió; carga la versión más reciente");
      if (!current) current = repo.create({ businessId, planCode: planCode as BusinessPlanCode, status: "active", source: "admin", assignedBy: actorUserId, startsAt: new Date(), endsAt: null });
      current.planCode = planCode as BusinessPlanCode; current.status = "active"; current.source = "admin"; current.assignedBy = actorUserId; current.startsAt = new Date(); current.endsAt = null;
      await repo.save(current);
      const audit = manager.getRepository(BusinessPlanAuditEvent);
      await audit.save(audit.create({ businessId, actorUserId, action: "BUSINESS_PLAN_ASSIGNED", previousPlan, nextPlan: planCode, metadataJson: JSON.stringify({ source: "admin" }) }));
    });
    return this.get(businessId);
  }

  async assertWithinLimit(businessId: number, key: BusinessPlanLimitKey, currentUsage: number, increment = 1) {
    const subscription = await this.effectiveSubscription(businessId);
    const limit = getBusinessPlanDefinition(subscription?.planCode).limits[key];
    if (limit !== null && currentUsage + increment > limit) throw new HttpError(409, `Alcanzaste el límite configurado para ${key}`);
  }

  private async effectiveSubscription(businessId: number) {
    const now = new Date();
    return this.subscriptions.findOne({ where: [
      { businessId, status: "active", endsAt: IsNull() }, { businessId, status: "trialing", endsAt: IsNull() },
      { businessId, status: "active", endsAt: MoreThan(now) }, { businessId, status: "trialing", endsAt: MoreThan(now) },
    ], order: { updatedAt: "DESC" } });
  }

  private async getUsage(businessId: number) {
    const [team, invitations, menu, orders, shared] = await Promise.all([
      AppDataSource.query(`SELECT COUNT(*) value FROM business_owners WHERE business_id = ?`, [businessId]),
      AppDataSource.query(`SELECT COUNT(*) value FROM business_invitations WHERE business_id = ? AND status = 'pending' AND expires_at > NOW()`, [businessId]),
      AppDataSource.query(`SELECT COUNT(*) value FROM menus WHERE business_id = ? AND is_archived = 0`, [businessId]),
      AppDataSource.query(`SELECT COUNT(*) value FROM orders WHERE business_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)`, [businessId]),
      AppDataSource.query(`SELECT COUNT(DISTINCT shared_session_id) value FROM orders WHERE business_id = ? AND shared_session_id IS NOT NULL AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)`, [businessId]),
    ]);
    return { teamMembers: Number(team[0]?.value || 0), pendingInvitations: Number(invitations[0]?.value || 0), menuItems: Number(menu[0]?.value || 0), ordersLast30Days: Number(orders[0]?.value || 0), sharedOrdersLast30Days: Number(shared[0]?.value || 0) };
  }

  private formatLimits(limits: ReturnType<typeof getBusinessPlanDefinition>["limits"], usage: Awaited<ReturnType<BusinessPlanService["getUsage"]>>) {
    const usageByLimit: Partial<Record<BusinessPlanLimitKey, number>> = { teamMembers: usage.teamMembers + usage.pendingInvitations, menuItems: usage.menuItems };
    return Object.fromEntries(Object.entries(limits).map(([key, limit]) => {
      const used = usageByLimit[key as BusinessPlanLimitKey] ?? null;
      return [key, { limit, used, remaining: limit === null || used === null ? null : Math.max(0, limit - used), enforced: limit !== null }];
    }));
  }
}
