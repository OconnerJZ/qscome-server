import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Business } from "./Business";

@Index("fk_bds_business", ["businessId"], {})
@Entity("business_delivery_settings", { schema: "qscome" })
export class BusinessDeliverySettings {
  @PrimaryGeneratedColumn({ type: "int", name: "setting_id" })
  settingId: number;

  @Column("int", { name: "business_id" })
  businessId: number;

  @Column("decimal", {
    name: "delivery_radius_km",
    nullable: true,
    precision: 6,
    scale: 2,
    default: () => "'5.00'",
  })
  deliveryRadiusKm: string | null;

  @Column("decimal", {
    name: "delivery_fee",
    nullable: true,
    precision: 10,
    scale: 2,
    default: () => "'0.00'",
  })
  deliveryFee: string | null;

  @Column("decimal", {
    name: "min_order_amount",
    nullable: true,
    precision: 10,
    scale: 2,
    default: () => "'0.00'",
  })
  minOrderAmount: string | null;

  @Column("int", { name: "estimated_time_min", nullable: true })
  estimatedTimeMin: number | null;

  @Column("tinyint", {
    name: "use_own_delivery",
    nullable: true,
    width: 1,
    default: () => "'0'",
  })
  useOwnDelivery: boolean | null;

  @Column("longtext", { name: "polygon_json", nullable: true })
  polygonJson: string | null;

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

  @ManyToOne(() => Business, (business) => business.businessDeliverySettings, {
    onDelete: "RESTRICT",
    onUpdate: "RESTRICT",
  })
  @JoinColumn([{ name: "business_id", referencedColumnName: "businessId" }])
  business: Business;
}
