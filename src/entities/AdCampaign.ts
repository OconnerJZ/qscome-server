import { Column, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

export type AdCampaignStatus = "draft" | "pending_billing" | "ready" | "active" | "paused" | "ended";
export type AdSurface = "explore" | "hero";

@Entity("ad_campaigns", { schema: "qscome" })
@Index("idx_ad_campaign_business", ["businessId", "status"])
@Index("idx_ad_campaign_serving", ["surface", "status", "startsAt", "endsAt"])
export class AdCampaign {
  @PrimaryGeneratedColumn({ type: "int", name: "ad_campaign_id" }) adCampaignId!: number;
  @Column("int", { name: "business_id" }) businessId!: number;
  @Column("varchar", { name: "name", length: 120 }) name!: string;
  @Column("enum", { name: "surface", enum: ["explore", "hero"], default: () => "'explore'" }) surface!: AdSurface;
  @Column("varchar", { name: "objective", length: 40, default: () => "'orders'" }) objective!: string;
  @Column("decimal", { name: "daily_budget", precision: 10, scale: 2 }) dailyBudget!: string;
  @Column("decimal", { name: "total_budget", precision: 10, scale: 2 }) totalBudget!: string;
  @Column("decimal", { name: "radius_km", precision: 7, scale: 2, nullable: true }) radiusKm!: string | null;
  @Column("enum", { name: "status", enum: ["draft", "pending_billing", "ready", "active", "paused", "ended"], default: () => "'draft'" }) status!: AdCampaignStatus;
  @Column("datetime", { name: "starts_at" }) startsAt!: Date;
  @Column("datetime", { name: "ends_at" }) endsAt!: Date;
  @Column("decimal", { name: "spent_amount", precision: 10, scale: 2, default: 0 }) spentAmount!: string;
  @Column("int", { name: "impressions", default: 0 }) impressions!: number;
  @Column("int", { name: "clicks", default: 0 }) clicks!: number;
  @Column("int", { name: "created_by" }) createdBy!: number;
  @Column("datetime", { name: "created_at", default: () => "CURRENT_TIMESTAMP" }) createdAt!: Date;
  @Column("datetime", { name: "updated_at", default: () => "CURRENT_TIMESTAMP", onUpdate: "CURRENT_TIMESTAMP" }) updatedAt!: Date;
}
