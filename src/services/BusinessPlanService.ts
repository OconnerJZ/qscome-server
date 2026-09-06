import { AppDataSource } from "../utils/db";
import { Business } from "../entities/Business";
import { BusinessPlanSubscription } from "../entities/BusinessPlanSubscription";
import { BusinessPlanAuditEvent } from "../entities/BusinessPlanAuditEvent";
import {
  BusinessPlanCode,
  BusinessPlanLimitKey,
  getBusinessPlanCatalog,
  getBusinessPlanDefinition,
  isBusinessPlanCode,
} from "../security/businessPlans";
import { HttpError } from "../utils/httpError";

interface TrialInput {
  planCode: string;
  startsAt?: Date;
  endsAt: Date;
  expectedVersion?: number;
}

export class BusinessPlanService {
  private readonly subscriptions = AppDataSource.getRepository(BusinessPlanSubscription);

  catalog() {
    return getBusinessPlanCatalog();
  }

  /**
   * Lightweight plan resolution intended for enforcement paths. It does not run
   * usage aggregation queries, which keeps it safe to reuse in hot endpoints.
   */
  async resolveCapabilities(businessId: number) {
    const subscription = await this.subscriptions.findOne({ where: { businessId } });
    const basePlanCode = subscription?.basePlanCode || "free";
    const trial = this.getTrialState(subscription);
    const effectivePlanCode = trial?.active ? trial.planCode : basePlanCode;
    const definition = getBusinessPlanDefinition(effectivePlanCode);
    const baseDefinition = getBusinessPlanDefinition(basePlanCode);

    return {
      businessId,
      plan: {
        code: definition.code,
        name: definition.name,
        description: definition.description,
      },
      basePlan: {
        code: baseDefinition.code,
        name: baseDefinition.name,
      },
      subscription: {
        status: trial?.active ? "trialing" : subscription?.status || "active",
        source: subscription?.source || "default",
        startsAt: subscription?.startsAt || null,
        endsAt: subscription?.endsAt || null,
        version: subscription?.version || null,
      },
      trial,
      policies: { ...definition.policies },
      features: definition.features.map((feature) => ({ ...feature })),
      limits: { ...definition.limits },
    };
  }

  async get(businessId: number) {
    const business = await AppDataSource.getRepository(Business).findOne({
      where: { businessId },
    });
    if (!business) throw new HttpError(404, "Negocio no encontrado");

    const capabilities = await this.resolveCapabilities(businessId);
    const usage = await this.getUsage(businessId);
    const currentDefinition = getBusinessPlanDefinition(capabilities.plan.code);

    return {
      businessId,
      // Transitional shape kept for the existing owner UI while it migrates to
      // plan/subscription/policies. New code should prefer the semantic fields.
      current: {
        code: currentDefinition.code,
        name: currentDefinition.name,
        description: currentDefinition.description,
        adsEnabled: currentDefinition.policies.adsEnabled,
        price: null,
        currency: currentDefinition.currency,
        status: capabilities.subscription.status,
        source: capabilities.subscription.source,
        startsAt:
          capabilities.trial?.active && capabilities.trial.startsAt
            ? capabilities.trial.startsAt
            : capabilities.subscription.startsAt || business.createdAt,
        endsAt:
          capabilities.trial?.active
            ? capabilities.trial.endsAt
            : capabilities.subscription.endsAt,
        version: capabilities.subscription.version,
      },
      plan: capabilities.plan,
      basePlan: capabilities.basePlan,
      subscription: capabilities.subscription,
      trial: capabilities.trial,
      policies: capabilities.policies,
      features: capabilities.features,
      limits: this.formatLimits(capabilities.limits, usage),
      usage,
      catalog: this.catalog(),
      billingEnabled: false,
      message:
        "Los niveles pagados aún no tienen precio ni cobro configurado. Las funciones esenciales de compra y operación permanecen disponibles.",
    };
  }

