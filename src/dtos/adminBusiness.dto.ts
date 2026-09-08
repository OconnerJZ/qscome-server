import { IsBoolean, IsIn, IsOptional, IsString, MaxLength } from "class-validator";

export class UpdateAdminBusinessStatusDto {
  @IsIn(["active", "suspended"])
  status!: "active" | "suspended";

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class UpdateAdminBusinessVerificationDto {
  @IsBoolean()
  verified!: boolean;
}
