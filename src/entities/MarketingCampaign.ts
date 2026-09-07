import { Column, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

export type MarketingCampaignStatus = "draft" | "scheduled" | "active" | "paused" | "ended";
export type MarketingAudience = "all" | "new" | "returning" | "frequent" | "inactive_90";
export type MarketingObjective = "acquisition" | "retention" | "reactivation";

@Entity("marketing_campaigns", { schema: "qscome" })
@Index("idx_marketing_campaign_business", ["businessId", "status"])
export class MarketingCampaign {
  @PrimaryGeneratedColumn({ type: "int", name: "campaign_id" }) campaignId!: number;
  @Column("int", { name: "business_id" }) businessId!: number;
  @Column("varchar", { name: "name", length: 120 }) name!: string;
  @Column("varchar", { name: "message", length: 280 }) message!: string;
  @Column("enum", { name: "objective", enum: ["acquisition", "retention", "reactivation"] }) objective!: MarketingObjective;
  @Column("enum", { name: "audience", enum: ["all", "new", "returning", "frequent", "inactive_90"], default: () => "'all'" }) audience!: MarketingAudience;
  @Column("enum", { name: "status", enum: ["draft", "scheduled", "active", "paused", "ended"], default: () => "'draft'" }) status!: MarketingCampaignStatus;
  @Column("datetime", { name: "starts_at", nullable: true }) startsAt!: Date | null;
  @Column("datetime", { name: "ends_at", nullable: true }) endsAt!: Date | null;
  @Column("int", { name: "created_by" }) createdBy!: number;
  @Column("datetime", { name: "created_at", default: () => "CURRENT_TIMESTAMP" }) createdAt!: Date;
  @Column("datetime", { name: "updated_at", default: () => "CURRENT_TIMESTAMP", onUpdate: "CURRENT_TIMESTAMP" }) updatedAt!: Date;
}
