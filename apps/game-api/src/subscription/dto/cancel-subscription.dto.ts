import { IsBoolean, IsOptional } from 'class-validator';

export class CancelSubscriptionDto {
  @IsBoolean()
  @IsOptional()
  cancelAtPeriodEnd?: boolean = true;
}
