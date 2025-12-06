import {
  Column,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Users } from "./Users";

@Index("role_name", ["roleName"], { unique: true })
@Entity("user_roles", { schema: "qscome" })
export class UserRoles {
  @PrimaryGeneratedColumn({ type: "int", name: "role_id" })
  roleId: number;

  @Column("varchar", { name: "role_name", unique: true, length: 50 })
  roleName: string;

  @OneToMany(() => Users, (users) => users.role)
  users: Users[];
}
