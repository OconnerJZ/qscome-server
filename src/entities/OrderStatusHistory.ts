import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Orders } from "./Orders";
import { Users } from "./Users";

@Index("changed_by", ["changedBy"], {})
@Index("idx_order_status", ["orderId", "status"], {})
@Entity("order_status_history", { schema: "qscome" })
export class OrderStatusHistory {
  @PrimaryGeneratedColumn({ type: "int", name: "history_id" })
  historyId: number;

  @Column("int", { name: "order_id" })
  orderId: number;

  @Column("varchar", { name: "status", length: 50 })
  status: string;

  @Column("text", { name: "note", nullable: true })
  note: string | null;

  @Column("int", { name: "changed_by", nullable: true })
  changedBy: number | null;

  @Column("datetime", {
    name: "created_at",
    nullable: true,
    default: () => "CURRENT_TIMESTAMP",
  })
  createdAt: Date | null;

  @ManyToOne(() => Orders, (orders) => orders.orderStatusHistories, {
    onDelete: "CASCADE",
    onUpdate: "RESTRICT",
  })
  @JoinColumn([{ name: "order_id", referencedColumnName: "orderId" }])
  order: Orders;

  @ManyToOne(() => Users, (users) => users.orderStatusHistories, {
    onDelete: "SET NULL",
    onUpdate: "RESTRICT",
  })
  @JoinColumn([{ name: "changed_by", referencedColumnName: "userId" }])
  changedBy2: Users;
}
