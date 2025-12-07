import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { MenuOptionGroups } from "./MenuOptionGroups";

@Index("fk_moc_group", ["groupId"], {})
@Entity("menu_option_choices", { schema: "qscome" })
export class MenuOptionChoices {
  @PrimaryGeneratedColumn({ type: "int", name: "choice_id" })
  choiceId!: number;

  @Column("int", { name: "group_id" })
  groupId!: number;

  @Column("varchar", { name: "name", length: 255 })
  name!: string;

  @Column("decimal", {
    name: "price_extra",
    nullable: true,
    precision: 10,
    scale: 2,
    default: () => "'0.00'",
  })
  priceExtra!: string | null;

  @Column("tinyint", {
    name: "is_default",
    nullable: true,
    width: 1,
    default: () => "'0'",
  })
  isDefault!: boolean | null;

  @ManyToOne(
    () => MenuOptionGroups,
    (menuOptionGroups) => menuOptionGroups.menuOptionChoices,
    { onDelete: "RESTRICT", onUpdate: "RESTRICT" }
  )
  @JoinColumn([{ name: "group_id", referencedColumnName: "groupId" }])
  group!: MenuOptionGroups;
}
