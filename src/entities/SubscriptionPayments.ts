import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { Subscriptions } from "./Subscriptions";

@Index("subscription_id", ["subscriptionId"], {})
@Entity("subscription_payments", { schema: "qscome" })
export class SubscriptionPayments {
  @Column("int", { primary: true, name: "payment_id" })
  paymentId: number;

  @Column("int", { name: "subscription_id", nullable: true })
  subscriptionId: number | null;

  @Column("decimal", {
    name: "amount",
    nullable: true,
    precision: 10,
    scale: 2,
  })
  amount: string | null;

  @Column("datetime", { name: "payment_date", nullable: true })
  paymentDate: Date | null;

  @ManyToOne(
    () => Subscriptions,
    (subscriptions) => subscriptions.subscriptionPayments,
    { onDelete: "RESTRICT", onUpdate: "RESTRICT" }
  )
  @JoinColumn([
    { name: "subscription_id", referencedColumnName: "subscriptionId" },
  ])
  subscription: Subscriptions;
}
