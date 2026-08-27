import { Column, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

@Entity("order_audit_events", { schema: "qscome" })
@Index("idx_order_audit_order", ["orderId"])
@Index("idx_order_audit_action", ["action"])
@Index("idx_order_audit_created", ["createdAt"])
export class OrderAuditEvent {
  @PrimaryGeneratedColumn({ type: "bigint", name: "audit_id" })
  auditId!: number;

  @Column("int", { name: "order_id" })
  orderId!: number;

  @Column("int", { name: "business_id", nullable: true })
  businessId!: number | null;

  @Column("int", { name: "actor_user_id", nullable: true })
  actorUserId!: number | null;

  @Column("varchar", { name: "actor_role", nullable: true, length: 40 })
  actorRole!: string | null;

  @Column("varchar", { name: "action", length: 80 })
  action!: string;

  @Column("varchar", { name: "entity_type", length: 40, default: "order" })
  entityType!: string;

  @Column("varchar", { name: "entity_id", nullable: true, length: 80 })
  entityId!: string | null;

  @Column("int", { name: "order_version", nullable: true })
  orderVersion!: number | null;

  @Column("longtext", { name: "metadata_json", nullable: true })
  metadataJson!: string | null;

  @Column("varchar", { name: "ip_address", nullable: true, length: 64 })
  ipAddress!: string | null;

  @Column("varchar", { name: "user_agent", nullable: true, length: 255 })
  userAgent!: string | null;

  @Column("datetime", { name: "created_at", default: () => "CURRENT_TIMESTAMP" })
  createdAt!: Date;
}
