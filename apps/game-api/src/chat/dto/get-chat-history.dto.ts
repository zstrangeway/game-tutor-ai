import { IsUUID, IsOptional, IsInt, Min, Max, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GetChatHistoryDto {
  @ApiProperty({ description: 'The game ID to get chat history for' })
  @IsUUID()
  gameId: string;

  @ApiPropertyOptional({
    description: 'Number of messages to return (max 100)',
    default: 50,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit: number = 50;

  @ApiPropertyOptional({
    description: 'Number of messages to skip',
    default: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  offset: number = 0;

  @ApiPropertyOptional({
    description: 'Cursor for pagination (message ID to start after)',
  })
  @IsOptional()
  @IsString()
  cursor?: string;
}
