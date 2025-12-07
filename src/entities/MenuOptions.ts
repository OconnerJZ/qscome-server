import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Menus } from "./Menus";
import { OrderDetailOptions } from "./OrderDetailOptions";

@Index("menu_id", ["menuId"], {})
@Entity("menu_options", { schema: "qscome" })
export class MenuOptions {
  @PrimaryGeneratedColumn({ type: "int", name: "option_id" })
  optionId!: number;

  @Column("int", { name: "menu_id" })
  menuId!: number;

  @Column("varchar", { name: "option_name", length: 255 })
  optionName!: string;

  @Column("decimal", {
    name: "price_extra",
    nullable: true,
    precision: 10,
    scale: 2,
    default: () => "'0.00'",
  })
  priceExtra!: string | null;

  @Column("tinyint", {
    name: "is_default",
    nullable: true,
    width: 1,
    default: () => "'0'",
  })
  isDefault!: boolean | null;

  @ManyToOne(() => Menus, (menus) => menus.menuOptions, {
    onDelete: "RESTRICT",
    onUpdate: "RESTRICT",
  })
  @JoinColumn([{ name: "menu_id", referencedColumnName: "menuId" }])
  menu!: Menus;

  @OneToMany(
    () => OrderDetailOptions,
    (orderDetailOptions) => orderDetailOptions.option
  )
  orderDetailOptions!: OrderDetailOptions[];
}
