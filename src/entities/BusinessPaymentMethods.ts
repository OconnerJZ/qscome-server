import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Business } from "./Business";

@Index("fk_bpm_business", ["businessId"], {})
@Entity("business_payment_methods", { schema: "qscome" })
export class BusinessPaymentMethods {
  @PrimaryGeneratedColumn({ type: "int", name: "id" })
  id: number;

  @Column("int", { name: "business_id" })
  businessId: number;

  @Column("enum", {
    name: "method",
    enum: ["cash", "card", "wallet", "transfer"],
  })
  method: "cash" | "card" | "wallet" | "transfer";

  @Column("tinyint", {
    name: "is_active",
    nullable: true,
    width: 1,
    default: () => "'1'",
  })
  isActive: boolean | null;

  @Column("longtext", { name: "config_json", nullable: true })
  configJson: string | null;

  @Column("datetime", {
    name: "created_at",
    nullable: true,
    default: () => "CURRENT_TIMESTAMP",
  })
  createdAt: Date | null;

  @ManyToOne(() => Business, (business) => business.businessPaymentMethods, {
    onDelete: "RESTRICT",
    onUpdate: "RESTRICT",
  })
  @JoinColumn([{ name: "business_id", referencedColumnName: "businessId" }])
  business: Business;
}
