import { IsString, IsOptional, IsArray, IsNumber, IsPhoneNumber } from 'class-validator';

export class CreateOrderDto {
  @IsNumber()
  userId!: number;

  @IsNumber()
  businessId!: number;

  @IsArray()
  items!: Array<{
    id: number;
    name: string;
    price: number;
    quantity: number;
    note?: string;
  }>;

  @IsNumber()
  total!: number;

  @IsString()
  customerName!: string;

  @IsPhoneNumber('MX')
  customerPhone!: string;

  @IsString()
  deliveryAddress!: string;

  @IsString()
  @IsOptional()
  notes?: string;
}