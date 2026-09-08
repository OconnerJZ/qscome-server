import { EntityManager } from "typeorm";
import { AuditLogs } from "../entities/AuditLogs";
import { AdCampaign, AdCampaignStatus } from "../entities/AdCampaign";
import { MarketingCampaign, MarketingCampaignStatus } from "../entities/MarketingCampaign";
import { AppDataSource } from "../utils/db";
import { HttpError } from "../utils/httpError";

export type AdminAdModerationDecision = "approved" | "rejected";
export type AdminMarketingInterventionStatus = "paused" | "ended";

const MARKETING_STATUSES: MarketingCampaignStatus[] = ["draft", "scheduled", "active", "paused", "ended"];
const AD_STATUSES: AdCampaignStatus[] = ["draft", "pending_billing", "ready", "active", "paused", "ended"];
const AD_MODERATION_STATUSES = ["not_submitted", "pending", "approved", "rejected"] as const;

const numberOf = (value: unknown) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const reasonOf = (value: unknown) => String(value || "").trim();
const limitOf = (value: unknown) => Math.min(100, Math.max(1, Number.parseInt(String(value || 25), 10) || 25));

export const normalizeAdminAdModeration = (
  rawDecision: string,
  rawReason: string,
): { decision: AdminAdModerationDecision; reason: string } => {
  if (rawDecision !== "approved" && rawDecision !== "rejected") {
    throw new HttpError(400, "Decisión de moderación inválida");
  }
  const reason = reasonOf(rawReason);
  if (reason.length < 3 || reason.length > 500) {
    throw new HttpError(400, "Indica un motivo administrativo de 3 a 500 caracteres");
  }
  return { decision: rawDecision, reason };
};

export const normalizeAdminMarketingIntervention = (
  rawStatus: string,
  rawReason: string,
): { status: AdminMarketingInterventionStatus; reason: string } => {
  if (rawStatus !== "paused" && rawStatus !== "ended") {
    throw new HttpError(400, "Estado administrativo inválido");
  }
  const reason = reasonOf(rawReason);
  if (reason.length < 3 || reason.length > 500) {
    throw new HttpError(400, "Indica un motivo administrativo de 3 a 500 caracteres");
  }
  return { status: rawStatus, reason };
};

export const buildAdminMarketingSummary = (
  marketing: Record<string, unknown> = {},
  ads: Record<string, unknown> = {},
) => ({
  generatedAt: new Date().toISOString(),
  billingEnabled: false,
  servingEnabled: false,
  marketing: {
    total: numberOf(marketing.total),
    draft: numberOf(marketing.draft),
    scheduled: numberOf(marketing.scheduled),
    active: numberOf(marketing.active),
    paused: numberOf(marketing.paused),
    ended: numberOf(marketing.ended),
  },
  ads: {
    total: numberOf(ads.total),
    pendingModeration: numberOf(ads.pendingModeration),
    approved: numberOf(ads.approved),
    rejected: numberOf(ads.rejected),
    pendingBilling: numberOf(ads.pendingBilling),
    active: numberOf(ads.active),
    paused: numberOf(ads.paused),
    ended: numberOf(ads.ended),
  },
});

export class AdminMarketingService {
  async summary() {
    const [marketingRows, adRows] = await Promise.all([
      AppDataSource.query(`
        SELECT
          COUNT(*) total,
          SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) draft,
          SUM(CASE WHEN status = 'scheduled' THEN 1 ELSE 0 END) scheduled,
          SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) active,
          SUM(CASE WHEN status = 'paused' THEN 1 ELSE 0 END) paused,
          SUM(CASE WHEN status = 'ended' THEN 1 ELSE 0 END) ended
        FROM marketing_campaigns
      `),
      AppDataSource.query(`
        SELECT
          COUNT(*) total,
          SUM(CASE WHEN moderation_status = 'pending' THEN 1 ELSE 0 END) pendingModeration,
          SUM(CASE WHEN moderation_status = 'approved' THEN 1 ELSE 0 END) approved,
          SUM(CASE WHEN moderation_status = 'rejected' THEN 1 ELSE 0 END) rejected,
          SUM(CASE WHEN status = 'pending_billing' THEN 1 ELSE 0 END) pendingBilling,
          SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) active,
          SUM(CASE WHEN status = 'paused' THEN 1 ELSE 0 END) paused,
          SUM(CASE WHEN status = 'ended' THEN 1 ELSE 0 END) ended
        FROM ad_campaigns
      `),
    ]);

    return buildAdminMarketingSummary(marketingRows?.[0] || {}, adRows?.[0] || {});
  }

