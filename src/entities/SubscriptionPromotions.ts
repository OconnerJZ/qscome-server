import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { Subscriptions } from "./Subscriptions";
import { Promotions } from "./Promotions";

@Index("subscription_id", ["subscriptionId"], {})
@Index("promotion_id", ["promotionId"], {})
@Entity("subscription_promotions", { schema: "qscome" })
export class SubscriptionPromotions {
  @Column("int", { name: "subscription_id", nullable: true })
  subscriptionId: number | null;

  @Column("int", { name: "promotion_id", nullable: true })
  promotionId: number | null;

  @ManyToOne(
    () => Subscriptions,
    (subscriptions) => subscriptions.subscriptionPromotions,
    { onDelete: "RESTRICT", onUpdate: "RESTRICT" }
  )
  @JoinColumn([
    { name: "subscription_id", referencedColumnName: "subscriptionId" },
  ])
  subscription: Subscriptions;

  @ManyToOne(
    () => Promotions,
    (promotions) => promotions.subscriptionPromotions,
    { onDelete: "RESTRICT", onUpdate: "RESTRICT" }
  )
  @JoinColumn([{ name: "promotion_id", referencedColumnName: "promotionId" }])
  promotion: Promotions;
}
