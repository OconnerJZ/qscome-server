import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
} from "typeorm";
import { Business } from "./Business";
import { MenuOptions } from "./MenuOptions";
import { MenuOptionGroups } from "./MenuOptionGroups";
import { OrderDetails } from "./OrderDetails";

@Index("business_id", ["businessId"], {})
@Entity("menus", { schema: "qscome" })
export class Menus {
  @Column("int", { primary: true, name: "menu_id" })
  menuId: number;

  @Column("int", { name: "business_id", nullable: true })
  businessId: number | null;

  @Column("varchar", { name: "item_name", nullable: true, length: 255 })
  itemName: string | null;

  @Column("text", { name: "description", nullable: true })
  description: string | null;

  @Column("varchar", { name: "image_url", nullable: true, length: 255 })
  imageUrl: string | null;

  @Column("tinyint", {
    name: "is_available",
    nullable: true,
    width: 1,
    default: () => "'1'",
  })
  isAvailable: boolean | null;

  @Column("varchar", { name: "category", nullable: true, length: 100 })
  category: string | null;

  @Column("decimal", { name: "price", nullable: true, precision: 10, scale: 2 })
  price: string | null;

  @Column("datetime", {
    name: "created_at",
    nullable: true,
    default: () => "CURRENT_TIMESTAMP",
  })
  createdAt: Date | null;

  @Column("datetime", {
    name: "updated_at",
    nullable: true,
    default: () => "CURRENT_TIMESTAMP",
  })
  updatedAt: Date | null;

  @ManyToOne(() => Business, (business) => business.menus, {
    onDelete: "RESTRICT",
    onUpdate: "RESTRICT",
  })
  @JoinColumn([{ name: "business_id", referencedColumnName: "businessId" }])
  business: Business;

  @OneToMany(() => MenuOptions, (menuOptions) => menuOptions.menu)
  menuOptions: MenuOptions[];

  @OneToMany(
    () => MenuOptionGroups,
    (menuOptionGroups) => menuOptionGroups.menu
  )
  menuOptionGroups: MenuOptionGroups[];

  @OneToMany(() => OrderDetails, (orderDetails) => orderDetails.menu)
  orderDetails: OrderDetails[];
}
