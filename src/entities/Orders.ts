import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { DeliveryPersons } from "./DeliveryPersons";
import { UserAddresses } from "./UserAddresses";
import { Users } from "./Users";
import { Business } from "./Business";
import { OrderDetails } from "./OrderDetails";
import { OrderStatusHistory } from "./OrderStatusHistory";
import { OrderTables } from "./OrderTables";
import { Payments } from "./Payments";

@Index("user_id", ["userId"], {})
@Index("business_id", ["businessId"], {})
@Index("fk_orders_delivery", ["deliveryId"], {})
@Index("fk_orders_delivery_address", ["deliveryAddressId"], {})
@Index("idx_orders_business", ["businessId"], {})
@Index("idx_orders_user", ["userId"], {})
@Entity("orders", { schema: "qscome" })
export class Orders {
  @PrimaryGeneratedColumn({ type: "int", name: "order_id" })
  orderId!: number;

  @Column("int", { name: "user_id", nullable: true })
  userId!: number | null;

  @Column("int", { name: "business_id", nullable: true })
  businessId!: number | null;

  @Column("datetime", { name: "order_date", nullable: true })
  orderDate!: Date | null;

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

  @Column("int", { name: "delivery_id", nullable: true })
  deliveryId!: number | null;

  @Column("enum", {
    name: "delivery_status",
    nullable: true,
    enum: ["unassigned", "assigned", "on_route", "delivered"],
    default: () => "'unassigned'",
  })
  deliveryStatus!: "unassigned" | "assigned" | "on_route" | "delivered" | null;

  @Column("enum", {
    name: "status",
    nullable: true,
    enum: [
      "pending",
      "accepted",
      "preparing",
      "ready",
      "in_delivery",
      "completed",
      "cancelled",
    ],
    default: () => "'pending'",
  })
  status!:
    | "pending"
    | "accepted"
    | "preparing"
    | "ready"
    | "in_delivery"
    | "completed"
    | "cancelled"
    | null;

  @Column("decimal", {
    name: "total",
    nullable: true,
    precision: 10,
    scale: 2,
    default: () => "'0.00'",
  })
  total!: string | null;

  @Column("varchar", { name: "customer_name", nullable: true, length: 255 })
  customerName!: string | null;

  @Column("varchar", { name: "customer_phone", nullable: true, length: 30 })
  customerPhone!: string | null;

  @Column("text", { name: "delivery_address", nullable: true })
  deliveryAddress!: string | null;

  @Column("text", { name: "order_notes", nullable: true })
  orderNotes!: string | null;

  @Column("int", { name: "delivery_address_id", nullable: true })
  deliveryAddressId!: number | null;

  @ManyToOne(
    () => DeliveryPersons,
    (deliveryPersons) => deliveryPersons.orders,
    { onDelete: "RESTRICT", onUpdate: "RESTRICT" }
  )
  @JoinColumn([{ name: "delivery_id", referencedColumnName: "deliveryId" }])
  delivery!: DeliveryPersons;

  @ManyToOne(() => UserAddresses, (userAddresses) => userAddresses.orders, {
    onDelete: "RESTRICT",
    onUpdate: "RESTRICT",
  })
  @JoinColumn([
    { name: "delivery_address_id", referencedColumnName: "addressId" },
  ])
  deliveryAddress_2!: UserAddresses;

  @ManyToOne(() => Users, (users) => users.orders, {
    onDelete: "RESTRICT",
    onUpdate: "RESTRICT",
  })
  @JoinColumn([{ name: "user_id", referencedColumnName: "userId" }])
  user!: Users;

  @ManyToOne(() => Business, (business) => business.orders, {
    onDelete: "RESTRICT",
    onUpdate: "RESTRICT",
  })
  @JoinColumn([{ name: "business_id", referencedColumnName: "businessId" }])
  business!: Business;

  @OneToMany(() => OrderDetails, (orderDetails) => orderDetails.order)
  orderDetails!: OrderDetails[];

  @OneToMany(
    () => OrderStatusHistory,
    (orderStatusHistory) => orderStatusHistory.order
  )
  orderStatusHistories!: OrderStatusHistory[];

  @OneToMany(() => OrderTables, (orderTables) => orderTables.order)
  orderTables!: OrderTables[];

  @OneToMany(() => Payments, (payments) => payments.order)
  payments!: Payments[];
}
