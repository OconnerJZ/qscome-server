import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { MenuOptionChoices } from "./MenuOptionChoices";
import { Menus } from "./Menus";

@Index("fk_mog_menu", ["menuId"], {})
@Entity("menu_option_groups", { schema: "qscome" })
export class MenuOptionGroups {
  @PrimaryGeneratedColumn({ type: "int", name: "group_id" })
  groupId!: number;

  @Column("int", { name: "menu_id" })
  menuId!: number;

  @Column("varchar", { name: "title", length: 120 })
  title!: string;

  @Column("int", { name: "min_select", nullable: true, default: () => "'0'" })
  minSelect!: number | null;

  @Column("int", { name: "max_select", nullable: true, default: () => "'0'" })
  maxSelect!: number | null;

  @OneToMany(
    () => MenuOptionChoices,
    (menuOptionChoices) => menuOptionChoices.group
  )
  menuOptionChoices!: MenuOptionChoices[];

  @ManyToOne(() => Menus, (menus) => menus.menuOptionGroups, {
    onDelete: "RESTRICT",
    onUpdate: "RESTRICT",
  })
  @JoinColumn([{ name: "menu_id", referencedColumnName: "menuId" }])
  menu!: Menus;
}
