import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany } from "typeorm";
import { Order } from "./Order";
import { Menu } from "./Menu";
import { OrderDetailOption } from "./OrdenDetailOption";

@Entity({ name: "order_details" })
export class OrderDetail {
    @PrimaryGeneratedColumn()
    order_detail_id!: number;

    @ManyToOne(() => Order, order => order.orderDetails)
    order!: Order;

    @ManyToOne(() => Menu, menu => menu.orderDetails)
    menu!: Menu;

    @Column()
    quantity!: number;

    @Column({ type: "decimal", precision: 10, scale: 2 })
    subtotal!: number;

    @Column({ type: "text", nullable: true })
    notes!: string;

    @OneToMany(() => OrderDetailOption, option => option.orderDetail)
    options!: OrderDetailOption[];
}
