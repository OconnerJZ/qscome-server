import { In } from "typeorm";
import { Users } from "../entities/Users";
import {
  compareBusinessPlanCodes,
  isBusinessPlanCode,
} from "../security/businessPlans";
import { AppDataSource } from "../utils/db";
import { HttpError } from "../utils/httpError";
import { BusinessPlanService } from "./BusinessPlanService";

export type AdminTrialLifecycle = "none" | "scheduled" | "active" | "expired";

type TrialSnapshot = {
  planCode?: string | null;
  startsAt?: Date | string | null;
  endsAt?: Date | string | null;
} | null | undefined;

const timestampOf = (value: Date | string | null | undefined) => {
  if (!value) return null;
  const timestamp = value instanceof Date ? value.getTime() : new Date(value).getTime();
  return Number.isNaN(timestamp) ? null : timestamp;
};

const numberOf = (value: unknown) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const classifyAdminTrialLifecycle = (
  trial: TrialSnapshot,
  now = Date.now(),
): AdminTrialLifecycle => {
  if (!trial?.planCode) return "none";

  const startsAt = timestampOf(trial.startsAt);
  const endsAt = timestampOf(trial.endsAt);
  if (startsAt !== null && startsAt > now) return "scheduled";
  if (endsAt === null || endsAt > now) return "active";
  return "expired";
};

export const assertAdminTrialTarget = (basePlanCode: string, targetPlanCode: string) => {
  if (!isBusinessPlanCode(targetPlanCode)) {
    throw new HttpError(400, "Plan de trial inválido");
  }
  if (compareBusinessPlanCodes(basePlanCode, targetPlanCode) !== "upgrade") {
    throw new HttpError(409, "El trial debe usar un plan superior al plan base");
  }
};

export const buildAdminPlanSummary = (
  rawSummary: Record<string, unknown> = {},
  rawBasePlans: Record<string, unknown>[] = [],
  rawEffectivePlans: Record<string, unknown>[] = [],
  rawExpiringTrials: Record<string, unknown>[] = [],
) => ({
  generatedAt: new Date().toISOString(),
  totalBusinesses: numberOf(rawSummary.totalBusinesses),
  activeTrials: numberOf(rawSummary.activeTrials),
  scheduledTrials: numberOf(rawSummary.scheduledTrials),
  expiringTrials7d: numberOf(rawSummary.expiringTrials7d),
  basePlans: rawBasePlans.map((row) => ({
    planCode: String(row.planCode || "free"),
    businesses: numberOf(row.businessesCount),
  })),
  effectivePlans: rawEffectivePlans.map((row) => ({
    planCode: String(row.planCode || "free"),
    businesses: numberOf(row.businessesCount),
  })),
  expiringTrials: rawExpiringTrials.map((row) => ({
    businessId: numberOf(row.businessId),
    businessName: String(row.businessName || `Negocio #${row.businessId}`),
    planCode: String(row.planCode || "free"),
    startsAt: row.startsAt || null,
    endsAt: row.endsAt || null,
  })),
});

export class AdminPlanService {
  private readonly plans = new BusinessPlanService();

