import { Entity, PrimaryGeneratedColumn, ManyToOne } from "typeorm";
import { OrderDetail } from "./OrderDetail";
import { MenuOption } from "./MenuOption";

@Entity({ name: "order_detail_options" })
export class OrderDetailOption {
    @PrimaryGeneratedColumn()
    id!: number;

    @ManyToOne(() => OrderDetail, detail => detail.options)
    orderDetail!: OrderDetail;

    @ManyToOne(() => MenuOption)
    option_id!: MenuOption;
}