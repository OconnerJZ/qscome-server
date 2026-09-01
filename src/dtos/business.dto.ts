import { Transform, Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsLatitude,
  IsLongitude,
  IsNumber,
  IsOptional,
  IsPhoneNumber,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
  ValidateNested,
} from "class-validator";

const PAYMENT_METHODS = ["cash", "card", "wallet", "transfer"] as const;
export type BusinessPaymentType = (typeof PAYMENT_METHODS)[number];

const toCoordinateString = ({ value }: { value: unknown }) =>
  value === undefined || value === null || value === "" ? value : String(value);

export class BusinessLocationDto {
  @IsString()
  @MaxLength(255)
  @IsOptional()
  address?: string;

  @IsString()
  @MaxLength(255)
  @IsOptional()
  city?: string;

  @IsString()
  @MaxLength(20)
  @IsOptional()
  postal_code?: string;

  @Transform(toCoordinateString)
  @IsLatitude()
  @IsOptional()
  latitude?: string;

  @Transform(toCoordinateString)
  @IsLongitude()
  @IsOptional()
  longitude?: string;
}

export class BusinessScheduleDto {
  @IsString()
  @MinLength(2)
  @MaxLength(12)
  day!: string;

  @IsBoolean()
  @IsOptional()
  isClosed?: boolean;

  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  @ValidateIf((schedule: BusinessScheduleDto) => !schedule.isClosed)
  opened?: string;

  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  @ValidateIf((schedule: BusinessScheduleDto) => !schedule.isClosed)
  closed?: string;

  @IsBoolean()
  @IsOptional()
  isHoliday?: boolean;
}

export class CreateBusinessDto {
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  business_name!: string;

  @IsPhoneNumber("MX")
  phone!: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @MaxLength(255)
  @IsOptional()
  logo_url?: string;

  @IsBoolean()
  @IsOptional()
  has_delivery?: boolean;

  @IsArray()
  @ArrayMaxSize(20)
  @IsInt({ each: true })
  @Min(1, { each: true })
  food_type!: number[];

  @ValidateNested()
  @Type(() => BusinessLocationDto)
  @IsOptional()
  locale?: BusinessLocationDto;

  @IsArray()
  @ArrayMaxSize(7)
  @ValidateNested({ each: true })
  @Type(() => BusinessScheduleDto)
  @IsOptional()
  schedule?: BusinessScheduleDto[];
}

export class UpdateBusinessDto {
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  @IsOptional()
  business_name?: string;

  @IsPhoneNumber("MX")
  @ValidateIf((_object, value) => value !== undefined && value !== "")
  phone?: string;

  @IsEmail()
  @ValidateIf((_object, value) => value !== undefined && value !== "")
  email?: string;

  @IsString()
  @MaxLength(1000)
  @IsOptional()
  description?: string;

  @IsString()
  @MaxLength(255)
  @IsOptional()
  logo_url?: string;

  @IsString()
  @MaxLength(255)
  @IsOptional()
  banner_url?: string;

  @IsString()
  @MaxLength(500)
  @IsOptional()
  facebook_url?: string;

  @IsString()
  @MaxLength(500)
  @IsOptional()
  instagram_url?: string;

  @IsBoolean()
  @IsOptional()
  is_open?: boolean;

  @IsBoolean()
  @IsOptional()
  has_delivery?: boolean;

  @IsInt()
  @Min(0)
  @Max(1440)
  @IsOptional()
  prep_time_min?: number;

  @IsInt()
  @Min(0)
  @Max(1440)
  @IsOptional()
  estimated_delivery_min?: number;
}

export class UpdateBusinessLocationDto extends BusinessLocationDto {}

export class UpdateBusinessSchedulesDto {
  @IsArray()
  @ArrayMaxSize(7)
  @ValidateNested({ each: true })
  @Type(() => BusinessScheduleDto)
  schedules!: BusinessScheduleDto[];
}

export class UpdateBusinessDeliverySettingsDto {
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(1000)
  @IsOptional()
  delivery_radius_km?: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(1_000_000)
  @IsOptional()
  delivery_fee?: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(1_000_000)
  @IsOptional()
  min_order_amount?: number;

  @IsInt()
  @Min(0)
  @Max(1440)
  @IsOptional()
  estimated_time_min?: number;

  @IsBoolean()
  @IsOptional()
  use_own_delivery?: boolean;
}

export class TransferBankConfigDto {
  @IsString()
  @MaxLength(160)
  @IsOptional()
  accountHolder?: string;

  @IsString()
  @MaxLength(100)
  @IsOptional()
  bankName?: string;

  @Matches(/^\d{18}$/)
  @ValidateIf((_object, value) => value !== undefined && value !== "")
  clabe?: string;

  @Matches(/^\d{4,30}$/)
  @ValidateIf((_object, value) => value !== undefined && value !== "")
  accountNumber?: string;

  @IsString()
  @MaxLength(500)
  @IsOptional()
  referenceInstructions?: string;
}

export class BusinessPaymentMethodDto {
  @IsIn(PAYMENT_METHODS)
  method!: BusinessPaymentType;

  @IsBoolean()
  @IsOptional()
  is_active?: boolean;

  @ValidateNested()
  @Type(() => TransferBankConfigDto)
  @IsOptional()
  config?: TransferBankConfigDto;
}

export class UpdateBusinessPaymentMethodsDto {
  @Transform(({ value }) => Array.isArray(value)
    ? value.map((method) => typeof method === "string"
      ? Object.assign(new BusinessPaymentMethodDto(), { method, is_active: true })
      : method)
    : value)
  @IsArray()
  @ArrayMaxSize(PAYMENT_METHODS.length)
  @ValidateNested({ each: true })
  @Type(() => BusinessPaymentMethodDto)
  payment_methods!: BusinessPaymentMethodDto[];
}

export class UpdateBusinessFoodTypesDto {
  @IsArray()
  @ArrayMaxSize(20)
  @IsInt({ each: true })
  @Min(1, { each: true })
  food_type_ids!: number[];
}

export class AddBusinessPhotoDto {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  photo_url!: string;
}
