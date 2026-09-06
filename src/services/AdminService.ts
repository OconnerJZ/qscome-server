import { Brackets } from "typeorm";
import { AppDataSource } from "../utils/db";
import { Business } from "../entities/Business";
import { BusinessPlanSubscription } from "../entities/BusinessPlanSubscription";

export class AdminService {
  async searchBusinesses(rawQuery = "", rawLimit = 20) {
    const query = String(rawQuery || "").trim();
    const limit = Math.min(50, Math.max(1, Number(rawLimit) || 20));
    const repository = AppDataSource.getRepository(Business);

    const qb = repository
      .createQueryBuilder("business")
      .leftJoin(
        "business.businessOwners",
        "primaryOwnerMembership",
        "primaryOwnerMembership.role_in_business = :primaryRole",
        { primaryRole: "primary_owner" },
      )
      .leftJoin("primaryOwnerMembership.user", "primaryOwner")
      .leftJoin(
        BusinessPlanSubscription,
        "subscription",
        "subscription.business_id = business.business_id",
      )
      .select([
        "business.business_id AS businessId",
        "business.business_name AS businessName",
        "business.email AS businessEmail",
        "business.is_open AS isOpen",
        "business.is_verified AS isVerified",
        "business.created_at AS createdAt",
        "primaryOwner.user_id AS ownerUserId",
        "primaryOwner.user_name AS ownerName",
        "primaryOwner.email AS ownerEmail",
        "subscription.plan_code AS basePlanCode",
        "subscription.trial_plan_code AS trialPlanCode",
        "subscription.trial_starts_at AS trialStartsAt",
        "subscription.trial_ends_at AS trialEndsAt",
        "subscription.status AS subscriptionStatus",
      ])
      .orderBy("business.created_at", "DESC")
      .limit(limit);

    if (query) {
      const numericId = /^\d+$/.test(query) ? Number(query) : null;
      qb.andWhere(
        new Brackets((where) => {
          where
            .where("business.business_name LIKE :query", { query: `%${query}%` })
            .orWhere("business.email LIKE :query", { query: `%${query}%` })
            .orWhere("primaryOwner.user_name LIKE :query", { query: `%${query}%` })
            .orWhere("primaryOwner.email LIKE :query", { query: `%${query}%` });
          if (numericId !== null) {
            where.orWhere("business.business_id = :numericId", { numericId });
          }
        }),
      );
    }

    const rows = await qb.getRawMany();
    const now = Date.now();

    return rows.map((row) => {
      const trialStartsAt = row.trialStartsAt ? new Date(row.trialStartsAt) : null;
      const trialEndsAt = row.trialEndsAt ? new Date(row.trialEndsAt) : null;
      const trialActive = Boolean(
        row.trialPlanCode
        && (!trialStartsAt || trialStartsAt.getTime() <= now)
        && (!trialEndsAt || trialEndsAt.getTime() > now),
      );

      return {
        id: Number(row.businessId),
        name: row.businessName || `Negocio #${row.businessId}`,
        email: row.businessEmail || null,
        isOpen: Boolean(row.isOpen),
        isVerified: Boolean(row.isVerified),
        createdAt: row.createdAt || null,
        owner: row.ownerUserId
          ? {
              id: Number(row.ownerUserId),
              name: row.ownerName || null,
              email: row.ownerEmail || null,
            }
          : null,
        plan: {
          basePlanCode: row.basePlanCode || "free",
          effectivePlanCode: trialActive ? row.trialPlanCode : row.basePlanCode || "free",
          subscriptionStatus: row.subscriptionStatus || "active",
          trial: row.trialPlanCode
            ? {
                planCode: row.trialPlanCode,
                startsAt: trialStartsAt,
                endsAt: trialEndsAt,
                active: trialActive,
              }
            : null,
        },
      };
    });
  }
}
