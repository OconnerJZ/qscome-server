import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Users } from "./Users";

@Index("user_id", ["userId"], {})
@Entity("user_wallets", { schema: "qscome" })
export class UserWallets {
  @PrimaryGeneratedColumn({ type: "int", name: "wallet_id" })
  walletId: number;

  @Column("int", { name: "user_id" })
  userId: number;

  @Column("decimal", {
    name: "balance",
    nullable: true,
    precision: 10,
    scale: 2,
    default: () => "'0.00'",
  })
  balance: string | null;

  @Column("datetime", {
    name: "last_update",
    nullable: true,
    default: () => "CURRENT_TIMESTAMP",
  })
  lastUpdate: Date | null;

  @ManyToOne(() => Users, (users) => users.userWallets, {
    onDelete: "RESTRICT",
    onUpdate: "RESTRICT",
  })
  @JoinColumn([{ name: "user_id", referencedColumnName: "userId" }])
  user: Users;
}
