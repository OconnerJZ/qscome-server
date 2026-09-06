import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

@Entity("loyalty_events", { schema: "qscome" })
@Index("uq_loyalty_event_order_type", ["orderId", "eventType"], { unique: true })
@Index("idx_loyalty_event_account", ["loyaltyAccountId"])
export class LoyaltyEvent {
  @PrimaryGeneratedColumn({ type: "int", name: "loyalty_event_id" }) loyaltyEventId!: number;
  @Column("int", { name: "loyalty_account_id" }) loyaltyAccountId!: number;
  @Column("int", { name: "order_id" }) orderId!: number;
  @Column("varchar", { name: "event_type", length: 40, default: "order_completed" }) eventType!: string;
  @Column("int", { name: "stamp_delta", default: 0 }) stampDelta!: number;
  @Column("int", { name: "reward_delta", default: 0 }) rewardDelta!: number;
  @Column("longtext", { name: "metadata_json", nullable: true }) metadataJson!: string | null;
  @CreateDateColumn({ name: "created_at", type: "datetime" }) createdAt!: Date;
}