  async assign(
    businessId: number,
    planCode: string,
    actorUserId: number,
    expectedVersion?: number,
  ) {
    if (!isBusinessPlanCode(planCode)) throw new HttpError(400, "Plan inválido");

    await AppDataSource.transaction(async (manager) => {
      const business = await manager.getRepository(Business).findOne({
        where: { businessId },
      });
      if (!business) throw new HttpError(404, "Negocio no encontrado");

      const repo = manager.getRepository(BusinessPlanSubscription);
      let current = await repo.findOne({
        where: { businessId },
        lock: { mode: "pessimistic_write" },
      });

      if (
        current &&
        expectedVersion !== undefined &&
        Number(expectedVersion) !== current.version
      ) {
        throw new HttpError(409, "El plan cambió; carga la versión más reciente");
      }

      const previousPlan = this.getEffectivePlanCode(current);
      const previousBasePlan = current?.basePlanCode || "free";
      const cancelledTrial = current?.trialPlanCode || null;

      if (!current) {
        current = repo.create({
          businessId,
          basePlanCode: planCode as BusinessPlanCode,
          status: "active",
          source: "admin",
          assignedBy: actorUserId,
          startsAt: new Date(),
          endsAt: null,
          trialPlanCode: null,
          trialStartsAt: null,
          trialEndsAt: null,
        });
      }

      current.basePlanCode = planCode as BusinessPlanCode;
      current.status = "active";
      current.source = "admin";
      current.assignedBy = actorUserId;
      current.startsAt = new Date();
      current.endsAt = null;
      current.trialPlanCode = null;
      current.trialStartsAt = null;
      current.trialEndsAt = null;
      await repo.save(current);

      const audit = manager.getRepository(BusinessPlanAuditEvent);
      await audit.save(
        audit.create({
          businessId,
          actorUserId,
          action: "PLAN_ASSIGNED",
          previousPlan,
          nextPlan: planCode,
          metadataJson: JSON.stringify({
            source: "admin",
            previousBasePlan,
            cancelledTrial,
          }),
        }),
      );
    });

    return this.get(businessId);
  }

  async grantTrial(businessId: number, actorUserId: number, input: TrialInput) {
    if (!isBusinessPlanCode(input.planCode)) throw new HttpError(400, "Plan inválido");

    const startsAt = input.startsAt || new Date();
    const endsAt = input.endsAt;
    if (!(endsAt instanceof Date) || Number.isNaN(endsAt.getTime())) {
      throw new HttpError(400, "La fecha de fin del trial es inválida");
    }
    if (endsAt.getTime() <= startsAt.getTime()) {
      throw new HttpError(400, "El trial debe terminar después de su fecha de inicio");
    }

    await AppDataSource.transaction(async (manager) => {
      const business = await manager.getRepository(Business).findOne({
        where: { businessId },
      });
      if (!business) throw new HttpError(404, "Negocio no encontrado");

      const repo = manager.getRepository(BusinessPlanSubscription);
      let current = await repo.findOne({
        where: { businessId },
        lock: { mode: "pessimistic_write" },
      });

      if (
        current &&
        input.expectedVersion !== undefined &&
        Number(input.expectedVersion) !== current.version
      ) {
        throw new HttpError(409, "El plan cambió; carga la versión más reciente");
      }

      const previousPlan = this.getEffectivePlanCode(current);
      if (!current) {
        current = repo.create({
          businessId,
          basePlanCode: "free",
          status: "active",
          source: "system",
          assignedBy: null,
          startsAt: new Date(),
          endsAt: null,
          trialPlanCode: null,
          trialStartsAt: null,
          trialEndsAt: null,
        });
      }

      current.status = "active";
      current.source = "admin";
      current.assignedBy = actorUserId;
      current.trialPlanCode = input.planCode as BusinessPlanCode;
      current.trialStartsAt = startsAt;
      current.trialEndsAt = endsAt;
      await repo.save(current);

      const audit = manager.getRepository(BusinessPlanAuditEvent);
      await audit.save(
        audit.create({
          businessId,
          actorUserId,
          action: "TRIAL_STARTED",
          previousPlan,
          nextPlan: input.planCode,
          metadataJson: JSON.stringify({
            basePlan: current.basePlanCode,
            startsAt: startsAt.toISOString(),
            endsAt: endsAt.toISOString(),
          }),
        }),
      );
    });

    return this.get(businessId);
  }

  async cancelTrial(
    businessId: number,
    actorUserId: number,
    expectedVersion?: number,
  ) {
    await AppDataSource.transaction(async (manager) => {
      const business = await manager.getRepository(Business).findOne({
        where: { businessId },
      });
      if (!business) throw new HttpError(404, "Negocio no encontrado");

      const repo = manager.getRepository(BusinessPlanSubscription);
      const current = await repo.findOne({
        where: { businessId },
        lock: { mode: "pessimistic_write" },
      });
      if (!current?.trialPlanCode) throw new HttpError(409, "El negocio no tiene un trial para cancelar");

      if (
        expectedVersion !== undefined &&
        Number(expectedVersion) !== current.version
      ) {
        throw new HttpError(409, "El plan cambió; carga la versión más reciente");
      }

      const previousPlan = this.getEffectivePlanCode(current);
      const previousTrial = current.trialPlanCode;
      current.source = "admin";
      current.assignedBy = actorUserId;
      current.trialPlanCode = null;
      current.trialStartsAt = null;
      current.trialEndsAt = null;
      await repo.save(current);

      const audit = manager.getRepository(BusinessPlanAuditEvent);
      await audit.save(
        audit.create({
          businessId,
          actorUserId,
          action: "TRIAL_CANCELLED",
          previousPlan,
          nextPlan: current.basePlanCode,
          metadataJson: JSON.stringify({
            basePlan: current.basePlanCode,
            cancelledTrial: previousTrial,
          }),
        }),
      );
    });

    return this.get(businessId);
  }

