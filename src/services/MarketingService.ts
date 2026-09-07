import { AppDataSource } from "../utils/db";
import { MarketingCampaign, MarketingAudience, MarketingCampaignStatus, MarketingObjective } from "../entities/MarketingCampaign";
import { AdCampaign, AdSurface } from "../entities/AdCampaign";
import { BusinessPlanService } from "./BusinessPlanService";
import { HttpError } from "../utils/httpError";

const CAMPAIGN_STATUSES: MarketingCampaignStatus[] = ["draft", "scheduled", "active", "paused", "ended"];
const AUDIENCES: MarketingAudience[] = ["all", "new", "returning", "frequent", "inactive_90"];
const OBJECTIVES: MarketingObjective[] = ["acquisition", "retention", "reactivation"];
const SURFACES: AdSurface[] = ["explore", "hero"];

export class MarketingService {
  private readonly plans = new BusinessPlanService();
  private readonly campaigns = AppDataSource.getRepository(MarketingCampaign);
  private readonly ads = AppDataSource.getRepository(AdCampaign);

  private async requireFeature(businessId: number, key: string, message: string) {
    const capabilities = await this.plans.resolveCapabilities(businessId);
    const feature = capabilities.features.find((item) => item.key === key);
    if (!feature?.included || feature.status !== "available") throw new HttpError(403, message);
    return capabilities;
  }

  async overview(businessId: number) {
    const capabilities = await this.plans.resolveCapabilities(businessId);
    const marketing = capabilities.features.find((item) => item.key === "marketing.center");
    const segments = capabilities.features.find((item) => item.key === "customer.segments");
    const [campaigns, ads] = await Promise.all([
      marketing?.included && marketing.status === "available"
        ? this.campaigns.find({ where: { businessId }, order: { createdAt: "DESC" }, take: 50 })
        : Promise.resolve([]),
      this.ads.find({ where: { businessId }, order: { createdAt: "DESC" }, take: 50 }),
    ]);
    return {
      marketing: { available: Boolean(marketing?.included && marketing.status === "available"), campaigns },
      segments: { available: Boolean(segments?.included && segments.status === "available") },
      ads: {
        available: true,
        commercialModel: "separate_product",
        billingEnabled: false,
        servingEnabled: false,
        campaigns: ads,
        note: "qsCome Ads es independiente de la suscripción. Sin billing configurado, las campañas pueden prepararse pero no activan gasto ni entrega automáticamente.",
      },
    };
  }

  async createCampaign(businessId: number, actorUserId: number, input: any) {
    await this.requireFeature(businessId, "marketing.center", "Marketing Center requiere Nivel 1 o superior");
    const name = String(input?.name || "").trim();
    const message = String(input?.message || "").trim();
    const objective = input?.objective as MarketingObjective;
    const audience = (input?.audience || "all") as MarketingAudience;
    if (name.length < 3 || name.length > 120) throw new HttpError(400, "Nombre de campaña inválido");
    if (message.length < 3 || message.length > 280) throw new HttpError(400, "Mensaje de campaña inválido");
    if (!OBJECTIVES.includes(objective)) throw new HttpError(400, "Objetivo inválido");
    if (!AUDIENCES.includes(audience)) throw new HttpError(400, "Audiencia inválida");
    if (audience !== "all") await this.requireFeature(businessId, "customer.segments", "Los segmentos de clientes requieren Nivel 2 o superior");
    const startsAt = input?.startsAt ? new Date(input.startsAt) : null;
    const endsAt = input?.endsAt ? new Date(input.endsAt) : null;
    if (startsAt && Number.isNaN(startsAt.getTime())) throw new HttpError(400, "Fecha de inicio inválida");
    if (endsAt && Number.isNaN(endsAt.getTime())) throw new HttpError(400, "Fecha de fin inválida");
    if (startsAt && endsAt && endsAt <= startsAt) throw new HttpError(400, "La fecha final debe ser posterior al inicio");
    return this.campaigns.save(this.campaigns.create({ businessId, createdBy: actorUserId, name, message, objective, audience, startsAt, endsAt, status: "draft" }));
  }

  async setCampaignStatus(businessId: number, campaignId: number, status: MarketingCampaignStatus) {
    await this.requireFeature(businessId, "marketing.center", "Marketing Center requiere Nivel 1 o superior");
    if (!CAMPAIGN_STATUSES.includes(status)) throw new HttpError(400, "Estado inválido");
    const campaign = await this.campaigns.findOne({ where: { businessId, campaignId } });
    if (!campaign) throw new HttpError(404, "Campaña no encontrada");
    if (["scheduled", "active"].includes(status) && campaign.audience !== "all") {
      await this.requireFeature(
        businessId,
        "customer.segments",
        "Esta campaña usa una audiencia segmentada y requiere Nivel 2 o superior para programarse o activarse",
      );
    }
    if (["scheduled", "active"].includes(status) && (!campaign.startsAt || !campaign.endsAt)) throw new HttpError(409, "La campaña necesita inicio y fin antes de programarse o activarse");
    campaign.status = status;
    return this.campaigns.save(campaign);
  }

