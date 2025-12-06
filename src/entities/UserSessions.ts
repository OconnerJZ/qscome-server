import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Users } from "./Users";

@Index("fk_sessions_user", ["userId"], {})
@Entity("user_sessions", { schema: "qscome" })
export class UserSessions {
  @PrimaryGeneratedColumn({ type: "int", name: "session_id" })
  sessionId: number;

  @Column("int", { name: "user_id" })
  userId: number;

  @Column("varchar", { name: "jwt_token", length: 512 })
  jwtToken: string;

  @Column("varchar", { name: "refresh_token", nullable: true, length: 512 })
  refreshToken: string | null;

  @Column("varchar", { name: "user_agent", nullable: true, length: 512 })
  userAgent: string | null;

  @Column("varchar", { name: "ip_address", nullable: true, length: 50 })
  ipAddress: string | null;

  @Column("datetime", {
    name: "created_at",
    nullable: true,
    default: () => "CURRENT_TIMESTAMP",
  })
  createdAt: Date | null;

  @Column("datetime", { name: "expires_at", nullable: true })
  expiresAt: Date | null;

  @ManyToOne(() => Users, (users) => users.userSessions, {
    onDelete: "RESTRICT",
    onUpdate: "RESTRICT",
  })
  @JoinColumn([{ name: "user_id", referencedColumnName: "userId" }])
  user: Users;
}
