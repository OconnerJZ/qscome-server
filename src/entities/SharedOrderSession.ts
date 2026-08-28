import { Column, Entity, Index, OneToMany, PrimaryColumn, VersionColumn } from "typeorm";
import { SharedOrderParticipant } from "./SharedOrderParticipant";
import { SharedOrderItem } from "./SharedOrderItem";
import { SharedOrderSuborder } from "./SharedOrderSuborder";

export type SharedOrderStatus = "open" | "locked" | "submitted" | "cancelled" | "expired";

@Entity("shared_order_sessions", { schema: "qscome" })
@Index("idx_shared_order_host", ["hostUserId"])
@Index("idx_shared_order_code", ["codeHash"], { unique: true })
@Index("idx_shared_order_token", ["linkTokenHash"], { unique: true })
export class SharedOrderSession {
  @PrimaryColumn("char", { name: "session_id", length: 36 }) sessionId!: string;
  @Column("int", { name: "host_user_id" }) hostUserId!: number;
  @Column("varchar", { name: "title", nullable: true, length: 100 }) title!: string | null;
  @Column("enum", { name: "status", enum: ["open", "locked", "submitted", "cancelled", "expired"], default: () => "'open'" }) status!: SharedOrderStatus;
  @Column("char", { name: "code_hash", length: 64 }) codeHash!: string;
  @Column("char", { name: "link_token_hash", length: 64 }) linkTokenHash!: string;
  @Column("tinyint", { name: "code_length" }) codeLength!: number;
  @VersionColumn({ name: "version", type: "int", default: 1 }) version!: number;
  @Column("datetime", { name: "expires_at" }) expiresAt!: Date;
  @Column("datetime", { name: "locked_at", nullable: true }) lockedAt!: Date | null;
  @Column("datetime", { name: "submitted_at", nullable: true }) submittedAt!: Date | null;
  @Column("datetime", { name: "created_at", default: () => "CURRENT_TIMESTAMP" }) createdAt!: Date;
  @Column("datetime", { name: "updated_at", default: () => "CURRENT_TIMESTAMP", onUpdate: "CURRENT_TIMESTAMP" }) updatedAt!: Date;
  @OneToMany(() => SharedOrderParticipant, (participant) => participant.session) participants!: SharedOrderParticipant[];
  @OneToMany(() => SharedOrderItem, (item) => item.session) items!: SharedOrderItem[];
  @OneToMany(() => SharedOrderSuborder, (suborder) => suborder.session) suborders!: SharedOrderSuborder[];
}
