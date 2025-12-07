import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { Business } from "./Business";

@Index("business_id", ["businessId"], {})
@Entity("global_virtual_assistants", { schema: "qscome" })
export class GlobalVirtualAssistants {
  @Column("int", { primary: true, name: "assistant_id" })
  assistantId!: number;

  @Column("varchar", { name: "name", nullable: true, length: 255 })
  name!: string | null;

  @Column("text", { name: "description", nullable: true })
  description!: string | null;

  @Column("longtext", { name: "configuration", nullable: true })
  configuration!: string | null;

  @Column("int", { name: "business_id", nullable: true })
  businessId!: number | null;

  @ManyToOne(() => Business, (business) => business.globalVirtualAssistants, {
    onDelete: "RESTRICT",
    onUpdate: "RESTRICT",
  })
  @JoinColumn([{ name: "business_id", referencedColumnName: "businessId" }])
  business!: Business;
}
