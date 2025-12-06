import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Business } from "./Business";
import { Users } from "./Users";

@Index("fk_bo_user", ["userId"], {})
@Index("fk_bo_business", ["businessId"], {})
@Entity("business_owners", { schema: "qscome" })
export class BusinessOwners {
  @PrimaryGeneratedColumn({ type: "int", name: "owner_id" })
  ownerId: number;

  @Column("int", { name: "user_id" })
  userId: number;

  @Column("int", { name: "business_id" })
  businessId: number;

  @Column("enum", {
    name: "role_in_business",
    nullable: true,
    enum: ["owner", "manager", "staff"],
    default: () => "'owner'",
  })
  roleInBusiness: "owner" | "manager" | "staff" | null;

  @Column("datetime", {
    name: "created_at",
    nullable: true,
    default: () => "CURRENT_TIMESTAMP",
  })
  createdAt: Date | null;

  @ManyToOne(() => Business, (business) => business.businessOwners, {
    onDelete: "RESTRICT",
    onUpdate: "RESTRICT",
  })
  @JoinColumn([{ name: "business_id", referencedColumnName: "businessId" }])
  business: Business;

  @ManyToOne(() => Users, (users) => users.businessOwners, {
    onDelete: "RESTRICT",
    onUpdate: "RESTRICT",
  })
  @JoinColumn([{ name: "user_id", referencedColumnName: "userId" }])
  user: Users;
}
