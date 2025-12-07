import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
} from "typeorm";
import { OrderTables } from "./OrderTables";
import { Business } from "./Business";

@Index("business_id", ["businessId"], {})
@Entity("tables", { schema: "qscome" })
export class Tables {
  @Column("int", { primary: true, name: "table_id" })
  tableId!: number;

  @Column("int", { name: "business_id", nullable: true })
  businessId!: number | null;

  @Column("int", { name: "table_number", nullable: true })
  tableNumber!: number | null;

  @Column("int", { name: "capacity", nullable: true })
  capacity!: number | null;

  @OneToMany(() => OrderTables, (orderTables) => orderTables.table)
  orderTables!: OrderTables[];

  @ManyToOne(() => Business, (business) => business.tables, {
    onDelete: "RESTRICT",
    onUpdate: "RESTRICT",
  })
  @JoinColumn([{ name: "business_id", referencedColumnName: "businessId" }])
  business!: Business;
}
