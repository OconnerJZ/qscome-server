import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

@Entity("loyalty_programs", { schema: "qscome" })
@Index("uq_loyalty_program_business", ["businessId"], { unique: true })
export class LoyaltyProgram {
  @PrimaryGeneratedColumn({ type: "int", name: "loyalty_program_id" }) loyaltyProgramId!: number;
  @Column("int", { name: "business_id" }) businessId!: number;
  @Column("boolean", { name: "is_active", default: false }) isActive!: boolean;
  @Column("int", { name: "orders_required", default: 5 }) ordersRequired!: number;
  @Column("int", { name: "reward_percent", default: 10 }) rewardPercent!: number;
  @Column("decimal", { name: "min_order_amount", precision: 10, scale: 2, default: "0.00" }) minOrderAmount!: string;
  @CreateDateColumn({ name: "created_at", type: "datetime" }) createdAt!: Date;
  @UpdateDateColumn({ name: "updated_at", type: "datetime" }) updatedAt!: Date;
}
