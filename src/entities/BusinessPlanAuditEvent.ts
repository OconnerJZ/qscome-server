import { Column, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

@Entity("business_plan_audit_events", { schema: "qscome" })
@Index("idx_business_plan_audit", ["businessId", "createdAt"])
export class BusinessPlanAuditEvent {
  @PrimaryGeneratedColumn({ type: "bigint", name: "audit_id" }) auditId!: number;
  @Column("int", { name: "business_id" }) businessId!: number;
  @Column("int", { name: "actor_user_id", nullable: true }) actorUserId!: number | null;
  @Column("varchar", { name: "action", length: 80 }) action!: string;
  @Column("varchar", { name: "previous_plan", nullable: true, length: 30 }) previousPlan!: string | null;
  @Column("varchar", { name: "next_plan", nullable: true, length: 30 }) nextPlan!: string | null;
  @Column("longtext", { name: "metadata_json", nullable: true }) metadataJson!: string | null;
  @Column("datetime", { name: "created_at", default: () => "CURRENT_TIMESTAMP" }) createdAt!: Date;
}
