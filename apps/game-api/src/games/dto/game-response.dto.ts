import { GameType } from './create-game.dto';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Represents a player in a game
 */
export class GamePlayerDto {
  @ApiProperty({ description: 'Unique identifier for the player' })
  id: string;

  @ApiProperty({ description: 'User ID of the player, null for AI players', required: false })
  userId?: string;

  @ApiProperty({ description: 'Whether the player is an AI' })
  isAi: boolean;

  @ApiProperty({ description: 'Player role (e.g., white, black)' })
  role: string;

  @ApiProperty({ 
    description: 'Additional metadata for the player',
    example: { difficulty: 'beginner', drawOffered: false } 
  })
  metadata: Record<string, unknown>;
}

/**
 * Represents the current state of a game with detailed information
 */
export class GameStateDto {
  @ApiProperty({ description: 'Unique identifier for the game' })
  id: string;

  @ApiProperty({ description: 'The current game state (engine-specific)' })
  state: Record<string, unknown>;

  @ApiProperty({ description: 'List of players in the game', type: [GamePlayerDto] })
  players: GamePlayerDto[];

  @ApiProperty({ description: 'Result of the game if ended', required: false })
  result?: string;

  @ApiProperty({ description: 'Whether the current position is check' })
  isCheck: boolean;

  @ApiProperty({ description: 'Whether the current position is checkmate' })
  isCheckmate: boolean;

  @ApiProperty({ description: 'List of moves made in the game' })
  moves: string[];

  @ApiProperty({ description: 'The last move made in the game', required: false })
  lastMove?: string;

  @ApiProperty({ description: 'Whether a draw has been offered', required: false })
  drawOffered?: boolean;

  @ApiProperty({ description: 'Which player offered a draw (role)', required: false })
  drawOfferedBy?: string;
}

/**
 * Basic game information
 */
export class GameDto {
  @ApiProperty({ description: 'Unique identifier for the game' })
  id: string;

  @ApiProperty({ description: 'Type of game', enum: GameType })
  gameType: GameType;

  @ApiProperty({ description: 'Serialized state of the game' })
  state: string;

  @ApiProperty({ description: 'Result of the game if ended', required: false })
  result?: string;

  @ApiProperty({ description: 'When the game was created' })
  createdAt: Date;

  @ApiProperty({ description: 'When the game was last updated' })
  updatedAt: Date;

  @ApiProperty({ description: 'Players in the game', type: [GamePlayerDto] })
  players: GamePlayerDto[];
}

/**
 * Paginated list of games
 */
export class PaginatedGamesDto {
  @ApiProperty({ description: 'List of games', type: [GameDto] })
  items: GameDto[];

  @ApiProperty({ description: 'Total number of games' })
  total: number;

  @ApiProperty({ description: 'Current page number' })
  page: number;

  @ApiProperty({ description: 'Number of items per page' })
  limit: number;

  @ApiProperty({ description: 'Total number of pages' })
  totalPages: number;
}

/**
 * PGN notation for a chess game
 */
export class PgnDto {
  @ApiProperty({ description: 'PGN notation for the game' })
  pgn: string;
}