  async segments(businessId: number) {
    const capabilities = await this.requireFeature(businessId, "customer.segments", "Los segmentos de clientes requieren Nivel 2 o superior");
    const historyDays = Number(capabilities.limits.analyticsHistoryDays || 365);
    const rows = await AppDataSource.query(`
      SELECT
        COUNT(*) all_customers,
        SUM(order_count = 1) new_customers,
        SUM(order_count >= 2) returning_customers,
        SUM(order_count >= 4) frequent_customers,
        SUM(days_since_last > 90) inactive_90
      FROM (
        SELECT user_id, COUNT(*) order_count, DATEDIFF(NOW(), MAX(created_at)) days_since_last
        FROM orders
        WHERE business_id = ? AND status = 'completed' AND user_id IS NOT NULL
          AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
        GROUP BY user_id
      ) audience
    `, [businessId, historyDays]);
    const row = rows?.[0] || {};
    const n = (v: unknown) => Number(v || 0);
    return {
      historyDays,
      audiences: [
        { key: "all", label: "Todos los clientes observados", count: n(row.all_customers) },
        { key: "new", label: "Una compra observada", count: n(row.new_customers) },
        { key: "returning", label: "Recurrentes (2+)", count: n(row.returning_customers) },
        { key: "frequent", label: "Frecuentes (4+)", count: n(row.frequent_customers) },
        { key: "inactive_90", label: "Inactivos 90+ días", count: n(row.inactive_90) },
      ],
      privacyNote: "Los segmentos devuelven conteos agregados; no exponen identidades ni datos de contacto.",
    };
  }

  async createAd(businessId: number, actorUserId: number, input: any) {
    const name = String(input?.name || "").trim();
    const surface = (input?.surface || "explore") as AdSurface;
    const dailyBudget = Number(input?.dailyBudget);
    const totalBudget = Number(input?.totalBudget);
    const radiusKm = input?.radiusKm == null || input.radiusKm === "" ? null : Number(input.radiusKm);
    const startsAt = new Date(input?.startsAt);
    const endsAt = new Date(input?.endsAt);
    if (name.length < 3 || name.length > 120) throw new HttpError(400, "Nombre de anuncio inválido");
    if (!SURFACES.includes(surface)) throw new HttpError(400, "Superficie publicitaria inválida");
    if (!Number.isFinite(dailyBudget) || dailyBudget <= 0 || !Number.isFinite(totalBudget) || totalBudget < dailyBudget) throw new HttpError(400, "Presupuesto inválido");
    if (radiusKm !== null && (!Number.isFinite(radiusKm) || radiusKm <= 0 || radiusKm > 200)) throw new HttpError(400, "Radio inválido");
    if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime()) || endsAt <= startsAt) throw new HttpError(400, "Rango de fechas inválido");
    return this.ads.save(this.ads.create({ businessId, createdBy: actorUserId, name, surface, objective: String(input?.objective || "orders").slice(0, 40), dailyBudget: dailyBudget.toFixed(2), totalBudget: totalBudget.toFixed(2), radiusKm: radiusKm === null ? null : radiusKm.toFixed(2), startsAt, endsAt, status: "draft", spentAmount: "0.00", impressions: 0, clicks: 0 }));
  }

  async submitAd(businessId: number, adCampaignId: number) {
    const ad = await this.ads.findOne({ where: { businessId, adCampaignId } });
    if (!ad) throw new HttpError(404, "Campaña publicitaria no encontrada");
    if (!(["draft", "paused"] as string[]).includes(ad.status)) throw new HttpError(409, "La campaña no puede enviarse desde su estado actual");
    ad.status = "pending_billing";
    return this.ads.save(ad);
  }

  async pauseAd(businessId: number, adCampaignId: number) {
    const ad = await this.ads.findOne({ where: { businessId, adCampaignId } });
    if (!ad) throw new HttpError(404, "Campaña publicitaria no encontrada");
    if (ad.status === "ended") throw new HttpError(409, "Una campaña finalizada no puede pausarse");
    ad.status = "paused";
    return this.ads.save(ad);
  }

  async sponsored(surface: AdSurface = "explore") {
    if (!SURFACES.includes(surface)) throw new HttpError(400, "Superficie inválida");
    // No campaign reaches active automatically while billing/approval is disabled.
    return this.ads.createQueryBuilder("ad")
      .innerJoinAndSelect("business", "b", "b.business_id = ad.business_id")
      .where("ad.surface = :surface", { surface })
      .andWhere("ad.status = 'active'")
      .andWhere("ad.starts_at <= NOW() AND ad.ends_at >= NOW()")
      .select(["ad.ad_campaign_id AS adCampaignId", "ad.business_id AS businessId", "ad.surface AS surface", "b.business_name AS businessName"])
      .orderBy("ad.ad_campaign_id", "DESC")
      .limit(6)
      .getRawMany();
  }
}
