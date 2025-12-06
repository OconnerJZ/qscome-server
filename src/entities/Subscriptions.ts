import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
} from "typeorm";
import { Users } from "./Users";
import { SubscriptionPayments } from "./SubscriptionPayments";
import { SubscriptionPromotions } from "./SubscriptionPromotions";
import { UserNotifications } from "./UserNotifications";

@Index("user_id", ["userId"], {})
@Entity("subscriptions", { schema: "qscome" })
export class Subscriptions {
  @Column("int", { primary: true, name: "subscription_id" })
  subscriptionId: number;

  @Column("int", { name: "user_id", nullable: true })
  userId: number | null;

  @Column("varchar", { name: "subscription_type", nullable: true, length: 50 })
  subscriptionType: string | null;

  @Column("date", { name: "start_date", nullable: true })
  startDate: string | null;

  @Column("date", { name: "cancel_date", nullable: true })
  cancelDate: string | null;

  @Column("tinyint", {
    name: "is_paid",
    nullable: true,
    width: 1,
    default: () => "'0'",
  })
  isPaid: boolean | null;

  @ManyToOne(() => Users, (users) => users.subscriptions, {
    onDelete: "RESTRICT",
    onUpdate: "RESTRICT",
  })
  @JoinColumn([{ name: "user_id", referencedColumnName: "userId" }])
  user: Users;

  @OneToMany(
    () => SubscriptionPayments,
    (subscriptionPayments) => subscriptionPayments.subscription
  )
  subscriptionPayments: SubscriptionPayments[];

  @OneToMany(
    () => SubscriptionPromotions,
    (subscriptionPromotions) => subscriptionPromotions.subscription
  )
  subscriptionPromotions: SubscriptionPromotions[];

  @OneToMany(
    () => UserNotifications,
    (userNotifications) => userNotifications.subscription
  )
  userNotifications: UserNotifications[];
}
