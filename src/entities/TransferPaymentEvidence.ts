import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { OrderTransferPayment } from "./OrderTransferPayment";
import { Users } from "./Users";

@Entity("transfer_payment_evidences", { schema: "qscome" })
@Index("idx_transfer_evidence_report", ["transferPaymentId"])
@Index("idx_transfer_evidence_order", ["orderId"])
export class TransferPaymentEvidence {
  @PrimaryGeneratedColumn({ type: "int", name: "evidence_id" }) evidenceId!: number;
  @Column("int", { name: "transfer_payment_id" }) transferPaymentId!: number;
  @Column("int", { name: "order_id" }) orderId!: number;
  @Column("int", { name: "submitted_by" }) submittedBy!: number;
  @Column("varchar", { name: "storage_key", length: 255 }) storageKey!: string;
  @Column("varchar", { name: "original_name", nullable: true, length: 255 }) originalName!: string | null;
  @Column("varchar", { name: "mime_type", length: 80 }) mimeType!: string;
  @Column("int", { name: "file_size" }) fileSize!: number;
  @Column("datetime", { name: "created_at", default: () => "CURRENT_TIMESTAMP" }) createdAt!: Date;

  @ManyToOne(() => OrderTransferPayment, (payment) => payment.evidences, { onDelete: "CASCADE" })
  @JoinColumn([{ name: "transfer_payment_id", referencedColumnName: "transferPaymentId" }]) transferPayment!: OrderTransferPayment;
  @ManyToOne(() => Users, { onDelete: "RESTRICT" })
  @JoinColumn([{ name: "submitted_by", referencedColumnName: "userId" }]) submitter!: Users;
}
