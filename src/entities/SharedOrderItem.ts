import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, VersionColumn } from "typeorm";
import { SharedOrderSession } from "./SharedOrderSession";
import { SharedOrderParticipant } from "./SharedOrderParticipant";
import { Menus } from "./Menus";

@Entity("shared_order_items", { schema: "qscome" })
@Index("idx_shared_item_session", ["sessionId"])
@Index("idx_shared_item_owner", ["participantId"])
export class SharedOrderItem {
  @PrimaryGeneratedColumn({ type: "int", name: "shared_item_id" }) sharedItemId!: number;
  @Column("char", { name: "session_id", length: 36 }) sessionId!: string;
  @Column("int", { name: "participant_id" }) participantId!: number;
  @Column("int", { name: "user_id" }) userId!: number;
  @Column("int", { name: "business_id" }) businessId!: number;
  @Column("int", { name: "menu_id" }) menuId!: number;
  @Column("int", { name: "quantity" }) quantity!: number;
  @Column("text", { name: "note", nullable: true }) note!: string | null;
  @Column("longtext", { name: "modifiers_json", nullable: true }) modifiersJson!: string | null;
  @Column("decimal", { name: "unit_price_snapshot", precision: 10, scale: 2 }) unitPriceSnapshot!: string;
  @VersionColumn({ name: "version", type: "int", default: 1 }) version!: number;
  @Column("datetime", { name: "created_at", default: () => "CURRENT_TIMESTAMP" }) createdAt!: Date;
  @Column("datetime", { name: "updated_at", default: () => "CURRENT_TIMESTAMP", onUpdate: "CURRENT_TIMESTAMP" }) updatedAt!: Date;
  @ManyToOne(() => SharedOrderSession, (session) => session.items, { onDelete: "CASCADE" })
  @JoinColumn([{ name: "session_id", referencedColumnName: "sessionId" }]) session!: SharedOrderSession;
  @ManyToOne(() => SharedOrderParticipant, (participant) => participant.items, { onDelete: "CASCADE" })
  @JoinColumn([{ name: "participant_id", referencedColumnName: "participantId" }]) participant!: SharedOrderParticipant;
  @ManyToOne(() => Menus, { onDelete: "RESTRICT" })
  @JoinColumn([{ name: "menu_id", referencedColumnName: "menuId" }]) menu!: Menus;
}
