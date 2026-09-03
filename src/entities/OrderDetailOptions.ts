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
import { MenuOptionChoices } from "./MenuOptionChoices";

export type OrderModifierState = "selected" | "removed";

@Index("order_detail_id", ["orderDetailId"], {})
@Index("option_id", ["optionId"], {})
@Index("choice_id", ["choiceId"], {})
@Entity("order_detail_options", { schema: "qscome" })
export class OrderDetailOptions {
  @PrimaryGeneratedColumn({ type: "int", name: "order_detail_option_id" })
  orderDetailOptionId!: number;

  @Column("int", { name: "order_detail_id" })
  orderDetailId!: number;

  // Legacy standalone option. New modifier selections use choice_id instead.
  @Column("int", { name: "option_id", nullable: true })
  optionId!: number | null;

  @Column("int", { name: "choice_id", nullable: true })
  choiceId!: number | null;

  // Historical snapshot. These values remain stable even if the menu changes.
  @Column("varchar", { name: "group_title", nullable: true, length: 120 })
  groupTitle!: string | null;

  @Column("varchar", { name: "choice_name", nullable: true, length: 255 })
  choiceName!: string | null;

  @Column("decimal", {
    name: "price_extra",
    nullable: false,
    precision: 10,
    scale: 2,
    default: () => "'0.00'",
  })
  priceExtra!: string;

  @Column("enum", {
    name: "selection_state",
    enum: ["selected", "removed"],
    default: () => "'selected'",
  })
  selectionState!: OrderModifierState;

  @ManyToOne(
    () => OrderDetails,
    (orderDetails) => orderDetails.orderDetailOptions,
    { onDelete: "CASCADE", onUpdate: "CASCADE" },
  )
  @JoinColumn([
    { name: "order_detail_id", referencedColumnName: "orderDetailId" },
  ])
  orderDetail!: OrderDetails;

  @ManyToOne(
    () => MenuOptions,
    (menuOptions) => menuOptions.orderDetailOptions,
    { onDelete: "SET NULL", onUpdate: "CASCADE", nullable: true },
  )
  @JoinColumn([{ name: "option_id", referencedColumnName: "optionId" }])
  option!: MenuOptions | null;

  @ManyToOne(() => MenuOptionChoices, {
    onDelete: "SET NULL",
    onUpdate: "CASCADE",
    nullable: true,
  })
  @JoinColumn([{ name: "choice_id", referencedColumnName: "choiceId" }])
  choice!: MenuOptionChoices | null;
}
