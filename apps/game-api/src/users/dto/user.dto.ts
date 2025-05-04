import {
  IsEmail,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  IsEnum,
  ValidateNested,
  IsNumber,
  IsBoolean,
  IsDate,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateProfileDto {
  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  username?: string;
}

export class PreferenceItemDto {
  @IsString()
  @IsOptional()
  theme?: string;

  @IsBoolean()
  @IsOptional()
  soundEnabled?: boolean;

  @IsBoolean()
  @IsOptional()
  notifications?: boolean;

  @IsNumber()
  @IsOptional()
  defaultTimeControl?: number;
}

export class UpdatePreferencesDto {
  @IsObject()
  @IsNotEmpty()
  @ValidateNested()
  @Type(() => PreferenceItemDto)
  preferences: PreferenceItemDto;
}

export class EloDto {
  @IsNumber()
  @IsOptional()
  chess?: number;

  @IsNumber()
  @IsOptional()
  checkers?: number;

  @IsNumber()
  @IsOptional()
  poker?: number;
}

export enum SubscriptionStatus {
  FREE = 'free',
  TRIAL = 'trial',
  STANDARD = 'standard',
  PREMIUM = 'premium',
}

export class UserResponseDto {
  @IsUUID()
  id: string;

  @IsEmail()
  email: string;

  @IsString()
  username: string;

  @IsObject()
  @ValidateNested()
  @Type(() => EloDto)
  elo: EloDto;

  @IsObject()
  @ValidateNested()
  @Type(() => PreferenceItemDto)
  preferences: PreferenceItemDto;

  @IsEnum(SubscriptionStatus)
  subscriptionStatus: SubscriptionStatus;

  @IsString()
  createdAt: string;

  @IsString()
  @IsOptional()
  updatedAt?: string;
}

export class UserStatsResponseDto {
  @IsUUID()
  userId: string;

  @IsString()
  username: string;

  @IsObject()
  @ValidateNested()
  @Type(() => EloDto)
  elo: EloDto;

  @IsNumber()
  totalGames: number;

  @IsNumber()
  wins: number;

  @IsNumber()
  losses: number;

  @IsNumber()
  draws: number;

  @IsNumber()
  winRate: number;
}

export class CreateUserDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  username: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsObject()
  @IsOptional()
  @ValidateNested()
  @Type(() => EloDto)
  elo?: EloDto;

  @IsObject()
  @IsOptional()
  @ValidateNested()
  @Type(() => PreferenceItemDto)
  preferences?: PreferenceItemDto;

  @IsEnum(SubscriptionStatus)
  @IsOptional()
  subscriptionStatus?: SubscriptionStatus;
}

export class UserProfileDto {
  @IsUUID()
  id: string;

  @IsString()
  username: string;

  @IsObject()
  @ValidateNested()
  @Type(() => EloDto)
  elo: EloDto;

  @IsNumber()
  @IsOptional()
  totalGames?: number;

  @IsNumber()
  @IsOptional()
  winRate?: number;
}

export class SubscriptionDto {
  @IsUUID()
  userId: string;

  @IsEnum(SubscriptionStatus)
  status: SubscriptionStatus;

  @IsString()
  @IsOptional()
  stripeCustomerId?: string;

  @IsString()
  @IsOptional()
  stripeSubscriptionId?: string;

  @IsDate()
  @IsOptional()
  @Type(() => Date)
  trialStartDate?: Date;

  @IsDate()
  @IsOptional()
  @Type(() => Date)
  trialEndDate?: Date;

  @IsDate()
  @IsOptional()
  @Type(() => Date)
  currentPeriodStart?: Date;

  @IsDate()
  @IsOptional()
  @Type(() => Date)
  currentPeriodEnd?: Date;

  @IsBoolean()
  @IsOptional()
  cancelAtPeriodEnd?: boolean;
}

export class SubscriptionInfo {
  @IsEnum(SubscriptionStatus)
  status: SubscriptionStatus;

  @IsDate()
  @IsOptional()
  @Type(() => Date)
  trialStartDate?: Date;

  @IsDate()
  @IsOptional()
  @Type(() => Date)
  trialEndDate?: Date;

  @IsDate()
  @IsOptional()
  @Type(() => Date)
  currentPeriodStart?: Date;

  @IsDate()
  @IsOptional()
  @Type(() => Date)
  currentPeriodEnd?: Date;

  @IsBoolean()
  @IsOptional()
  cancelAtPeriodEnd?: boolean;

  @IsString()
  @IsOptional()
  stripeCustomerId?: string;

  @IsString()
  @IsOptional()
  stripeSubscriptionId?: string;
}
