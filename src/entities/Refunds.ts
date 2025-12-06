import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Payments } from "./Payments";

@Index("fk_refunds_payments", ["paymentId"], {})
@Entity("refunds", { schema: "qscome" })
export class Refunds {
  @PrimaryGeneratedColumn({ type: "int", name: "refund_id" })
  refundId: number;

  @Column("int", { name: "payment_id" })
  paymentId: number;

  @Column("decimal", { name: "amount", precision: 10, scale: 2 })
  amount: string;

  @Column("text", { name: "reason", nullable: true })
  reason: string | null;

  @Column("enum", {
    name: "status",
    nullable: true,
    enum: ["pending", "completed", "failed"],
    default: () => "'pending'",
  })
  status: "pending" | "completed" | "failed" | null;

  @Column("datetime", {
    name: "created_at",
    nullable: true,
    default: () => "CURRENT_TIMESTAMP",
  })
  createdAt: Date | null;

  @ManyToOne(() => Payments, (payments) => payments.refunds, {
    onDelete: "RESTRICT",
    onUpdate: "RESTRICT",
  })
  @JoinColumn([{ name: "payment_id", referencedColumnName: "paymentId" }])
  payment: Payments;
}
