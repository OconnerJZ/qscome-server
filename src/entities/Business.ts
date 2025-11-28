import { Entity, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn, UpdateDateColumn } from "typeorm";
import { Menu } from "./Menu";
import { Order } from "./Order";

@Entity({ name: "business" })
export class Business {
    @PrimaryGeneratedColumn()
    business_id!: number;

    @Column()
    business_name!: string;

    @OneToMany(() => Menu, menu => menu.business)
    menus!: Menu[];

    @OneToMany(() => Order, order => order.business)
    orders!: Order[];

    @CreateDateColumn()
    created_at!: Date;

    @UpdateDateColumn()
    updated_at!: Date;
}
