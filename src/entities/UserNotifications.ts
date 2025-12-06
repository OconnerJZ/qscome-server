import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { Users } from "./Users";
import { Subscriptions } from "./Subscriptions";

@Index("user_id", ["userId"], {})
@Index("subscription_id", ["subscriptionId"], {})
@Entity("user_notifications", { schema: "qscome" })
export class UserNotifications {
  @Column("int", { primary: true, name: "notification_id" })
  notificationId: number;

  @Column("int", { name: "user_id", nullable: true })
  userId: number | null;

  @Column("text", { name: "message", nullable: true })
  message: string | null;

  @Column("tinyint", { name: "is_read", nullable: true, width: 1 })
  isRead: boolean | null;

  @Column("datetime", { name: "notification_date", nullable: true })
  notificationDate: Date | null;

  @Column("int", { name: "subscription_id", nullable: true })
  subscriptionId: number | null;

  @ManyToOne(() => Users, (users) => users.userNotifications, {
    onDelete: "RESTRICT",
    onUpdate: "RESTRICT",
  })
  @JoinColumn([{ name: "user_id", referencedColumnName: "userId" }])
  user: Users;

  @ManyToOne(
    () => Subscriptions,
    (subscriptions) => subscriptions.userNotifications,
    { onDelete: "RESTRICT", onUpdate: "RESTRICT" }
  )
  @JoinColumn([
    { name: "subscription_id", referencedColumnName: "subscriptionId" },
  ])
  subscription: Subscriptions;
}
