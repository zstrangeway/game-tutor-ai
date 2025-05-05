import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { GameType } from './create-game.dto';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Data transfer object for querying games with filtering and pagination
 */
export class GetGamesDto {
  @ApiProperty({
    description: 'Filter games by type',
    enum: GameType,
    required: false
  })
  @IsOptional()
  @IsEnum(GameType)
  gameType?: GameType;

  @ApiProperty({
    description: 'Filter games by result (e.g., "1-0", "0-1", "1/2-1/2")',
    required: false,
    example: '1-0'
  })
  @IsOptional()
  @IsString()
  result?: string;

  @ApiProperty({
    description: 'Page number for pagination',
    required: false,
    minimum: 1,
    default: 1,
    example: 1
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({
    description: 'Number of items per page',
    required: false,
    minimum: 1,
    default: 10,
    example: 10
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;
}