  async campaigns(input: { q?: unknown; status?: unknown; limit?: unknown } = {}) {
    const q = String(input.q || "").trim().slice(0, 100);
    const status = String(input.status || "").trim();
    if (status && !MARKETING_STATUSES.includes(status as MarketingCampaignStatus)) {
      throw new HttpError(400, "Filtro de estado inválido");
    }
    const limit = limitOf(input.limit);
    const search = `%${q}%`;
    const statusClause = status ? "AND c.status = ?" : "";
    const params: unknown[] = [q, search, search, search];
    if (status) params.push(status);

    const rows = await AppDataSource.query(`
      SELECT
        c.campaign_id campaignId,
        c.business_id businessId,
        b.business_name businessName,
        c.name,
        c.message,
        c.objective,
        c.audience,
        c.status,
        c.starts_at startsAt,
        c.ends_at endsAt,
        c.created_by createdBy,
        c.created_at createdAt,
        c.updated_at updatedAt
      FROM marketing_campaigns c
      INNER JOIN business b ON b.business_id = c.business_id
      WHERE (? = '' OR c.name LIKE ? OR b.business_name LIKE ? OR CAST(c.campaign_id AS CHAR) LIKE ?)
        ${statusClause}
      ORDER BY c.updated_at DESC, c.campaign_id DESC
      LIMIT ${limit}
    `, params);

    return rows.map((row: Record<string, unknown>) => ({
      ...row,
      campaignId: numberOf(row.campaignId),
      businessId: numberOf(row.businessId),
      createdBy: numberOf(row.createdBy),
    }));
  }

  async ads(input: { q?: unknown; status?: unknown; moderation?: unknown; limit?: unknown } = {}) {
    const q = String(input.q || "").trim().slice(0, 100);
    const status = String(input.status || "").trim();
    const moderation = String(input.moderation || "").trim();
    if (status && !AD_STATUSES.includes(status as AdCampaignStatus)) {
      throw new HttpError(400, "Filtro de estado publicitario inválido");
    }
    if (moderation && !(AD_MODERATION_STATUSES as readonly string[]).includes(moderation)) {
      throw new HttpError(400, "Filtro de moderación inválido");
    }
    const limit = limitOf(input.limit);
    const search = `%${q}%`;
    const clauses: string[] = [];
    const params: unknown[] = [q, search, search, search];
    if (status) {
      clauses.push("a.status = ?");
      params.push(status);
    }
    if (moderation) {
      clauses.push("a.moderation_status = ?");
      params.push(moderation);
    }
    const extraWhere = clauses.length ? `AND ${clauses.join(" AND ")}` : "";

    const rows = await AppDataSource.query(`
      SELECT
        a.ad_campaign_id adCampaignId,
        a.business_id businessId,
        b.business_name businessName,
        a.name,
        a.surface,
        a.objective,
        a.daily_budget dailyBudget,
        a.total_budget totalBudget,
        a.radius_km radiusKm,
        a.status,
        a.moderation_status moderationStatus,
        a.moderation_reason moderationReason,
        a.moderated_by moderatedBy,
        a.moderated_at moderatedAt,
        a.starts_at startsAt,
        a.ends_at endsAt,
        a.spent_amount spentAmount,
        a.impressions,
        a.clicks,
        a.created_by createdBy,
        a.created_at createdAt,
        a.updated_at updatedAt
      FROM ad_campaigns a
      INNER JOIN business b ON b.business_id = a.business_id
      WHERE (? = '' OR a.name LIKE ? OR b.business_name LIKE ? OR CAST(a.ad_campaign_id AS CHAR) LIKE ?)
        ${extraWhere}
      ORDER BY
        CASE a.moderation_status WHEN 'pending' THEN 0 WHEN 'rejected' THEN 1 WHEN 'approved' THEN 2 ELSE 3 END,
        a.updated_at DESC,
        a.ad_campaign_id DESC
      LIMIT ${limit}
    `, params);

    return rows.map((row: Record<string, unknown>) => ({
      ...row,
      adCampaignId: numberOf(row.adCampaignId),
      businessId: numberOf(row.businessId),
      createdBy: numberOf(row.createdBy),
      moderatedBy: row.moderatedBy == null ? null : numberOf(row.moderatedBy),
      dailyBudget: numberOf(row.dailyBudget),
      totalBudget: numberOf(row.totalBudget),
      radiusKm: row.radiusKm == null ? null : numberOf(row.radiusKm),
      spentAmount: numberOf(row.spentAmount),
      impressions: numberOf(row.impressions),
      clicks: numberOf(row.clicks),
    }));
  }

