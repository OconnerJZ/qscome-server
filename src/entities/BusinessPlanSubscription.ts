import { Column, Entity, Index, PrimaryGeneratedColumn, VersionColumn } from "typeorm";
import type { BusinessPlanCode } from "../security/businessPlans";

@Entity("business_plan_subscriptions", { schema: "qscome" })
@Index("uq_business_plan_subscription", ["businessId"], { unique: true })
export class BusinessPlanSubscription {
  @PrimaryGeneratedColumn({ type: "int", name: "business_subscription_id" }) businessSubscriptionId!: number;
  @Column("int", { name: "business_id" }) businessId!: number;
  @Column("varchar", { name: "plan_code", length: 30, default: "free" }) planCode!: BusinessPlanCode;
  @Column("enum", { name: "status", enum: ["active", "trialing", "past_due", "cancelled"], default: () => "'active'" }) status!: "active" | "trialing" | "past_due" | "cancelled";
  @Column("varchar", { name: "source", length: 30, default: "system" }) source!: "system" | "admin" | "billing";
  @Column("int", { name: "assigned_by", nullable: true }) assignedBy!: number | null;
  @Column("datetime", { name: "starts_at", default: () => "CURRENT_TIMESTAMP" }) startsAt!: Date;
  @Column("datetime", { name: "ends_at", nullable: true }) endsAt!: Date | null;
  @VersionColumn({ name: "version", type: "int", default: 1 }) version!: number;
  @Column("datetime", { name: "created_at", default: () => "CURRENT_TIMESTAMP" }) createdAt!: Date;
  @Column("datetime", { name: "updated_at", default: () => "CURRENT_TIMESTAMP", onUpdate: "CURRENT_TIMESTAMP" }) updatedAt!: Date;
}
