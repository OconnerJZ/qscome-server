import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from "typeorm";
import { User } from "./User";
import { Order } from "./Order";

@Entity({ name: "payments" })
export class Payment {
    @PrimaryGeneratedColumn()
    payment_id!: number;

    @ManyToOne(() => User, user => user.payments)
    user!: User;

    @ManyToOne(() => Order)
    order!: Order;

    @Column({ type: "decimal", precision: 10, scale: 2 })
    amount!: number;

    @Column({ default: "pending" })
    status!: string; // pending, completed, failed

    @Column({ default: "card" })
    payment_method!: string; // card, wallet, cash

    @CreateDateColumn()
    payment_date!: Date;
}
