import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany, OneToOne, PrimaryGeneratedColumn, VersionColumn } from "typeorm";
import { Orders } from "./Orders";
import { Users } from "./Users";
import { TransferPaymentEvidence } from "./TransferPaymentEvidence";

export type TransferReviewStatus = "reported" | "reviewed" | "requires_clarification";

@Entity("order_transfer_payments", { schema: "qscome" })
@Index("uq_transfer_payment_order", ["orderId"], { unique: true })
export class OrderTransferPayment {
  @PrimaryGeneratedColumn({ type: "int", name: "transfer_payment_id" })
  transferPaymentId!: number;

  @Column("int", { name: "order_id" }) orderId!: number;
  @Column("int", { name: "customer_user_id" }) customerUserId!: number;
  @Column("enum", { name: "review_status", enum: ["reported", "reviewed", "requires_clarification"], default: () => "'reported'" })
  reviewStatus!: TransferReviewStatus;
  @Column("datetime", { name: "client_confirmed_at" }) clientConfirmedAt!: Date;
  @Column("datetime", { name: "latest_evidence_at" }) latestEvidenceAt!: Date;
  @Column("int", { name: "reviewed_by", nullable: true }) reviewedBy!: number | null;
  @Column("datetime", { name: "reviewed_at", nullable: true }) reviewedAt!: Date | null;
  @Column("text", { name: "owner_message", nullable: true }) ownerMessage!: string | null;
  @VersionColumn({ name: "version", type: "int", default: 1 }) version!: number;
  @Column("datetime", { name: "created_at", default: () => "CURRENT_TIMESTAMP" }) createdAt!: Date;
  @Column("datetime", { name: "updated_at", default: () => "CURRENT_TIMESTAMP", onUpdate: "CURRENT_TIMESTAMP" }) updatedAt!: Date;

  @OneToOne(() => Orders, (order) => order.transferPayment, { onDelete: "CASCADE" })
  @JoinColumn([{ name: "order_id", referencedColumnName: "orderId" }]) order!: Orders;
  @ManyToOne(() => Users, { onDelete: "RESTRICT" })
  @JoinColumn([{ name: "customer_user_id", referencedColumnName: "userId" }]) customer!: Users;
  @ManyToOne(() => Users, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn([{ name: "reviewed_by", referencedColumnName: "userId" }]) reviewer!: Users | null;
  @OneToMany(() => TransferPaymentEvidence, (evidence) => evidence.transferPayment)
  evidences!: TransferPaymentEvidence[];
}