  async moderateAd(
    adCampaignId: number,
    rawDecision: string,
    rawReason: string,
    actorUserId: number,
  ) {
    this.assertId(adCampaignId, "Campaña publicitaria inválida");
    const input = normalizeAdminAdModeration(rawDecision, rawReason);

    return AppDataSource.transaction(async (manager) => {
      const repo = manager.getRepository(AdCampaign);
      const ad = await repo.findOne({
        where: { adCampaignId },
        lock: { mode: "pessimistic_write" },
      });
      if (!ad) throw new HttpError(404, "Campaña publicitaria no encontrada");
      if (ad.moderationStatus !== "pending") {
        throw new HttpError(409, "La campaña no está pendiente de moderación");
      }

      const before = this.adSnapshot(ad);
      ad.moderationStatus = input.decision;
      ad.moderationReason = input.reason;
      ad.moderatedBy = actorUserId;
      ad.moderatedAt = new Date();
      if (input.decision === "rejected") ad.status = "paused";
      await repo.save(ad);

      await this.audit(manager, {
        actorUserId,
        action: input.decision === "approved" ? "AD_MODERATION_APPROVED" : "AD_MODERATION_REJECTED",
        targetTable: "ad_campaigns",
        targetId: adCampaignId,
        before,
        after: this.adSnapshot(ad),
      });
      return ad;
    });
  }

  async setCampaignStatus(
    campaignId: number,
    rawStatus: string,
    rawReason: string,
    actorUserId: number,
  ) {
    this.assertId(campaignId, "Campaña de marketing inválida");
    const input = normalizeAdminMarketingIntervention(rawStatus, rawReason);

    return AppDataSource.transaction(async (manager) => {
      const repo = manager.getRepository(MarketingCampaign);
      const campaign = await repo.findOne({
        where: { campaignId },
        lock: { mode: "pessimistic_write" },
      });
      if (!campaign) throw new HttpError(404, "Campaña de marketing no encontrada");
      if (campaign.status === input.status) return campaign;
      if (campaign.status === "ended") throw new HttpError(409, "La campaña ya finalizó");
      if (input.status === "paused" && !(["scheduled", "active"] as MarketingCampaignStatus[]).includes(campaign.status)) {
        throw new HttpError(409, "Solo campañas programadas o activas pueden pausarse administrativamente");
      }

      const before = { status: campaign.status };
      campaign.status = input.status;
      await repo.save(campaign);
      await this.audit(manager, {
        actorUserId,
        action: input.status === "paused" ? "MARKETING_CAMPAIGN_ADMIN_PAUSED" : "MARKETING_CAMPAIGN_ADMIN_ENDED",
        targetTable: "marketing_campaigns",
        targetId: campaignId,
        before,
        after: { status: campaign.status, reason: input.reason },
      });
      return campaign;
    });
  }

  async setAdStatus(
    adCampaignId: number,
    rawStatus: string,
    rawReason: string,
    actorUserId: number,
  ) {
    this.assertId(adCampaignId, "Campaña publicitaria inválida");
    const input = normalizeAdminMarketingIntervention(rawStatus, rawReason);

    return AppDataSource.transaction(async (manager) => {
      const repo = manager.getRepository(AdCampaign);
      const ad = await repo.findOne({
        where: { adCampaignId },
        lock: { mode: "pessimistic_write" },
      });
      if (!ad) throw new HttpError(404, "Campaña publicitaria no encontrada");
      if (ad.status === input.status) return ad;
      if (ad.status === "ended") throw new HttpError(409, "La campaña publicitaria ya finalizó");
      if (input.status === "paused" && !(["pending_billing", "ready", "active"] as AdCampaignStatus[]).includes(ad.status)) {
        throw new HttpError(409, "La campaña no puede pausarse administrativamente desde su estado actual");
      }

      const before = this.adSnapshot(ad);
      ad.status = input.status;
      await repo.save(ad);
      await this.audit(manager, {
        actorUserId,
        action: input.status === "paused" ? "AD_CAMPAIGN_ADMIN_PAUSED" : "AD_CAMPAIGN_ADMIN_ENDED",
        targetTable: "ad_campaigns",
        targetId: adCampaignId,
        before,
        after: { ...this.adSnapshot(ad), reason: input.reason },
      });
      return ad;
    });
  }

  private assertId(id: number, message: string) {
    if (!Number.isInteger(id) || id <= 0) throw new HttpError(400, message);
  }

  private adSnapshot(ad: AdCampaign) {
    return {
      status: ad.status,
      moderationStatus: ad.moderationStatus,
      moderationReason: ad.moderationReason,
      moderatedBy: ad.moderatedBy,
      moderatedAt: ad.moderatedAt,
    };
  }

  private async audit(
    manager: EntityManager,
    input: {
      actorUserId: number;
      action: string;
      targetTable: string;
      targetId: number;
      before: unknown;
      after: unknown;
    },
  ) {
    const repo = manager.getRepository(AuditLogs);
    await repo.save(repo.create({
      actorUserId: input.actorUserId,
      action: input.action,
      targetTable: input.targetTable,
      targetId: input.targetId,
      beforeJson: JSON.stringify(input.before),
      afterJson: JSON.stringify(input.after),
    }));
  }
}
