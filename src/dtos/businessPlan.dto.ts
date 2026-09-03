import { IsEnum, IsInt, IsOptional, Min } from "class-validator";

export enum AssignableBusinessPlan { FREE = "free", LEVEL_1 = "level_1", LEVEL_2 = "level_2", LEVEL_3 = "level_3" }
export class AssignBusinessPlanDto {
  @IsEnum(AssignableBusinessPlan) planCode!: AssignableBusinessPlan;
  @IsInt() @Min(1) @IsOptional() expectedVersion?: number;
}
