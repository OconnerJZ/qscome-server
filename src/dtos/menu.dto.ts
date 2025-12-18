import { IsString, IsOptional, IsBoolean, IsNumber, MinLength } from 'class-validator';

export class CreateMenuDto {
  @IsNumber()
  business_id!: number;

  @IsString()
  @MinLength(3)
  item_name!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  price!: number;

  @IsString()
  @IsOptional()
  image_url?: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsBoolean()
  @IsOptional()
  is_available?: boolean;
}