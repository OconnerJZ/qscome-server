import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from "typeorm";
import { Menu } from "./Menu";

@Entity({ name: "menu_options" })
export class MenuOption {
    @PrimaryGeneratedColumn()
    option_id!: number;

    @Column()
    option_name!: string;

    @ManyToOne(() => Menu, menu => menu.options)
    menu!: Menu;
}
