import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ChessEngine } from './engines/chess-engine';
import {
  CreateGameDto,
  GameDto,
  GamePlayerDto,
  GameStateDto,
  GameType,
  GetGamesDto,
  OpponentType,
  PaginatedGamesDto,
  PgnDto,
} from './dto';
import { Chess } from 'chess.js';
import { Game, GamePlayer } from '@prisma/client';
import {
  GameEndedException,
  GameNotFoundException,
  InvalidMoveException,
  NoDrawOfferedException,
  NotPlayerTurnException,
  PlayerNotInGameException,
} from './exceptions/games.exceptions';

// Use type assertion approach to handle Prisma data
type GameWithPlayers = Game & {
  gamePlayers: GamePlayer[];
};

// Type for player metadata
interface PlayerMetadata {
  difficulty?: string;
  drawOffered?: boolean;
  drawOfferedBy?: string;
  [key: string]: any;
}

// Type for game state mapping
interface ChessGameState {
  fen: () => string;
  turn: () => 'w' | 'b';
  inCheck: () => boolean;
  isCheckmate: () => boolean;
  history: () => string[];
}

/**
 * Service responsible for game-related operations
 */
@Injectable()
export class GamesService {
  private readonly logger = new Logger(GamesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly chessEngine: ChessEngine,
  ) {}

