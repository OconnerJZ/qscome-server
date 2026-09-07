import { Column, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

export type FeatureControlScopeType = "global" | "plan" | "business";
export type FeatureControlMode = "enabled" | "read_only" | "disabled";

@Entity("feature_control_overrides", { schema: "qscome" })
@Index("uq_feature_control_override", ["featureKey", "scopeType", "scopeValue"], { unique: true })
@Index("idx_feature_control_scope", ["scopeType", "scopeValue"])
export class FeatureControlOverride {
  @PrimaryGeneratedColumn({ type: "int", name: "override_id" })
  overrideId!: number;

  @Column("varchar", { name: "feature_key", length: 100 })
  featureKey!: string;

  @Column("enum", {
    name: "scope_type",
    enum: ["global", "plan", "business"],
  })
  scopeType!: FeatureControlScopeType;

  @Column("varchar", { name: "scope_value", length: 100 })
  scopeValue!: string;

  @Column("enum", {
    name: "mode",
    enum: ["enabled", "read_only", "disabled"],
  })
  mode!: FeatureControlMode;

  @Column("varchar", { name: "reason", nullable: true, length: 500 })
  reason!: string | null;

  @Column("int", { name: "updated_by", nullable: true })
  updatedBy!: number | null;

  @Column("datetime", { name: "created_at", default: () => "CURRENT_TIMESTAMP" })
  createdAt!: Date;

  @Column("datetime", {
    name: "updated_at",
    default: () => "CURRENT_TIMESTAMP",
    onUpdate: "CURRENT_TIMESTAMP",
  })
  updatedAt!: Date;
}
