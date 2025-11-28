import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, CreateDateColumn, UpdateDateColumn } from "typeorm";
import { Business } from "./Business";
import { MenuOption } from "./MenuOption";
import { OrderDetail } from "./OrderDetail";

@Entity({ name: "menus" })
export class Menu {
    @PrimaryGeneratedColumn()
    menu_id!: number;

    @Column()
    item_name!: string;

    @Column({ type: "text", nullable: true })
    description!: string;

    @Column({ type: "decimal", precision: 10, scale: 2 })
    price!: number;

    @ManyToOne(() => Business, business => business.menus)
    business!: Business;

    @OneToMany(() => MenuOption, option => option.menu)
    options!: MenuOption[];

    @OneToMany(() => OrderDetail, detail => detail.menu)
    orderDetails!: OrderDetail[];

    @CreateDateColumn()
    created_at!: Date;

    @UpdateDateColumn()
    updated_at!: Date;
}
