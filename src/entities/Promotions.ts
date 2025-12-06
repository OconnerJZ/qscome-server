import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
} from "typeorm";
import { Business } from "./Business";
import { SubscriptionPromotions } from "./SubscriptionPromotions";

@Index("business_id", ["businessId"], {})
@Entity("promotions", { schema: "qscome" })
export class Promotions {
  @Column("int", { primary: true, name: "promotion_id" })
  promotionId: number;

  @Column("int", { name: "business_id", nullable: true })
  businessId: number | null;

  @Column("varchar", { name: "title", nullable: true, length: 255 })
  title: string | null;

  @Column("text", { name: "description", nullable: true })
  description: string | null;

  @Column("date", { name: "start_date", nullable: true })
  startDate: string | null;

  @Column("date", { name: "end_date", nullable: true })
  endDate: string | null;

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

  @ManyToOne(() => Business, (business) => business.promotions, {
    onDelete: "RESTRICT",
    onUpdate: "RESTRICT",
  })
  @JoinColumn([{ name: "business_id", referencedColumnName: "businessId" }])
  business: Business;

  @OneToMany(
    () => SubscriptionPromotions,
    (subscriptionPromotions) => subscriptionPromotions.promotion
  )
  subscriptionPromotions: SubscriptionPromotions[];
}