  async summary() {
    const entitled = `
      subscription.status IN ('active', 'trialing')
      AND (subscription.ends_at IS NULL OR subscription.ends_at > NOW())
    `;
    const activeTrial = `
      ${entitled}
      AND subscription.trial_plan_code IS NOT NULL
      AND (subscription.trial_starts_at IS NULL OR subscription.trial_starts_at <= NOW())
      AND (subscription.trial_ends_at IS NULL OR subscription.trial_ends_at > NOW())
    `;

    const [summaryRows, basePlanRows, effectivePlanRows, expiringTrialRows] = await Promise.all([
      AppDataSource.query(`
        SELECT
          COUNT(*) AS totalBusinesses,
          SUM(CASE WHEN ${activeTrial} THEN 1 ELSE 0 END) AS activeTrials,
          SUM(CASE WHEN
            ${entitled}
            AND subscription.trial_plan_code IS NOT NULL
            AND subscription.trial_starts_at > NOW()
            AND (subscription.trial_ends_at IS NULL OR subscription.trial_ends_at > subscription.trial_starts_at)
            THEN 1 ELSE 0 END
          ) AS scheduledTrials,
          SUM(CASE WHEN
            ${activeTrial}
            AND subscription.trial_ends_at IS NOT NULL
            AND subscription.trial_ends_at <= DATE_ADD(NOW(), INTERVAL 7 DAY)
            THEN 1 ELSE 0 END
          ) AS expiringTrials7d
        FROM business
        LEFT JOIN business_plan_subscriptions subscription
          ON subscription.business_id = business.business_id
      `),
      AppDataSource.query(`
        SELECT COALESCE(subscription.plan_code, 'free') AS planCode, COUNT(*) AS businessesCount
        FROM business
        LEFT JOIN business_plan_subscriptions subscription
          ON subscription.business_id = business.business_id
        GROUP BY COALESCE(subscription.plan_code, 'free')
        ORDER BY businessesCount DESC, planCode ASC
      `),
      AppDataSource.query(`
        SELECT effectivePlanCode AS planCode, COUNT(*) AS businessesCount
        FROM (
          SELECT
            business.business_id,
            CASE
              WHEN ${activeTrial} THEN subscription.trial_plan_code
              WHEN ${entitled} THEN COALESCE(subscription.plan_code, 'free')
              ELSE 'free'
            END AS effectivePlanCode
          FROM business
          LEFT JOIN business_plan_subscriptions subscription
            ON subscription.business_id = business.business_id
        ) plan_snapshot
        GROUP BY effectivePlanCode
        ORDER BY businessesCount DESC, effectivePlanCode ASC
      `),
      AppDataSource.query(`
        SELECT
          business.business_id AS businessId,
          business.business_name AS businessName,
          subscription.trial_plan_code AS planCode,
          subscription.trial_starts_at AS startsAt,
          subscription.trial_ends_at AS endsAt
        FROM business
        INNER JOIN business_plan_subscriptions subscription
          ON subscription.business_id = business.business_id
        WHERE ${activeTrial}
          AND subscription.trial_ends_at IS NOT NULL
          AND subscription.trial_ends_at <= DATE_ADD(NOW(), INTERVAL 7 DAY)
        ORDER BY subscription.trial_ends_at ASC
        LIMIT 10
      `),
    ]);

    return buildAdminPlanSummary(
      summaryRows?.[0] || {},
      basePlanRows || [],
      effectivePlanRows || [],
      expiringTrialRows || [],
    );
  }

  async get(businessId: number) {
    return this.decoratePlan(await this.plans.get(businessId));
  }

  async assign(
    businessId: number,
    planCode: string,
    actorUserId: number,
    expectedVersion?: number,
  ) {
    return this.decoratePlan(
      await this.plans.assign(businessId, planCode, actorUserId, expectedVersion),
    );
  }

  async grantTrial(
    businessId: number,
    actorUserId: number,
    input: {
      planCode: string;
      startsAt?: Date;
      endsAt: Date;
      expectedVersion?: number;
    },
  ) {
    const current = await this.get(businessId);
    assertAdminTrialTarget(current.basePlan?.code || "free", input.planCode);

    const lifecycle = current.trial?.lifecycle || "none";
    if (lifecycle === "active" || lifecycle === "scheduled") {
      throw new HttpError(409, "El negocio ya tiene un trial activo o programado; cancélalo antes de crear otro");
    }

    const effectiveVersion = input.expectedVersion ?? current.subscription?.version ?? undefined;
    return this.decoratePlan(
      await this.plans.grantTrial(businessId, actorUserId, {
        ...input,
        expectedVersion: effectiveVersion,
      }),
    );
  }

  async cancelTrial(
    businessId: number,
    actorUserId: number,
    expectedVersion?: number,
  ) {
    return this.decoratePlan(
      await this.plans.cancelTrial(businessId, actorUserId, expectedVersion),
    );
  }

  async history(businessId: number) {
    const rows = await this.plans.history(businessId);
    const actorIds = [...new Set(
      rows
        .map((row) => Number(row.actorUserId))
        .filter((id) => Number.isInteger(id) && id > 0),
    )];

    const actors = actorIds.length
      ? await AppDataSource.getRepository(Users).find({
          where: { userId: In(actorIds) },
          select: { userId: true, userName: true, email: true },
        })
      : [];
    const actorById = new Map(actors.map((actor) => [actor.userId, actor]));

    return rows.map((row) => {
      const actor = row.actorUserId ? actorById.get(Number(row.actorUserId)) : null;
      return {
        ...row,
        actor: actor
          ? { id: actor.userId, name: actor.userName, email: actor.email }
          : null,
      };
    });
  }

  private decoratePlan<T extends { trial?: TrialSnapshot }>(plan: T) {
    if (!plan.trial) return plan;
    const lifecycle = classifyAdminTrialLifecycle(plan.trial);
    return {
      ...plan,
      trial: {
        ...plan.trial,
        lifecycle,
        canCancel: lifecycle === "active" || lifecycle === "scheduled",
      },
    };
  }
}
