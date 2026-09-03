import { Column, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

@Entity("shared_order_audit_events", { schema: "qscome" })
@Index("idx_shared_audit_session", ["sessionId"])
@Index("idx_shared_audit_created", ["createdAt"])
export class SharedOrderAuditEvent {
  @PrimaryGeneratedColumn({ type: "bigint", name: "audit_id" }) auditId!: number;
  @Column("char", { name: "session_id", length: 36 }) sessionId!: string;
  @Column("int", { name: "actor_user_id", nullable: true }) actorUserId!: number | null;
  @Column("varchar", { name: "action", length: 80 }) action!: string;
  @Column("int", { name: "session_version", nullable: true }) sessionVersion!: number | null;
  @Column("longtext", { name: "metadata_json", nullable: true }) metadataJson!: string | null;
  @Column("datetime", { name: "created_at", default: () => "CURRENT_TIMESTAMP" }) createdAt!: Date;
}
