import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { Business } from "./Business";

@Index("business_id", ["businessId"], {})
@Entity("business_photos", { schema: "qscome" })
export class BusinessPhotos {
  @Column("int", { primary: true, name: "photo_id" })
  photoId: number;

  @Column("int", { name: "business_id", nullable: true })
  businessId: number | null;

  @Column("varchar", { name: "photo_url", nullable: true, length: 255 })
  photoUrl: string | null;

  @ManyToOne(() => Business, (business) => business.businessPhotos, {
    onDelete: "RESTRICT",
    onUpdate: "RESTRICT",
  })
  @JoinColumn([{ name: "business_id", referencedColumnName: "businessId" }])
  business: Business;
}
