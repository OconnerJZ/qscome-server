import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Orders } from "./Orders";
import { Users } from "./Users";
import { Refunds } from "./Refunds";

@Index("user_id", ["userId"], {})
@Index("fk_payments_orders", ["orderId"], {})
@Entity("payments", { schema: "qscome" })
export class Payments {
  @PrimaryGeneratedColumn({ type: "int", name: "payment_id" })
  paymentId!: number;

  @Column("int", { name: "user_id", nullable: true })
  userId!: number | null;

  @Column("decimal", {
    name: "amount",
    nullable: true,
    precision: 10,
    scale: 2,
  })
  amount!: string | null;

  @Column("datetime", { name: "payment_date", nullable: true })
  paymentDate!: Date | null;

  @Column("datetime", {
    name: "created_at",
    nullable: true,
    default: () => "CURRENT_TIMESTAMP",
  })
  createdAt!: Date | null;

  @Column("datetime", {
    name: "updated_at",
    nullable: true,
    default: () => "CURRENT_TIMESTAMP",
  })
  updatedAt!: Date | null;

  @Column("enum", {
    name: "payment_method",
    nullable: true,
    enum: ["card", "wallet", "cash"],
    default: () => "'card'",
  })
  paymentMethod!: "card" | "wallet" | "cash" | null;

  @Column("enum", {
    name: "status",
    nullable: true,
    enum: ["pending", "completed", "failed"],
    default: () => "'pending'",
  })
  status!: "pending" | "completed" | "failed" | null;

  @Column("int", { name: "order_id", nullable: true })
  orderId!: number | null;

  @Column("varchar", { name: "gateway_id", nullable: true, length: 255 })
  gatewayId!: string | null;

  @Column("longtext", { name: "gateway_response", nullable: true })
  gatewayResponse!: string | null;

  @Column("varchar", {
    name: "currency",
    nullable: true,
    length: 10,
    default: () => "'MXN'",
  })
  currency!: string | null;

  @ManyToOne(() => Orders, (orders) => orders.payments, {
    onDelete: "RESTRICT",
    onUpdate: "RESTRICT",
  })
  @JoinColumn([{ name: "order_id", referencedColumnName: "orderId" }])
  order!: Orders;

  @ManyToOne(() => Users, (users) => users.payments, {
    onDelete: "RESTRICT",
    onUpdate: "RESTRICT",
  })
  @JoinColumn([{ name: "user_id", referencedColumnName: "userId" }])
  user!: Users;

  @OneToMany(() => Refunds, (refunds) => refunds.payment)
  refunds!: Refunds[];
}