  async history(businessId: number) {
    const business = await AppDataSource.getRepository(Business).findOne({
      where: { businessId },
    });
    if (!business) throw new HttpError(404, "Negocio no encontrado");

    const rows = await AppDataSource.getRepository(BusinessPlanAuditEvent).find({
      where: { businessId },
      order: { createdAt: "DESC" },
      take: 100,
    });

    return rows.map((row) => ({
      auditId: row.auditId,
      action: row.action,
      previousPlan: row.previousPlan,
      nextPlan: row.nextPlan,
      actorUserId: row.actorUserId,
      metadata: this.parseMetadata(row.metadataJson),
      createdAt: row.createdAt,
    }));
  }

  async assertWithinLimit(
    businessId: number,
    key: BusinessPlanLimitKey,
    currentUsage: number,
    increment = 1,
  ) {
    const capabilities = await this.resolveCapabilities(businessId);
    const limit = capabilities.limits[key];
    if (limit !== null && currentUsage + increment > limit) {
      throw new HttpError(409, `Alcanzaste el límite configurado para ${key}`);
    }
  }

  private getTrialState(subscription: BusinessPlanSubscription | null) {
    if (!subscription?.trialPlanCode) return null;

    const now = Date.now();
    const startsAt = subscription.trialStartsAt;
    const endsAt = subscription.trialEndsAt;
    const hasStarted = !startsAt || startsAt.getTime() <= now;
    // A null end date is supported only for compatibility with legacy trials.
    const hasNotEnded = !endsAt || endsAt.getTime() > now;

    return {
      planCode: subscription.trialPlanCode,
      name: getBusinessPlanDefinition(subscription.trialPlanCode).name,
      startsAt,
      endsAt,
      active: hasStarted && hasNotEnded,
    };
  }

  private getEffectivePlanCode(subscription: BusinessPlanSubscription | null): BusinessPlanCode {
    const trial = this.getTrialState(subscription);
    return trial?.active
      ? trial.planCode
      : subscription?.basePlanCode || "free";
  }

  private async getUsage(businessId: number) {
    const [team, invitations, menu, photos, orders, shared] = await Promise.all([
      AppDataSource.query(
        `SELECT COUNT(*) value FROM business_owners WHERE business_id = ?`,
        [businessId],
      ),
      AppDataSource.query(
        `SELECT COUNT(*) value FROM business_invitations WHERE business_id = ? AND status = 'pending' AND expires_at > NOW()`,
        [businessId],
      ),
      AppDataSource.query(
        `SELECT COUNT(*) value FROM menus WHERE business_id = ? AND is_archived = 0`,
        [businessId],
      ),
      AppDataSource.query(
        `SELECT COUNT(*) value FROM business_photos WHERE business_id = ?`,
        [businessId],
      ),
      AppDataSource.query(
        `SELECT COUNT(*) value FROM orders WHERE business_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)`,
        [businessId],
      ),
      AppDataSource.query(
        `SELECT COUNT(DISTINCT shared_session_id) value FROM orders WHERE business_id = ? AND shared_session_id IS NOT NULL AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)`,
        [businessId],
      ),
    ]);

    return {
      teamMembers: Number(team[0]?.value || 0),
      pendingInvitations: Number(invitations[0]?.value || 0),
      menuItems: Number(menu[0]?.value || 0),
      businessPhotos: Number(photos[0]?.value || 0),
      ordersLast30Days: Number(orders[0]?.value || 0),
      sharedOrdersLast30Days: Number(shared[0]?.value || 0),
    };
  }

  private formatLimits(
    limits: ReturnType<typeof getBusinessPlanDefinition>["limits"],
    usage: Awaited<ReturnType<BusinessPlanService["getUsage"]>>,
  ) {
    const usageByLimit: Partial<Record<BusinessPlanLimitKey, number>> = {
      teamMembers: usage.teamMembers + usage.pendingInvitations,
      menuItems: usage.menuItems,
      businessPhotos: usage.businessPhotos,
    };

    return Object.fromEntries(
      Object.entries(limits).map(([key, limit]) => {
        const used = usageByLimit[key as BusinessPlanLimitKey] ?? null;
        return [
          key,
          {
            limit,
            used,
            remaining:
              limit === null || used === null ? null : Math.max(0, limit - used),
            enforced: limit !== null,
          },
        ];
      }),
    );
  }

  private parseMetadata(value: string | null) {
    if (!value) return null;
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }
}
