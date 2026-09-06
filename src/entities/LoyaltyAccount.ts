import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

@Entity("loyalty_accounts", { schema: "qscome" })
@Index("uq_loyalty_account_business_user", ["businessId", "userId"], { unique: true })
export class LoyaltyAccount {
  @PrimaryGeneratedColumn({ type: "int", name: "loyalty_account_id" }) loyaltyAccountId!: number;
  @Column("int", { name: "business_id" }) businessId!: number;
  @Column("int", { name: "user_id" }) userId!: number;
  @Column("int", { name: "stamps", default: 0 }) stamps!: number;
  @Column("int", { name: "available_rewards", default: 0 }) availableRewards!: number;
  @Column("int", { name: "lifetime_stamps", default: 0 }) lifetimeStamps!: number;
  @CreateDateColumn({ name: "created_at", type: "datetime" }) createdAt!: Date;
  @UpdateDateColumn({ name: "updated_at", type: "datetime" }) updatedAt!: Date;
}
