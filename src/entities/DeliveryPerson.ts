import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from "typeorm";
import { Order } from "./Order";

@Entity({ name: "delivery_persons" })
export class DeliveryPerson {
    @PrimaryGeneratedColumn()
    delivery_id!: number;

    @Column()
    name!: string;

    @Column()
    phone!: string;

    @OneToMany(() => Order, order => order.delivery)
    orders!: Order[];
}
