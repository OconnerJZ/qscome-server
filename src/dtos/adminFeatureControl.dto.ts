import { IsIn, IsOptional, IsString, Length } from "class-validator";

export class UpdateFeatureControlOverrideDto {
  @IsOptional()
  @IsIn(["enabled", "read_only", "disabled", null])
  mode?: "enabled" | "read_only" | "disabled" | null;

  @IsString()
  @Length(3, 500)
  reason!: string;
}
