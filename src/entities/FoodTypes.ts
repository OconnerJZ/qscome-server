import { Column, Entity, OneToMany } from "typeorm";
import { BusinessFoodTypes } from "./BusinessFoodTypes";

@Entity("food_types", { schema: "qscome" })
export class FoodTypes {
  @Column("int", { primary: true, name: "food_type_id" })
  foodTypeId!: number;

  @Column("varchar", { name: "type_name", nullable: true, length: 50 })
  typeName!: string | null;

  @OneToMany(
    () => BusinessFoodTypes,
    (businessFoodTypes) => businessFoodTypes.foodType
  )
  businessFoodTypes!: BusinessFoodTypes[];
}
