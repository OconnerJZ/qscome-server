import { Entity, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn, UpdateDateColumn } from "typeorm";
import { Order } from "./Order";
import { Payment } from "./Payment";

@Entity({ name: "users" })
export class User {
    @PrimaryGeneratedColumn()
    user_id!: number;

    @Column()
    user_name!: string;

    @Column()
    email!: string;

    @Column({ default: false })
    is_subscribed!: boolean;

    @Column({ default: false })
    is_payment_active!: boolean;

    @OneToMany(() => Order, order => order.user)
    orders!: Order[];

    @OneToMany(() => Payment, payment => payment.user)
    payments!: Payment[];

    @CreateDateColumn()
    created_at!: Date;

    @UpdateDateColumn()
    updated_at!: Date;
}
