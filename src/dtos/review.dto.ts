import { IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from "class-validator";

export class CreateVerifiedReviewDto {
  @IsInt()
  @Min(1)
  orderId!: number;

  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @IsString()
  @MaxLength(1000)
  @IsOptional()
  comment?: string;

  @IsInt()
  @Min(1)
  @Max(5)
  @IsOptional()
  foodRating?: number;

  @IsInt()
  @Min(1)
  @Max(5)
  @IsOptional()
  timeRating?: number;

  @IsInt()
  @Min(1)
  @Max(5)
  @IsOptional()
  presentationRating?: number;

  @IsInt()
  @Min(1)
  @Max(5)
  @IsOptional()
  accuracyRating?: number;
}

export class RespondToReviewDto {
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  response!: string;
}
