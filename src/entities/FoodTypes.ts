import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { BusinessFoodTypes } from "./BusinessFoodTypes";

@Entity("food_types", { schema: "qscome" })
export class FoodTypes {
  @PrimaryGeneratedColumn({ type: "int", name: "food_type_id" })
    foodTypeId!: number;

  @Column("varchar", { name: "type_name", nullable: true, length: 50 })
  typeName!: string | null;

  @OneToMany(
    () => BusinessFoodTypes,
    (businessFoodTypes) => businessFoodTypes.foodType
  )
  businessFoodTypes!: BusinessFoodTypes[];
}
