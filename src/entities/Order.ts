import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, CreateDateColumn, UpdateDateColumn } from "typeorm";
import { User } from "./User";
import { Business } from "./Business";
import { OrderDetail } from "./OrderDetail";
import { DeliveryPerson } from "./DeliveryPerson";

@Entity({ name: "orders" })
export class Order {
    @PrimaryGeneratedColumn()
    order_id!: number;

    @ManyToOne(() => User, user => user.orders)
    user!: User;

    @ManyToOne(() => Business, business => business.orders)
    business!: Business;

    @ManyToOne(() => DeliveryPerson, delivery => delivery.orders, { nullable: true })
    delivery!: DeliveryPerson;

    @Column({ default: "unassigned" })
    delivery_status!: string; // unassigned, assigned, picked, delivered

    @OneToMany(() => OrderDetail, detail => detail.order)
    orderDetails!: OrderDetail[];

    @CreateDateColumn()
    created_at!: Date;

    @UpdateDateColumn()
    updated_at!: Date;
}
