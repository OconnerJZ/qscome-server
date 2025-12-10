import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Business } from "./Business";

@Index("business_id", ["businessId"], {})
@Entity("locations", { schema: "qscome" })
export class Locations {
  @PrimaryGeneratedColumn({ type: "int", name: "location_id" })
  locationId!: number;

  @Column("int", { name: "business_id", nullable: true })
  businessId!: number | null;

  @Column("varchar", { name: "address", nullable: true, length: 255 })
  address!: string | null;

  @Column("varchar", { name: "city", nullable: true, length: 255 })
  city!: string | null;

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

  @ManyToOne(() => Business, (business) => business.locations, {
    onDelete: "RESTRICT",
    onUpdate: "RESTRICT",
  })
  @JoinColumn([{ name: "business_id", referencedColumnName: "businessId" }])
  business!: Business;
}
