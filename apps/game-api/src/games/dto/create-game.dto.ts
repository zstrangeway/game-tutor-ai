import { IsEnum, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum GameType {
  CHESS = 'chess',
}

export enum OpponentType {
  AI = 'ai',
  PLAYER = 'player',
}

export enum GameDifficulty {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
}

export enum TimeControl {
  UNTIMED = 'untimed',
  RAPID = 'rapid', // 10 minutes
}

/**
 * Data transfer object for creating a new game
 */
export class CreateGameDto {
  @ApiProperty({
    description: 'Type of game to create',
    enum: GameType,
    example: GameType.CHESS,
  })
  @IsEnum(GameType)
  gameType: GameType;

  @ApiProperty({
    description: 'Type of opponent to play against',
    enum: OpponentType,
    example: OpponentType.AI,
  })
  @IsEnum(OpponentType)
  opponentType: OpponentType;

  @ApiProperty({
    description: 'Difficulty level of AI opponent',
    enum: GameDifficulty,
    example: GameDifficulty.BEGINNER,
    required: false,
  })
  @IsOptional()
  @IsEnum(GameDifficulty)
  difficulty?: GameDifficulty;

  @ApiProperty({
    description: 'Time control for the game',
    enum: TimeControl,
    example: TimeControl.UNTIMED,
    required: false,
    default: TimeControl.UNTIMED,
  })
  @IsOptional()
  @IsEnum(TimeControl)
  timeControl?: TimeControl = TimeControl.UNTIMED;
}
