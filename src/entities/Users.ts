import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
} from "typeorm";
import { AuditLogs } from "./AuditLogs";
import { BusinessOwners } from "./BusinessOwners";
import { Orders } from "./Orders";
import { OrderStatusHistory } from "./OrderStatusHistory";
import { Payments } from "./Payments";
import { ReviewComments } from "./ReviewComments";
import { Subscriptions } from "./Subscriptions";
import { UserRoles } from "./UserRoles";
import { UserAddresses } from "./UserAddresses";
import { UserNotifications } from "./UserNotifications";
import { UserSessions } from "./UserSessions";
import { UserWallets } from "./UserWallets";
import { Votes } from "./Votes";

@Index("fk_users_role", ["roleId"], {})
@Entity("users", { schema: "qscome" })
export class Users {
  @Column("int", { primary: true, name: "user_id" })
  userId: number;

  @Column("varchar", { name: "user_name", nullable: true, length: 255 })
  userName: string | null;

  @Column("varchar", { name: "email", nullable: true, length: 255 })
  email: string | null;

  @Column("tinyint", {
    name: "is_subscribed",
    nullable: true,
    width: 1,
    default: () => "'0'",
  })
  isSubscribed: boolean | null;

  @Column("tinyint", {
    name: "is_payment_active",
    nullable: true,
    width: 1,
    default: () => "'0'",
  })
  isPaymentActive: boolean | null;

  @Column("varchar", { name: "phone", nullable: true, length: 30 })
  phone: string | null;

  @Column("varchar", { name: "password_hash", nullable: true, length: 255 })
  passwordHash: string | null;

  @Column("enum", {
    name: "auth_provider",
    nullable: true,
    enum: ["local", "google", "facebook"],
    default: () => "'local'",
  })
  authProvider: "local" | "google" | "facebook" | null;

  @Column("varchar", { name: "auth_provider_id", nullable: true, length: 255 })
  authProviderId: string | null;

  @Column("varchar", { name: "avatar_url", nullable: true, length: 255 })
  avatarUrl: string | null;

  @Column("int", { name: "role_id", nullable: true })
  roleId: number | null;

  @Column("varchar", {
    name: "locale",
    nullable: true,
    length: 10,
    default: () => "'''es_MX'''",
  })
  locale: string | null;

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

  @OneToMany(() => AuditLogs, (auditLogs) => auditLogs.actorUser)
  auditLogs: AuditLogs[];

  @OneToMany(() => BusinessOwners, (businessOwners) => businessOwners.user)
  businessOwners: BusinessOwners[];

  @OneToMany(() => Orders, (orders) => orders.user)
  orders: Orders[];

  @OneToMany(
    () => OrderStatusHistory,
    (orderStatusHistory) => orderStatusHistory.changedBy2
  )
  orderStatusHistories: OrderStatusHistory[];

  @OneToMany(() => Payments, (payments) => payments.user)
  payments: Payments[];

  @OneToMany(() => ReviewComments, (reviewComments) => reviewComments.user)
  reviewComments: ReviewComments[];

  @OneToMany(() => Subscriptions, (subscriptions) => subscriptions.user)
  subscriptions: Subscriptions[];

  @ManyToOne(() => UserRoles, (userRoles) => userRoles.users, {
    onDelete: "RESTRICT",
    onUpdate: "RESTRICT",
  })
  @JoinColumn([{ name: "role_id", referencedColumnName: "roleId" }])
  role: UserRoles;

  @OneToMany(() => UserAddresses, (userAddresses) => userAddresses.user)
  userAddresses: UserAddresses[];

  @OneToMany(
    () => UserNotifications,
    (userNotifications) => userNotifications.user
  )
  userNotifications: UserNotifications[];

  @OneToMany(() => UserSessions, (userSessions) => userSessions.user)
  userSessions: UserSessions[];

  @OneToMany(() => UserWallets, (userWallets) => userWallets.user)
  userWallets: UserWallets[];

  @OneToMany(() => Votes, (votes) => votes.user)
  votes: Votes[];
}
