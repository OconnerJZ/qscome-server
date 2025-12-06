import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { OrderDetails } from "./OrderDetails";
import { MenuOptions } from "./MenuOptions";

@Index("order_detail_id", ["orderDetailId"], {})
@Index("option_id", ["optionId"], {})
@Entity("order_detail_options", { schema: "qscome" })
export class OrderDetailOptions {
  @PrimaryGeneratedColumn({ type: "int", name: "order_detail_option_id" })
  orderDetailOptionId: number;

  @Column("int", { name: "order_detail_id" })
  orderDetailId: number;

  @Column("int", { name: "option_id" })
  optionId: number;

  @ManyToOne(
    () => OrderDetails,
    (orderDetails) => orderDetails.orderDetailOptions,
    { onDelete: "RESTRICT", onUpdate: "RESTRICT" }
  )
  @JoinColumn([
    { name: "order_detail_id", referencedColumnName: "orderDetailId" },
  ])
  orderDetail: OrderDetails;

  @ManyToOne(
    () => MenuOptions,
    (menuOptions) => menuOptions.orderDetailOptions,
    { onDelete: "RESTRICT", onUpdate: "RESTRICT" }
  )
  @JoinColumn([{ name: "option_id", referencedColumnName: "optionId" }])
  option: MenuOptions;
}
