import { IsString, IsNotEmpty, IsObject } from 'class-validator';

export class WebhookEventDto {
  @IsString()
  @IsNotEmpty()
  type: string;

  @IsObject()
  @IsNotEmpty()
  data: Record<string, any>;
}
