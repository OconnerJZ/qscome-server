import { Column, Entity, Index, PrimaryGeneratedColumn, VersionColumn } from "typeorm";
import type { BusinessPlanCode } from "../security/businessPlans";

export type BusinessPlanSubscriptionStatus = "active" | "trialing" | "past_due" | "cancelled";

@Entity("business_plan_subscriptions", { schema: "qscome" })
@Index("uq_business_plan_subscription", ["businessId"], { unique: true })
export class BusinessPlanSubscription {
  @PrimaryGeneratedColumn({ type: "int", name: "business_subscription_id" })
  businessSubscriptionId!: number;

  @Column("int", { name: "business_id" })
  businessId!: number;

  // The database column keeps its original name for a safe, non-destructive
  // migration. Semantically this is now the persistent/base plan.
  @Column("varchar", { name: "plan_code", length: 30, default: "free" })
  basePlanCode!: BusinessPlanCode;

  @Column("enum", {
    name: "status",
    enum: ["active", "trialing", "past_due", "cancelled"],
    default: () => "'active'",
  })
  status!: BusinessPlanSubscriptionStatus;

  @Column("varchar", { name: "source", length: 30, default: "system" })
  source!: "system" | "admin" | "billing";

  @Column("int", { name: "assigned_by", nullable: true })
  assignedBy!: number | null;

  @Column("datetime", { name: "starts_at", default: () => "CURRENT_TIMESTAMP" })
  startsAt!: Date;

  // Reserved for the lifecycle of the base subscription. Trials use their own
  // explicit dates so expiry never destroys the base plan.
  @Column("datetime", { name: "ends_at", nullable: true })
  endsAt!: Date | null;

  @Column("varchar", { name: "trial_plan_code", length: 30, nullable: true })
  trialPlanCode!: BusinessPlanCode | null;

  @Column("datetime", { name: "trial_starts_at", nullable: true })
  trialStartsAt!: Date | null;

  @Column("datetime", { name: "trial_ends_at", nullable: true })
  trialEndsAt!: Date | null;

  @VersionColumn({ name: "version", type: "int", default: 1 })
  version!: number;

  @Column("datetime", { name: "created_at", default: () => "CURRENT_TIMESTAMP" })
  createdAt!: Date;

  @Column("datetime", {
    name: "updated_at",
    default: () => "CURRENT_TIMESTAMP",
    onUpdate: "CURRENT_TIMESTAMP",
  })
  updatedAt!: Date;
}
