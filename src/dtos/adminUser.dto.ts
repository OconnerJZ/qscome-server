import { IsIn, IsOptional, IsString, MaxLength } from "class-validator";

export class UpdateAdminUserStatusDto {
  @IsIn(["active", "blocked"])
  status!: "active" | "blocked";

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class UpdateAdminUserRoleDto {
  @IsString()
  @MaxLength(50)
  role!: string;
}
