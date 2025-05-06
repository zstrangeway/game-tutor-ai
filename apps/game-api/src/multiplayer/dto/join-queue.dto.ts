import { IsEnum, IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum GameType {
  CHESS = 'chess',
}

export class JoinQueueDto {
  @ApiProperty({
    description: 'The type of game to queue for',
    enum: GameType,
    example: GameType.CHESS,
  })
  @IsEnum(GameType)
  gameType: GameType;

  @ApiProperty({
    description: 'User-provided Elo rating override (optional)',
    required: false,
    example: 1200,
  })
  @IsOptional()
  @IsString()
  eloOverride?: string;
}
