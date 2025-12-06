import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Users } from "./Users";

@Index("fk_audit_actor", ["actorUserId"], {})
@Entity("audit_logs", { schema: "qscome" })
export class AuditLogs {
  @PrimaryGeneratedColumn({ type: "int", name: "audit_id" })
  auditId!: number;

  @Column("int", { name: "actor_user_id", nullable: true })
  actorUserId!: number | null;

  @Column("varchar", { name: "action", length: 100 })
  action!: string;

  @Column("varchar", { name: "target_table", nullable: true, length: 100 })
  targetTable!: string | null;

  @Column("int", { name: "target_id", nullable: true })
  targetId!: number | null;

  @Column("longtext", { name: "before_json", nullable: true })
  beforeJson!: string | null;

  @Column("longtext", { name: "after_json", nullable: true })
  afterJson!: string | null;

  @Column("datetime", {
    name: "created_at",
    nullable: true,
    default: () => "CURRENT_TIMESTAMP",
  })
  createdAt!: Date | null;

  @ManyToOne(() => Users, (users) => users.auditLogs, {
    onDelete: "RESTRICT",
    onUpdate: "RESTRICT",
  })
  @JoinColumn([{ name: "actor_user_id", referencedColumnName: "userId" }])
  actorUser!: Users;
}
