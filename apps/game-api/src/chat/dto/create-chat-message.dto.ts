import {
  IsString,
  IsUUID,
  IsOptional,
  IsBoolean,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateChatMessageDto {
  @ApiProperty({ description: 'The game ID this message belongs to' })
  @IsUUID()
  gameId: string;

  @ApiPropertyOptional({
    description:
      'The user ID of the sender (system will use the authenticated user if not provided)',
  })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiProperty({ description: 'The message content', maxLength: 1000 })
  @IsString()
  @MaxLength(1000, { message: 'Message cannot exceed 1000 characters' })
  message: string;

  @ApiPropertyOptional({
    description: 'Whether this message is from the AI assistant',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isAi?: boolean = false;
}
