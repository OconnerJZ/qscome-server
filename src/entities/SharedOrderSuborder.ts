import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { SharedOrderSession } from "./SharedOrderSession";
import { Orders } from "./Orders";

@Entity("shared_order_suborders", { schema: "qscome" })
@Index("uq_shared_suborder_business", ["sessionId", "businessId"], { unique: true })
export class SharedOrderSuborder {
  @PrimaryGeneratedColumn({ type: "int", name: "shared_suborder_id" }) sharedSuborderId!: number;
  @Column("char", { name: "session_id", length: 36 }) sessionId!: string;
  @Column("int", { name: "business_id" }) businessId!: number;
  @Column("int", { name: "order_id" }) orderId!: number;
  @ManyToOne(() => SharedOrderSession, (session) => session.suborders, { onDelete: "CASCADE" })
  @JoinColumn([{ name: "session_id", referencedColumnName: "sessionId" }]) session!: SharedOrderSession;
  @ManyToOne(() => Orders, { onDelete: "RESTRICT" })
  @JoinColumn([{ name: "order_id", referencedColumnName: "orderId" }]) order!: Orders;
}
