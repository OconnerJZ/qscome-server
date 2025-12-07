import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
} from "typeorm";
import { Orders } from "./Orders";
import { Menus } from "./Menus";
import { OrderDetailOptions } from "./OrderDetailOptions";

@Index("order_id", ["orderId"], {})
@Index("menu_id", ["menuId"], {})
@Entity("order_details", { schema: "qscome" })
export class OrderDetails {
  @Column("int", { primary: true, name: "order_detail_id" })
  orderDetailId!: number;

  @Column("int", { name: "order_id", nullable: true })
  orderId!: number | null;

  @Column("int", { name: "menu_id", nullable: true })
  menuId!: number | null;

  @Column("int", { name: "quantity", nullable: true })
  quantity!: number | null;

  @Column("decimal", {
    name: "subtotal",
    nullable: true,
    precision: 10,
    scale: 2,
  })
  subtotal!: string | null;

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

  @Column("text", { name: "notes", nullable: true })
  notes!: string | null;

  @ManyToOne(() => Orders, (orders) => orders.orderDetails, {
    onDelete: "RESTRICT",
    onUpdate: "RESTRICT",
  })
  @JoinColumn([{ name: "order_id", referencedColumnName: "orderId" }])
  order!: Orders;

  @ManyToOne(() => Menus, (menus) => menus.orderDetails, {
    onDelete: "RESTRICT",
    onUpdate: "RESTRICT",
  })
  @JoinColumn([{ name: "menu_id", referencedColumnName: "menuId" }])
  menu!: Menus;

  @OneToMany(
    () => OrderDetailOptions,
    (orderDetailOptions) => orderDetailOptions.orderDetail
  )
  orderDetailOptions!: OrderDetailOptions[];
}
