import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { Orders } from "./Orders";

@Entity("delivery_persons", { schema: "qscome" })
export class DeliveryPersons {
  @PrimaryGeneratedColumn({ type: "int", name: "delivery_id" })
  deliveryId: number;

  @Column("varchar", { name: "name", length: 255 })
  name: string;

  @Column("varchar", { name: "phone", nullable: true, length: 20 })
  phone: string | null;

  @Column("enum", {
    name: "status",
    nullable: true,
    enum: ["available", "busy", "offline"],
    default: () => "'offline'",
  })
  status: "available" | "busy" | "offline" | null;

  @Column("decimal", {
    name: "current_lat",
    nullable: true,
    precision: 10,
    scale: 8,
  })
  currentLat: string | null;

  @Column("decimal", {
    name: "current_lng",
    nullable: true,
    precision: 11,
    scale: 8,
  })
  currentLng: string | null;

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

  @Column("datetime", { name: "last_online", nullable: true })
  lastOnline: Date | null;

  @Column("int", { name: "current_accuracy", nullable: true })
  currentAccuracy: number | null;

  @OneToMany(() => Orders, (orders) => orders.delivery)
  orders: Orders[];
}
