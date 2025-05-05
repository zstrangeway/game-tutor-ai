import { ApiProperty } from '@nestjs/swagger';

/**
 * Enum for AI player difficulty levels
 */
export enum AiDifficulty {
  BEGINNER = 'BEGINNER',
  INTERMEDIATE = 'INTERMEDIATE',
  ADVANCED = 'ADVANCED',
}

/**
 * Data transfer object for AI player
 */
export class AiPlayerDto {
  @ApiProperty({
    description: 'Unique identifier for the AI player',
    example: '734399fb-b601-4673-9dd9-d62d0993b534'
  })
  id: string;

  @ApiProperty({
    description: 'Name of the AI player',
    example: 'Beginner Bot'
  })
  name: string;

  @ApiProperty({
    description: 'Difficulty level of the AI player',
    enum: AiDifficulty,
    example: AiDifficulty.BEGINNER
  })
  difficulty: AiDifficulty | string;

  @ApiProperty({
    description: 'Description of the AI player',
    example: 'An easy opponent suitable for beginners'
  })
  description: string;
} 