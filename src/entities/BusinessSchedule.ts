import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Business } from "./Business"; 

@Index("idx_schedule_business_id", ["businessId"], {})
@Entity("business_schedule", { schema: "qscome" })
export class BusinessSchedule {
  @PrimaryGeneratedColumn({ type: "int", name: "schedule_id" })
  scheduleId!: number;

  @Column("int", { name: "business_id" })
  businessId!: number;

  @Column("varchar", { name: "day", length: 12 })
  day!: string;

  @Column("tinyint", { name: "isClosed", nullable: true, width: 1 })
  isClosed!: boolean | null;

  @Column("varchar", { name: "opened", nullable: true, length: 8 })
  opened!: string | null;

  @Column("varchar", { name: "closed", nullable: true, length: 8 })
  closed!: string | null;

  @Column("tinyint", { name: "isHoliday", nullable: true, width: 1 })
  isHoliday!: boolean | null;

  @Column("datetime", {
    name: "created_at",
    default: () => "CURRENT_TIMESTAMP",
  })
  createdAt!: Date;

  @Column("datetime", {
    name: "updated_at",
    default: () => "CURRENT_TIMESTAMP",
  })
  updatedAt!: Date;

  @ManyToOne(() => Business, (business) => business.businessSchedules, {
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
  })
  @JoinColumn([{ name: "business_id", referencedColumnName: "businessId" }])
  business!: Business;
}
