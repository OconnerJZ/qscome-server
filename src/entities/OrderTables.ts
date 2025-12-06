import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { Orders } from "./Orders";
import { Tables } from "./Tables";

@Index("order_id", ["orderId"], {})
@Index("table_id", ["tableId"], {})
@Entity("order_tables", { schema: "qscome" })
export class OrderTables {
  @Column("int", { name: "order_id", nullable: true })
  orderId: number | null;

  @Column("int", { name: "table_id", nullable: true })
  tableId: number | null;

  @ManyToOne(() => Orders, (orders) => orders.orderTables, {
    onDelete: "RESTRICT",
    onUpdate: "RESTRICT",
  })
  @JoinColumn([{ name: "order_id", referencedColumnName: "orderId" }])
  order: Orders;

  @ManyToOne(() => Tables, (tables) => tables.orderTables, {
    onDelete: "RESTRICT",
    onUpdate: "RESTRICT",
  })
  @JoinColumn([{ name: "table_id", referencedColumnName: "tableId" }])
  table: Tables;
}