  /**
   * Create a new game
   * @param createGameDto - Data for creating a new game
   * @param userId - ID of the user creating the game
   * @returns Created game data
   */
  async createGame(
    createGameDto: CreateGameDto,
    userId: string,
  ): Promise<GameDto> {
    this.logger.log(
      `Creating game for user ${userId} with options: ${JSON.stringify(createGameDto)}`,
    );

    // Initialize the appropriate game engine based on game type
    let initialState;
    switch (createGameDto.gameType) {
      case GameType.CHESS:
        initialState = this.chessEngine.getInitialState();
        break;
      default:
        throw new Error(
          `Unsupported game type: ${String(createGameDto.gameType)}`,
        );
    }

    // Serialize the state for database storage
    const serializedState = this.chessEngine.serializeState(initialState);
    this.logger.debug(`Initial game state: ${serializedState}`);

    try {
      // For AI games, create the game and AI player in a transaction
      if (createGameDto.opponentType === OpponentType.AI) {
        return await this.prisma.$transaction(async (tx) => {
          // Create a new game in the database
          const game = await tx.game.create({
            data: {
              gameType: createGameDto.gameType,
              state: serializedState,
              gamePlayers: {
                create: [
                  {
                    userId: userId,
                    isAi: false,
                    role: 'white', // User always plays as white for now
                    metadata: {},
                  },
                ],
              },
            },
            include: {
              gamePlayers: true,
            },
          });

          this.logger.debug(`Game created with ID: ${game.id}`);
          
          // Add the AI player
          const aiPlayer = await tx.gamePlayer.create({
            data: {
              gameId: game.id,
              isAi: true,
              role: 'black',
              metadata: {
                difficulty: createGameDto.difficulty || 'beginner',
              },
            },
          });
          
          this.logger.debug(`AI player created: ${JSON.stringify(aiPlayer)}`);

          // Reload the game with the AI player included
          const updatedGame = await tx.game.findUnique({
            where: { id: game.id },
            include: {
              gamePlayers: true,
            },
          });

          if (!updatedGame) {
            this.logger.error(`Failed to reload game after adding AI player`);
            return this.mapGameToDto(game);
          }

          this.logger.debug(`Game reloaded with all players`);
          return this.mapGameToDto(updatedGame);
        });
      } else {
        // For multiplayer games, just create the game with the first player
        const game = await this.prisma.game.create({
          data: {
            gameType: createGameDto.gameType,
            state: serializedState,
            gamePlayers: {
              create: [
                {
                  userId: userId,
                  isAi: false,
                  role: 'white', // First player is white for now
                  metadata: {},
                },
              ],
            },
          },
          include: {
            gamePlayers: true,
          },
        });

        this.logger.debug(`Multiplayer game created with ID: ${game.id}`);
        return this.mapGameToDto(game);
      }
    } catch (error) {
      this.logger.error(`Error creating game: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get a paginated list of games for a user
   * @param queryParams - Query parameters for filtering and pagination
   * @param userId - ID of the user retrieving games
   * @returns Paginated list of games
   */
  async getGames(
    queryParams: GetGamesDto,
    userId: string,
  ): Promise<PaginatedGamesDto> {
    const { page = 1, limit = 10, gameType, result } = queryParams;
    const skip = (page - 1) * limit;

    this.logger.debug(
      `Getting games for user ${userId} with params: ${JSON.stringify(
        queryParams,
      )}`,
    );

    // Build filter conditions
    const where = {
      gamePlayers: {
        some: {
          userId,
        },
      },
      ...(gameType && { gameType }),
      ...(result && { result }),
    };

    try {
      // Get paginated games
      const [games, total] = await Promise.all([
        this.prisma.game.findMany({
          where,
          include: {
            gamePlayers: true,
          },
          orderBy: {
            updatedAt: 'desc',
          },
          skip,
          take: limit,
        }),
        this.prisma.game.count({ where }),
      ]);

      this.logger.debug(`Found ${games.length} games for user ${userId}`);

      return {
        items: games.map((game) => this.mapGameToDto(game)),
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      this.logger.error(`Error getting games: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get a specific game by ID
   * @param id - ID of the game to retrieve
   * @param userId - ID of the user retrieving the game
   * @returns Game data
   */
  async getGame(id: string, userId: string): Promise<GameDto> {
    this.logger.debug(`Getting game ${id} for user ${userId}`);
    const game = await this.findGameById(id, userId);
    return this.mapGameToDto(game);
  }

  /**
   * Submit a move in a game
   * @param id - ID of the game
   * @param move - The move in algebraic notation
   * @param userId - ID of the user making the move
   * @returns Updated game state
   */
  async submitMove(
    id: string,
    move: string,
    userId: string,
  ): Promise<GameStateDto> {
    this.logger.debug(`User ${userId} submitting move "${move}" in game ${id}`);
    
    const game = await this.findGameById(id, userId);

    // Check if game is already ended
    if (game.result) {
      this.logger.warn(`Attempted move in ended game ${id}`);
      throw new GameEndedException();
    }

    // Find the player making the move
    const player = game.gamePlayers.find((p) => p.userId === userId);
    if (!player) {
      this.logger.warn(`User ${userId} is not a player in game ${id}`);
      throw new PlayerNotInGameException();
    }

    // Deserialize the game state
    const gameState = this.chessEngine.deserializeState(game.state);

    // Make sure it's the player's turn
    const currentTurn = gameState.turn() === 'w' ? 'white' : 'black';
    if (player.role !== currentTurn) {
      this.logger.warn(
        `Not ${player.role}'s turn in game ${id}, current turn: ${currentTurn}`,
      );
      throw new NotPlayerTurnException();
    }

    // Validate and apply the move
    if (!this.chessEngine.validateMove(gameState, move)) {
      this.logger.warn(`Invalid move "${move}" in game ${id}`);
      throw new InvalidMoveException(move);
    }

    const newState = this.chessEngine.applyMove(gameState, move);
    
    // Check if the game has ended
    const endStatus = this.chessEngine.checkGameEnd(newState);
    
    try {
      // Update the game in the database
      const updatedGame = await this.prisma.game.update({
        where: { id },
        data: {
          state: this.chessEngine.serializeState(newState),
          ...(endStatus.isEnded && { result: endStatus.result }),
        },
        include: {
          gamePlayers: true,
        },
      });

      this.logger.debug(
        `Move "${move}" successfully applied in game ${id}${
          endStatus.isEnded ? `, game ended with result: ${endStatus.result}` : ''
        }`,
      );

      return this.mapGameToStateDto(updatedGame, newState);
    } catch (error) {
      this.logger.error(
        `Error applying move ${move} in game ${id}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Resign from a game
   * @param id - ID of the game
   * @param userId - ID of the user resigning
   * @returns Updated game state
   */
  async resignGame(id: string, userId: string): Promise<GameStateDto> {
    this.logger.debug(`User ${userId} resigning from game ${id}`);
    
    const game = await this.findGameById(id, userId);

    // Check if game is already ended
    if (game.result) {
      this.logger.warn(`Attempted to resign ended game ${id}`);
      throw new GameEndedException();
    }

    // Find the player resigning
    const player = game.gamePlayers.find((p) => p.userId === userId);
    if (!player) {
      this.logger.warn(`User ${userId} is not a player in game ${id}`);
      throw new PlayerNotInGameException();
    }

    // Set the result based on who resigned
    const result = player.role === 'white' ? '0-1' : '1-0';

    try {
      // Update the game in the database
      const updatedGame = await this.prisma.game.update({
        where: { id },
        data: {
          result,
        },
        include: {
          gamePlayers: true,
        },
      });

      this.logger.debug(
        `User ${userId} (${player.role}) resigned game ${id}, result: ${result}`,
      );

      const gameState = this.chessEngine.deserializeState(updatedGame.state);
      return this.mapGameToStateDto(updatedGame, gameState);
    } catch (error) {
      this.logger.error(
        `Error resigning game ${id}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Offer a draw in a game
   * @param id - ID of the game
   * @param userId - ID of the user offering the draw
   * @returns Updated game state
   */
  async offerDraw(id: string, userId: string): Promise<GameStateDto> {
    this.logger.debug(`User ${userId} offering draw in game ${id}`);
    
    const game = await this.findGameById(id, userId);

    // Check if game is already ended
    if (game.result) {
      this.logger.warn(`Attempted to offer draw in ended game ${id}`);
      throw new GameEndedException();
    }

    // Find the player offering draw
    const player = game.gamePlayers.find((p) => p.userId === userId);
    if (!player) {
      this.logger.warn(`User ${userId} is not a player in game ${id}`);
      throw new PlayerNotInGameException();
    }

    try {
      // Update the game metadata to include draw offer
      const updatedGame = await this.prisma.game.update({
        where: { id },
        data: {
          gamePlayers: {
            updateMany: {
              where: { gameId: id },
              data: {
                metadata: {
                  drawOffered: true,
                  drawOfferedBy: player.role,
                },
              },
            },
          },
        },
        include: {
          gamePlayers: true,
        },
      });

      this.logger.debug(
        `Draw offered by user ${userId} (${player.role}) in game ${id}`,
      );

      const gameState = this.chessEngine.deserializeState(updatedGame.state);
      return this.mapGameToStateDto(updatedGame, gameState);
    } catch (error) {
      this.logger.error(
        `Error offering draw in game ${id}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Respond to a draw offer
   * @param id - ID of the game
   * @param accept - Whether to accept the draw offer
   * @param userId - ID of the user responding to the draw offer
   * @returns Updated game state
   */
  async respondToDraw(
    id: string,
    accept: boolean,
    userId: string,
  ): Promise<GameStateDto> {
    this.logger.debug(
      `User ${userId} responding to draw offer in game ${id}, accept: ${accept}`,
    );
    
    const game = await this.findGameById(id, userId);

    // Check if game is already ended
    if (game.result) {
      this.logger.warn(`Attempted to respond to draw in ended game ${id}`);
      throw new GameEndedException();
    }

    // Find the player responding to draw
    const player = game.gamePlayers.find((p) => p.userId === userId);
    if (!player) {
      this.logger.warn(`User ${userId} is not a player in game ${id}`);
      throw new PlayerNotInGameException();
    }

    // Check if a draw was offered
    const drawOfferedBy = game.gamePlayers.find((p) => {
      const metadata = p.metadata as Record<string, any>;
      return metadata?.drawOffered && metadata?.drawOfferedBy !== player.role;
    });

    if (!drawOfferedBy) {
      this.logger.warn(`No draw has been offered in game ${id}`);
      throw new NoDrawOfferedException();
    }

    try {
      if (accept) {
        // Accept the draw - update the game in a transaction
        const updatedGame = await this.prisma.game.update({
          where: { id },
          data: {
            result: '1/2-1/2',
            gamePlayers: {
              updateMany: {
                where: { gameId: id },
                data: {
                  metadata: {
                    drawOffered: false,
                    drawOfferedBy: null,
                  },
                },
              },
            },
          },
          include: {
            gamePlayers: true,
          },
        });

        this.logger.debug(
          `Draw accepted by user ${userId} (${player.role}) in game ${id}`,
        );

        const gameState = this.chessEngine.deserializeState(updatedGame.state);
        return this.mapGameToStateDto(updatedGame, gameState);
      } else {
        // Reject the draw
        const updatedGame = await this.prisma.game.update({
          where: { id },
          data: {
            gamePlayers: {
              updateMany: {
                where: { gameId: id },
                data: {
                  metadata: {
                    drawOffered: false,
                    drawOfferedBy: null,
                  },
                },
              },
            },
          },
          include: {
            gamePlayers: true,
          },
        });

        this.logger.debug(
          `Draw rejected by user ${userId} (${player.role}) in game ${id}`,
        );

        const gameState = this.chessEngine.deserializeState(updatedGame.state);
        return this.mapGameToStateDto(updatedGame, gameState);
      }
    } catch (error) {
      this.logger.error(
        `Error responding to draw in game ${id}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Get the PGN notation for a game (premium feature)
   * @param id - ID of the game
   * @param userId - ID of the user requesting the PGN
   * @returns PGN notation
   */
  async getPgn(id: string, userId: string): Promise<PgnDto> {
    this.logger.debug(`User ${userId} requesting PGN for game ${id}`);
    const game = await this.findGameById(id, userId);
    return { pgn: game.state };
  }

  /**
   * Find a game by ID and verify user access
   * @param id - ID of the game to find
   * @param userId - ID of the user accessing the game
   * @returns Game with players
   * @throws GameNotFoundException if game not found
   * @throws UnauthorizedException if user doesn't have access
   */
  private async findGameById(id: string, userId: string): Promise<GameWithPlayers> {
    this.logger.debug(`Looking for game with ID: ${id} for user: ${userId}`);
    
    // First try to find the game without user check to see if it exists at all
    const gameExists = await this.prisma.game.findUnique({
      where: { id },
    });
    
    if (!gameExists) {
      this.logger.warn(`Game with ID ${id} not found`);
      throw new GameNotFoundException(id);
    }
    
    // Now check if the user is a player in this game
    const gameWithPlayers = await this.prisma.game.findUnique({
      where: { id },
      include: {
        gamePlayers: true,
      },
    });
    
    if (!gameWithPlayers) {
      this.logger.warn(`Game with ID ${id} not found with players`);
      throw new GameNotFoundException(id);
    }
    
    // Check if the user is a player in this game (more permissive check)
    const isPlayer = gameWithPlayers.gamePlayers.some(
      (player) => player.userId === userId || player.userId === null, // Allow AI games
    );
    
    if (!isPlayer) {
      this.logger.warn(`User ${userId} doesn't have access to game ${id}`);
      throw new PlayerNotInGameException();
    }
    
    return gameWithPlayers;
  }

  /**
   * Map a game entity to a DTO
   * @param game - Game entity with players
   * @returns Game DTO
   */
  private mapGameToDto(game: GameWithPlayers): GameDto {
    return {
      id: game.id,
      gameType: game.gameType as GameType,
      state: game.state,
      result: game.result ?? undefined,
      createdAt: game.createdAt,
      updatedAt: game.updatedAt,
      players: game.gamePlayers.map((player) => this.mapPlayerToDto(player)),
    };
  }

  /**
   * Map a player entity to a DTO
   * @param player - Player entity
   * @returns Player DTO
   */
  private mapPlayerToDto(player: GamePlayer): GamePlayerDto {
    return {
      id: player.id,
      userId: player.userId ?? undefined,
      isAi: player.isAi,
      role: player.role,
      metadata: player.metadata as Record<string, unknown>,
    };
  }

  /**
   * Map a game entity and chess state to a game state DTO
   * @param game - Game entity with players
   * @param gameState - Chess game state
   * @returns Game state DTO
   */
  private mapGameToStateDto(
    game: GameWithPlayers,
    gameState: Chess,
  ): GameStateDto {
    const playerWithDrawOffer = game.gamePlayers.find((player) => {
      const metadata = player.metadata as PlayerMetadata;
      return Boolean(metadata?.drawOffered);
    });
    
    const drawOfferedByValue = playerWithDrawOffer
      ? ((playerWithDrawOffer.metadata as PlayerMetadata)
          ?.drawOfferedBy as string | undefined)
      : undefined;

    // Create a safe object with just the properties we need
    const gameStateObj: Record<string, unknown> = {
      fen: gameState.fen(),
      turn: gameState.turn(),
      inCheck: gameState.inCheck(),
      isCheckmate: gameState.isCheckmate(),
      history: gameState.history()
    };

    return {
      id: game.id,
      state: gameStateObj,
      players: game.gamePlayers.map((player) => this.mapPlayerToDto(player)),
      result: game.result ?? undefined,
      isCheck: gameState.inCheck(),
      isCheckmate: gameState.isCheckmate(),
      moves: gameState.history(),
      lastMove: gameState.history().pop(),
      drawOffered: game.gamePlayers.some((player) => {
        const metadata = player.metadata as PlayerMetadata;
        return Boolean(metadata?.drawOffered);
      }),
      drawOfferedBy: drawOfferedByValue,
    };
  }
}
