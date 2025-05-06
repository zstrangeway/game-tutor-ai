import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateSubscriptionDto {
  @IsString()
  @IsNotEmpty()
  planId: string;

  @IsString()
  @IsNotEmpty()
  paymentMethodId: string;

  @IsString()
  @IsOptional()
  couponCode?: string;
}
