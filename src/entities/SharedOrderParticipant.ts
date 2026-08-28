import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { SharedOrderSession } from "./SharedOrderSession";
import { SharedOrderItem } from "./SharedOrderItem";

@Entity("shared_order_participants", { schema: "qscome" })
@Index("uq_shared_participant_user", ["sessionId", "userId"], { unique: true })
@Index("uq_shared_participant_sequence", ["sessionId", "packagingNumber"], { unique: true })
export class SharedOrderParticipant {
  @PrimaryGeneratedColumn({ type: "int", name: "participant_id" }) participantId!: number;
  @Column("char", { name: "session_id", length: 36 }) sessionId!: string;
  @Column("int", { name: "user_id" }) userId!: number;
  @Column("enum", { name: "role", enum: ["host", "member"], default: () => "'member'" }) role!: "host" | "member";
  @Column("int", { name: "packaging_number" }) packagingNumber!: number;
  @Column("enum", { name: "status", enum: ["active", "left"], default: () => "'active'" }) status!: "active" | "left";
  @Column("datetime", { name: "joined_at", default: () => "CURRENT_TIMESTAMP" }) joinedAt!: Date;
  @ManyToOne(() => SharedOrderSession, (session) => session.participants, { onDelete: "CASCADE" })
  @JoinColumn([{ name: "session_id", referencedColumnName: "sessionId" }]) session!: SharedOrderSession;
  @OneToMany(() => SharedOrderItem, (item) => item.participant) items!: SharedOrderItem[];
}
