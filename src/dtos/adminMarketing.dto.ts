import { IsIn, IsString, MaxLength, MinLength } from "class-validator";

export class ModerateAdminAdDto {
  @IsIn(["approved", "rejected"])
  decision!: "approved" | "rejected";

  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason!: string;
}

export class AdminMarketingInterventionDto {
  @IsIn(["paused", "ended"])
  status!: "paused" | "ended";

  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason!: string;
}
