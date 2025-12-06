import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { Business } from "./Business";
import { FoodTypes } from "./FoodTypes";

@Index("business_id", ["businessId"], {})
@Index("food_type_id", ["foodTypeId"], {})
@Entity("business_food_types", { schema: "qscome" })
export class BusinessFoodTypes {
  @Column("int", { name: "business_id", nullable: true })
  businessId: number | null;

  @Column("int", { name: "food_type_id", nullable: true })
  foodTypeId: number | null;

  @ManyToOne(() => Business, (business) => business.businessFoodTypes, {
    onDelete: "RESTRICT",
    onUpdate: "RESTRICT",
  })
  @JoinColumn([{ name: "business_id", referencedColumnName: "businessId" }])
  business: Business;

  @ManyToOne(() => FoodTypes, (foodTypes) => foodTypes.businessFoodTypes, {
    onDelete: "RESTRICT",
    onUpdate: "RESTRICT",
  })
  @JoinColumn([{ name: "food_type_id", referencedColumnName: "foodTypeId" }])
  foodType: FoodTypes;
}
