import { IsString, IsOptional, IsBoolean, IsArray, IsNumber, MinLength, MaxLength, IsEmail, IsPhoneNumber } from 'class-validator';

export class CreateBusinessDto {
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  business_name!: string;

  @IsPhoneNumber('MX')
  phone!: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  logo_url?: string;

  @IsBoolean()
  @IsOptional()
  has_delivery?: boolean;

  @IsArray()
  @IsNumber({}, { each: true })
  food_type!: number[];

  @IsOptional()
  locale?: {
    address: string;
    city: string;
    postalCode: string;
    latitude: number;
    longitude: number;
  };

  @IsArray()
  @IsOptional()
  schedule?: Array<{
    day: string;
    isClosed: boolean;
    opened?: string;
    closed?: string;
  }>;
}