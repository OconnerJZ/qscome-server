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

@Index("idx_user_addresses_user", ["userId"], {})
@Entity("user_addresses", { schema: "qscome" })
export class UserAddresses {
  @PrimaryGeneratedColumn({ type: "int", name: "address_id" })
  addressId!: number;

  @Column("int", { name: "user_id" })
  userId!: number;

  @Column("varchar", { name: "label", nullable: true, length: 50 })
  label!: string | null;

  @Column("varchar", { name: "recipient_name", nullable: true, length: 120 })
  recipientName!: string | null;

  @Column("varchar", { name: "phone", nullable: true, length: 30 })
  phone!: string | null;

  @Column("varchar", { name: "address", nullable: true, length: 255 })
  address!: string | null;

  @Column("varchar", { name: "city", nullable: true, length: 120 })
  city!: string | null;

  @Column("varchar", { name: "state", nullable: true, length: 120 })
  state!: string | null;

  @Column("varchar", { name: "postal_code", nullable: true, length: 20 })
  postalCode!: string | null;

  @Column("decimal", {
    name: "latitude",
    nullable: true,
    precision: 10,
    scale: 8,
  })
  latitude!: string | null;

  @Column("decimal", {
    name: "longitude",
    nullable: true,
    precision: 11,
    scale: 8,
  })
  longitude!: string | null;

  @Column("tinyint", {
    name: "is_default",
    nullable: true,
    width: 1,
    default: () => "'0'",
  })
  isDefault!: boolean | null;

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

  @OneToMany(() => Orders, (orders) => orders.deliveryAddress_2)
  orders!: Orders[];

  @ManyToOne(() => Users, (users) => users.userAddresses, {
    onDelete: "RESTRICT",
    onUpdate: "RESTRICT",
  })
  @JoinColumn([{ name: "user_id", referencedColumnName: "userId" }])
  user!: Users;
}
