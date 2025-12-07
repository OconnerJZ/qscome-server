import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";
import { Orders } from "./Orders";
import { Tables } from "./Tables";

@Index("order_id", ["orderId"], {})
@Index("table_id", ["tableId"], {})
@Entity("order_tables", { schema: "qscome" })
export class OrderTables {
  @PrimaryColumn("int", { name: "order_id" })
  orderId!: number;

  @PrimaryColumn("int", { name: "table_id" })
  tableId!: number;

  @ManyToOne(() => Orders, (orders) => orders.orderTables, {
    onDelete: "RESTRICT",
    onUpdate: "RESTRICT",
  })
  @JoinColumn([{ name: "order_id", referencedColumnName: "orderId" }])
  order!: Orders;

  @ManyToOne(() => Tables, (tables) => tables.orderTables, {
    onDelete: "RESTRICT",
    onUpdate: "RESTRICT",
  })
  @JoinColumn([{ name: "table_id", referencedColumnName: "tableId" }])
  table!: Tables;
}
