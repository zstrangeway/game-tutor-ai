import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  OnModuleDestroy,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GamesService } from '../games/games.service';
import { UsersService } from '../users/users.service';
import { RedisService } from '../redis/redis.service';
import { JoinQueueDto, GameType } from './dto/join-queue.dto';
import { QueueResponseDto } from './dto/queue-response.dto';
import { QueueStatusDto } from './dto/queue-status.dto';
import { RematchRequestDto } from './dto/rematch-request.dto';
import { RematchResponseDto } from './dto/rematch-response.dto';
import { QueueEntry, ActiveGame } from './interfaces';
import { v4 as uuidv4 } from 'uuid';
import { GameStateDto, OpponentType, GameDifficulty } from '../games/dto';

// Define error type for better error handling
interface ErrorWithMessage {
  message: string;
  stack?: string;
}

// Define metadata type for opponent
interface OpponentMetadata {
  difficulty?: GameDifficulty;
  [key: string]: unknown;
}

@Injectable()
export class MultiplayerService implements OnModuleDestroy {
  private readonly logger = new Logger(MultiplayerService.name);
  private readonly matchmakingQueue = new Map<string, QueueEntry>();
  private readonly activeGames = new Map<string, ActiveGame>();
  private readonly rematchRequests = new Map<
    string,
    { requesterId: string; gameId: string; timestamp: Date }
  >();
  private intervalIds: NodeJS.Timeout[] = [];

  // Constants for matchmaking
  private readonly MATCHMAKING_INTERVAL_MS = 5000; // Check for matches every 5 seconds
  private readonly ELO_RANGE_INITIAL = 100; // Initial Elo range for matching
  private readonly ELO_RANGE_INCREMENT = 50; // How much to increase range each check
  private readonly ELO_RANGE_MAX = 400; // Maximum Elo range difference
  private readonly QUEUE_CLEANUP_INTERVAL_MS = 60000; // Clean up queue every minute
  private readonly QUEUE_MAX_WAIT_TIME_MS = 10 * 60 * 1000; // 10 minutes max wait time
  private readonly ACTIVE_GAME_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes timeout for inactive games
  private readonly REMATCH_REQUEST_TIMEOUT_MS = 2 * 60 * 1000; // 2 minutes timeout for rematch requests

  constructor(
    private readonly prisma: PrismaService,
    private readonly gamesService: GamesService,
    private readonly usersService: UsersService,
    private readonly redisService: RedisService,
  ) {
    // Start the matchmaking and cleanup intervals and store references
    this.intervalIds.push(setInterval(() => this.checkForMatches(), this.MATCHMAKING_INTERVAL_MS));
    this.intervalIds.push(setInterval(() => this.cleanupQueue(), this.QUEUE_CLEANUP_INTERVAL_MS));
    this.intervalIds.push(setInterval(() => this.cleanupActiveGames(), this.QUEUE_CLEANUP_INTERVAL_MS));
    this.intervalIds.push(setInterval(() => this.cleanupRematchRequests(), this.QUEUE_CLEANUP_INTERVAL_MS));
  }

  /**
   * Clean up resources when module is destroyed
   */
  onModuleDestroy() {
    // Clean up all intervals
    this.logger.log('Cleaning up multiplayer service resources');
    for (const interval of this.intervalIds) {
      clearInterval(interval);
    }
  }

  /**
   * Join the matchmaking queue
   * @param joinQueueDto - Data for joining the queue
   * @param userId - ID of the user joining the queue
   * @returns Queue response with status and estimated wait time
   */
  async joinQueue(
    joinQueueDto: JoinQueueDto,
    userId: string,
  ): Promise<QueueResponseDto> {
    this.logger.log(
      `User ${userId} joining queue for ${joinQueueDto.gameType}`,
    );

    // Check if user is already in queue
    const queueEntries = await this.redisService.getAllQueueEntries(`queue:${joinQueueDto.gameType}`);
    const existingEntry = queueEntries
      .map(entry => {
        try {
          return JSON.parse(entry);
        } catch (e) {
          this.logger.error(`Failed to parse queue entry: ${e.message}`);
          return null;
        }
      })
      .filter(Boolean)
      .find(entry => entry.userId === userId && entry.status === 'waiting');
    
    if (existingEntry) {
      this.logger.log(`User ${userId} is already in queue with ID ${existingEntry.id}`);
      return this.getQueueEntryResponse(existingEntry);
    }

    // Get user's Elo rating
    let eloRating: number;
    try {
      const user = await this.usersService.findById(userId);
      // Check if user has Elo for the game type
      const userElo = (user.elo as Record<string, number>) || {};
      eloRating = userElo[joinQueueDto.gameType] || 800; // Default to 800 if not set
    } catch (error) {
      const err = error as ErrorWithMessage;
      this.logger.error(`Error getting user Elo: ${err.message}`);
      eloRating = 800; // Default if there's an error
    }

    // Allow Elo override for testing/demo purposes if provided
    if (joinQueueDto.eloOverride) {
      const overrideValue = parseInt(joinQueueDto.eloOverride, 10);
      if (
        !isNaN(overrideValue) &&
        overrideValue >= 100 &&
        overrideValue <= 3000
      ) {
        eloRating = overrideValue;
        this.logger.log(
          `Using Elo override of ${eloRating} for user ${userId}`,
        );
      }
    }

    // Create queue entry
    const queueEntry: QueueEntry = {
      id: uuidv4(),
      userId,
      gameType: joinQueueDto.gameType,
      eloRating,
      joinedAt: new Date(),
      status: 'waiting',
    };

    // Store in Redis
    await this.redisService.addToQueue(`queue:${joinQueueDto.gameType}`, queueEntry);
    
    this.logger.log(
      `Added user ${userId} to queue with ID ${queueEntry.id} and Elo ${eloRating}`,
    );

    // Immediately check for a match
    await this.checkForMatches();

    return this.getQueueEntryResponse(queueEntry);
  }

  /**
   * Leave the matchmaking queue
   * @param userId - ID of the user leaving the queue
   * @returns Success message
   */
  async leaveQueue(
    userId: string,
  ): Promise<{ success: boolean; message: string }> {
    this.logger.log(`User ${userId} leaving queue`);

    let removed = false;
    const gameTypes = Object.values(GameType);
    
    // Check all queue types
    for (const gameType of gameTypes) {
      const entries = await this.redisService.getAllQueueEntries(`queue:${gameType}`);
      
      for (const entryStr of entries) {
        try {
          const entry = JSON.parse(entryStr);
          if (entry.userId === userId && entry.status === 'waiting') {
            // Remove from Redis
            await this.redisService.removeFromQueue(`queue:${gameType}`, entry.id);
            removed = true;
            this.logger.log(`Removed user ${userId} from queue with ID ${entry.id}`);
            break;
          }
        } catch (error) {
          this.logger.error(`Error parsing queue entry: ${error.message}`);
        }
      }
      
      if (removed) break;
    }

    if (!removed) {
      this.logger.log(
        `User ${userId} was not found in queue or was already matched`,
      );
      return { success: false, message: 'Not in queue or already matched' };
    }

    return { success: true, message: 'Successfully removed from queue' };
  }

  /**
   * Get the current status of a user in the queue
   * @param userId - ID of the user to check
   * @returns Queue status information
   */
  async getQueueStatus(userId: string): Promise<QueueStatusDto> {
    this.logger.log(`Getting queue status for user ${userId}`);

    // Check all game types
    for (const gameType of Object.values(GameType)) {
      const entries = await this.redisService.getAllQueueEntries(`queue:${gameType}`);
      
      // Parse entries and find the user
      let userEntry: QueueEntry | null = null;
      const parsedEntries: QueueEntry[] = [];
      
      for (const entryStr of entries) {
        try {
          const entry = JSON.parse(entryStr) as QueueEntry;
          
          if (entry.userId === userId) {
            userEntry = entry;
          }
          
          if (entry.status === 'waiting') {
            parsedEntries.push(entry);
          }
        } catch (error) {
          this.logger.error(`Error parsing queue entry: ${error.message}`);
        }
      }
      
      if (userEntry) {
        // Count position in queue
        let position = 1;
        const totalInQueueCount = parsedEntries.length;
        
        for (const entry of parsedEntries) {
          if (entry.joinedAt < userEntry.joinedAt) {
            position++;
          }
        }
        
        // If status is matched, include the game ID
        let gameId: string | undefined;
        if (userEntry.status === 'matched' && userEntry.gameId) {
          gameId = userEntry.gameId;
        }
        
        // Convert joinedAt to string if it's a Date object
        const joinedAt = userEntry.joinedAt instanceof Date 
          ? userEntry.joinedAt.toISOString() 
          : userEntry.joinedAt;
        
        return {
          inQueue: true,
          status: userEntry.status,
          position,
          estimatedWaitTimeSeconds: this.calculateEstimatedWaitTime(position),
          gameType: userEntry.gameType,
          queueId: userEntry.id,
          joinedAt,
          totalInQueue: totalInQueueCount,
          gameId,
        };
      }
    }
    
    // User not found in any queue
    return {
      inQueue: false,
      status: 'none',
      position: 0,
      estimatedWaitTimeSeconds: 0,
      gameType: null,
      queueId: null,
      joinedAt: null,
      totalInQueue: 0,
      gameId: null,
    };
  }

  /**
   * Get the count of active multiplayer games
   * @returns Count of active games
   */
  async getActiveGames(): Promise<{ count: number }> {
    const count = await this.redisService.countActiveGames();
    this.logger.log(`Active multiplayer games: ${count}`);
    return { count };
  }

  /**
   * Request a rematch with the same opponent
   * @param rematchRequestDto - Data for the rematch request
   * @param userId - ID of the user requesting the rematch
   * @returns Rematch response with status
   */
  async requestRematch(
    rematchRequestDto: RematchRequestDto,
    userId: string,
  ): Promise<RematchResponseDto> {
    const { gameId } = rematchRequestDto;
    this.logger.log(`User ${userId} requesting rematch for game ${gameId}`);

    try {
      // Verify the original game exists and is completed
      const game = await this.gamesService.getGame(gameId, userId);

      if (!game.result) {
        throw new BadRequestException(
          'Cannot request rematch for a game that is not completed',
        );
      }

      // Find the opponent
      const opponent = game.players.find((player) => player.userId !== userId);
      if (!opponent || !opponent.userId) {
        return {
          success: false,
          status: 'failed',
          message: 'No opponent found for rematch',
        };
      }

      // Check if opponent is AI
      if (opponent.isAi) {
        // For AI opponents, immediately create a new game
        // Type the metadata to improve safety
        const opponentMetadata = opponent.metadata as OpponentMetadata;
        const difficulty =
          opponentMetadata?.difficulty || GameDifficulty.BEGINNER;

        const newGame = await this.gamesService.createGame(
          {
            gameType: game.gameType as GameType,
            opponentType: OpponentType.AI,
            difficulty: difficulty,
          },
          userId,
        );

        return {
          success: true,
          gameId: newGame.id,
          status: 'accepted',
          message: 'New game created against AI opponent',
        };
      }

      // For human opponents, check if they also requested a rematch
      const opponentRequest = Array.from(this.rematchRequests.values()).find(
        (req) => req.requesterId === opponent.userId && req.gameId === gameId,
      );

      if (opponentRequest) {
        // Both players want a rematch, create a new game
        // Swap colors for fairness
        const playerColors = {
          [userId]:
            game.players.find((p) => p.userId === userId)?.role === 'white'
              ? 'black'
              : 'white',
          [opponent.userId]:
            game.players.find((p) => p.userId === opponent.userId)?.role ===
            'white'
              ? 'black'
              : 'white',
        };

        // Create new multiplayer game
        const newGame = await this.createMultiplayerGame(
          playerColors[userId] === 'white' ? userId : opponent.userId,
          playerColors[userId] === 'white' ? opponent.userId : userId,
          game.gameType as GameType,
        );

        // Clean up rematch requests for this game
        for (const [key, value] of this.rematchRequests.entries()) {
          if (value.gameId === gameId) {
            this.rematchRequests.delete(key);
          }
        }

        return {
          success: true,
          gameId: newGame,
          status: 'accepted',
          message: 'Rematch accepted, new game created',
        };
      } else {
        // Store this request
        const requestId = uuidv4();
        this.rematchRequests.set(requestId, {
          requesterId: userId,
          gameId,
          timestamp: new Date(),
        });

        return {
          success: true,
          status: 'pending',
          message: 'Rematch request sent to opponent',
        };
      }
    } catch (error) {
      const err = error as ErrorWithMessage;
      this.logger.error(`Error requesting rematch: ${err.message}`);
      return {
        success: false,
        status: 'error',
        message: err.message,
      };
    }
  }

  /**
   * Validate if a user has access to a specific game
   * @param userId - ID of the user to check
   * @param gameId - ID of the game to verify access
   * @returns Boolean indicating if the user has access
   */
  async validateGameAccess(userId: string, gameId: string): Promise<boolean> {
    try {
      // Use the games service to check if the user is a player in this game
      const game = await this.gamesService.getGame(gameId, userId);
      return game.players.some((player) => player.userId === userId);
    } catch (error) {
      const err = error as ErrorWithMessage;
      this.logger.error(`Error validating game access: ${err.message}`);
      return false;
    }
  }

  /**
   * Handle player disconnect during an active game
   * @param userId - ID of the disconnected user
   * @param gameId - ID of the game the user was in
   */
  handlePlayerDisconnect(userId: string, gameId: string): void {
    this.logger.log(`User ${userId} disconnected from game ${gameId}`);

    // Update last activity time for the game
    const activeGame = this.activeGames.get(gameId);
    if (activeGame) {
      activeGame.lastActivity = new Date();
      this.activeGames.set(gameId, activeGame);
    }

    // No immediate action needed, game will be handled by cleanup if abandoned too long
  }

  /**
   * Get the current state of a game
   * @param gameId - ID of the game to get state for
   * @returns Current game state
   */
  async getGameState(gameId: string): Promise<GameStateDto> {
    try {
      // Use the games service to get the current state
      // We'll use a dummy userId here since we've already validated access in the gateway
      const dummyUserId = 'system';
      return await this.gamesService.submitMove(gameId, 'status', dummyUserId);
    } catch (error) {
      const err = error as ErrorWithMessage;
      this.logger.error(`Error getting game state: ${err.message}`);
      throw new NotFoundException(`Game state not found: ${err.message}`);
    }
  }

  /**
   * Process a move in a multiplayer game
   * @param userId - ID of the user making the move
   * @param gameId - ID of the game
   * @param move - Chess move in algebraic notation
   * @returns Updated game state
   */
  async processMove(
    userId: string,
    gameId: string,
    move: string,
  ): Promise<GameStateDto> {
    try {
      // Update last activity time for the game
      const activeGame = this.activeGames.get(gameId);
      if (activeGame) {
        activeGame.lastActivity = new Date();
        this.activeGames.set(gameId, activeGame);
      }

      // Process the move through the games service
      return await this.gamesService.submitMove(gameId, move, userId);
    } catch (error) {
      const err = error as ErrorWithMessage;
      this.logger.error(`Error processing move: ${err.message}`);
      throw error;
    }
  }

  /**
   * Process a resignation in a multiplayer game
   * @param userId - ID of the user resigning
   * @param gameId - ID of the game
   * @returns Updated game state
   */
  async processResignation(
    userId: string,
    gameId: string,
  ): Promise<GameStateDto> {
    try {
      // Update last activity time for the game
      const activeGame = this.activeGames.get(gameId);
      if (activeGame) {
        activeGame.lastActivity = new Date();
        this.activeGames.set(gameId, activeGame);
      }

      // Process the resignation through the games service
      return await this.gamesService.resignGame(gameId, userId);
    } catch (error) {
      const err = error as ErrorWithMessage;
      this.logger.error(`Error processing resignation: ${err.message}`);
      throw error;
    }
  }

  /**
   * Offer a draw in a multiplayer game
   * @param userId - ID of the user offering the draw
   * @param gameId - ID of the game
   * @returns Updated game state
   */
  async offerDraw(userId: string, gameId: string): Promise<GameStateDto> {
    try {
      // Update last activity time for the game
      const activeGame = this.activeGames.get(gameId);
      if (activeGame) {
        activeGame.lastActivity = new Date();
        this.activeGames.set(gameId, activeGame);
      }

      // Process the draw offer through the games service
      return await this.gamesService.offerDraw(gameId, userId);
    } catch (error) {
      const err = error as ErrorWithMessage;
      this.logger.error(`Error offering draw: ${err.message}`);
      throw error;
    }
  }

  /**
   * Respond to a draw offer in a multiplayer game
   * @param userId - ID of the user responding to the draw offer
   * @param gameId - ID of the game
   * @param accept - Whether to accept the draw offer
   * @returns Updated game state
   */
  async respondToDraw(
    userId: string,
    gameId: string,
    accept: boolean,
  ): Promise<GameStateDto> {
    try {
      // Update last activity time for the game
      const activeGame = this.activeGames.get(gameId);
      if (activeGame) {
        activeGame.lastActivity = new Date();
        this.activeGames.set(gameId, activeGame);
      }

      // Process the draw response through the games service
      return await this.gamesService.respondToDraw(gameId, accept, userId);
    } catch (error) {
      const err = error as ErrorWithMessage;
      this.logger.error(`Error responding to draw: ${err.message}`);
      throw error;
    }
  }

  /**
   * Create a multiplayer game between two users
   * @param whitePlayerId - ID of the player with white pieces
   * @param blackPlayerId - ID of the player with black pieces
   * @param gameType - Type of game to create
   * @returns ID of the created game
   */
  async createMultiplayerGame(
    whitePlayerId: string,
    blackPlayerId: string,
    gameType: GameType,
  ): Promise<string> {
    this.logger.log(
      `Creating multiplayer game: ${whitePlayerId} vs ${blackPlayerId}`,
    );

    try {
      // Create a game with the first player (white)
      const initialGame = await this.gamesService.createGame(
        {
          gameType,
          opponentType: OpponentType.PLAYER,
        },
        whitePlayerId,
      );

      // Add the second player (black) to the game
      // This would normally be handled by a games service method, but we're simulating it here
      await this.prisma.gamePlayer.create({
        data: {
          gameId: initialGame.id,
          userId: blackPlayerId,
          isAi: false,
          role: 'black',
          metadata: {},
        },
      });

      this.logger.log(
        `Added black player ${blackPlayerId} to game ${initialGame.id}`,
      );

      // Track this as an active multiplayer game
      this.activeGames.set(initialGame.id, {
        gameId: initialGame.id,
        players: [whitePlayerId, blackPlayerId],
        lastActivity: new Date(),
      });

      return initialGame.id;
    } catch (error) {
      const err = error as ErrorWithMessage;
      this.logger.error(`Error creating multiplayer game: ${err.message}`);
      throw error;
    }
  }

  /**
   * Check for potential matches in the queue
   */
  private async checkForMatches(): Promise<void> {
    this.logger.debug('Checking for matches...');

    const chessQueue = await this.redisService.getAllQueueEntries(`queue:${GameType.CHESS}`);
    const parsedQueue: QueueEntry[] = [];

    for (const entryStr of chessQueue) {
      try {
        const entry = JSON.parse(entryStr) as QueueEntry;
        parsedQueue.push(entry);
      } catch (error) {
        this.logger.error(`Error parsing queue entry: ${error.message}`);
      }
    }

    if (parsedQueue.length < 2) {
      this.logger.debug(
        `Not enough players in chess queue (${parsedQueue.length})`,
      );
      return;
    }

    // Process chess matchmaking
    await this.processGameTypeQueue(parsedQueue, GameType.CHESS);
  }

  /**
   * Process matchmaking for a specific game type queue
   * @param queue - Sorted queue of players for a specific game type
   * @param gameType - Type of game to match for
   */
  private async processGameTypeQueue(queue: QueueEntry[], gameType: GameType): Promise<void> {
    const matchedPlayerIds = new Set<string>();

    // For each player, try to find an opponent
    for (let i = 0; i < queue.length; i++) {
      const player = queue[i];

      // Skip if already matched
      if (matchedPlayerIds.has(player.userId)) {
        continue;
      }

      // Calculate the Elo range based on wait time
      const playerJoinedAt = player.joinedAt instanceof Date 
        ? player.joinedAt.getTime() 
        : new Date(player.joinedAt).getTime();
        
      const waitTimeMs = Date.now() - playerJoinedAt;
      const waitTimeMinutes = waitTimeMs / 60000;
      const eloRange = Math.min(
        this.ELO_RANGE_INITIAL +
          this.ELO_RANGE_INCREMENT * Math.floor(waitTimeMinutes),
        this.ELO_RANGE_MAX,
      );

      // Find a match within the appropriate Elo range
      for (let j = 0; j < queue.length; j++) {
        if (i === j) continue;

        const opponent = queue[j];

        // Skip if already matched
        if (matchedPlayerIds.has(opponent.userId)) {
          continue;
        }

        // Check if Elo difference is within range
        const eloDiff = Math.abs(player.eloRating - opponent.eloRating);
        if (eloDiff <= eloRange) {
          // Match found!
          this.logger.log(
            `Match found: ${player.userId} (${player.eloRating}) vs ${opponent.userId} (${opponent.eloRating})`,
          );

          // Mark both players as matched
          matchedPlayerIds.add(player.userId);
          matchedPlayerIds.add(opponent.userId);

          // Update queue entries
          const playerEntry = this.matchmakingQueue.get(player.id);
          const opponentEntry = this.matchmakingQueue.get(opponent.id);

          if (playerEntry && opponentEntry) {
            playerEntry.status = 'matched';
            opponentEntry.status = 'matched';

            this.matchmakingQueue.set(player.id, playerEntry);
            this.matchmakingQueue.set(opponent.id, opponentEntry);

            // Create a new game
            // Randomly decide who plays white
            const isPlayerWhite = Math.random() < 0.5;
            const whitePlayerId = isPlayerWhite
              ? player.userId
              : opponent.userId;
            const blackPlayerId = isPlayerWhite
              ? opponent.userId
              : player.userId;

            // Create the game asynchronously
            this.createMultiplayerGame(whitePlayerId, blackPlayerId, gameType)
              .then((gameId) => {
                // Use the gateway to notify players
                // Since we don't have direct access to the gateway from the service,
                // this would typically be handled through an event emitter or similar pattern

                // Note: In the full implementation, MultiplayerGateway would be injected
                // and we'd call multiplayerGateway.notifyMatchFound(player.userId, opponent.userId, gameId)

                this.logger.log(`Game created: ${gameId}`);
              })
              .catch((error) => {
                const err = error as ErrorWithMessage;
                this.logger.error(`Error creating game: ${err.message}`);

                // Reset status if game creation fails
                if (this.matchmakingQueue.has(player.id)) {
                  const failedPlayerEntry = this.matchmakingQueue.get(
                    player.id,
                  );
                  if (failedPlayerEntry) {
                    failedPlayerEntry.status = 'waiting';
                    this.matchmakingQueue.set(player.id, failedPlayerEntry);
                  }
                }

                if (this.matchmakingQueue.has(opponent.id)) {
                  const failedOpponentEntry = this.matchmakingQueue.get(
                    opponent.id,
                  );
                  if (failedOpponentEntry) {
                    failedOpponentEntry.status = 'waiting';
                    this.matchmakingQueue.set(opponent.id, failedOpponentEntry);
                  }
                }
              });

            break;
          }
        }
      }
    }
  }

  /**
   * Clean up expired queue entries
   */
  private async cleanupQueue(): Promise<void> {
    const now = Date.now();
    let cleanupCount = 0;

    const queueEntries = await this.redisService.getAllQueueEntries(`queue:${GameType.CHESS}`);
    for (const entryStr of queueEntries) {
      try {
        const entry = JSON.parse(entryStr) as QueueEntry;
        
        // Convert joinedAt to timestamp
        const joinedAtTime = entry.joinedAt instanceof Date 
          ? entry.joinedAt.getTime() 
          : new Date(entry.joinedAt).getTime();
        
        // Remove entries that have been waiting too long
        if (
          entry.status === 'waiting' &&
          now - joinedAtTime > this.QUEUE_MAX_WAIT_TIME_MS
        ) {
          await this.redisService.removeFromQueue(`queue:${GameType.CHESS}`, entry.id);
          cleanupCount++;
          this.logger.log(
            `Cleaned up expired queue entry: ${entry.id} for user ${entry.userId}`,
          );
        }

        // Remove matched entries after some time
        if (
          entry.status === 'matched' &&
          now - joinedAtTime > this.QUEUE_MAX_WAIT_TIME_MS * 2
        ) {
          await this.redisService.removeFromQueue(`queue:${GameType.CHESS}`, entry.id);
          cleanupCount++;
          this.logger.log(
            `Cleaned up matched queue entry: ${entry.id} for user ${entry.userId}`,
          );
        }
      } catch (error) {
        this.logger.error(`Error parsing queue entry: ${error.message}`);
      }
    }

    if (cleanupCount > 0) {
      this.logger.log(`Cleaned up ${cleanupCount} queue entries`);
    }
  }

  /**
   * Clean up inactive games
   */
  private async cleanupActiveGames(): Promise<void> {
    const now = Date.now();
    let cleanupCount = 0;

    // Get all active game IDs
    const gameIds = await this.redisService.getActiveGameIds();
    
    for (const gameId of gameIds) {
      const game = await this.redisService.getActiveGame(gameId);
      
      if (!game) continue;
      
      // Check if game has been inactive for too long
      if (now - new Date(game.lastActivity).getTime() > this.ACTIVE_GAME_TIMEOUT_MS) {
        await this.redisService.removeActiveGame(gameId);
        cleanupCount++;
        this.logger.log(`Cleaned up inactive game: ${gameId}`);
      }
    }

    if (cleanupCount > 0) {
      this.logger.log(`Cleaned up ${cleanupCount} inactive games`);
    }
  }

  /**
   * Clean up expired rematch requests
   */
  private async cleanupRematchRequests(): Promise<void> {
    const now = Date.now();
    let cleanupCount = 0;

    const rematchRequests = await this.redisService.getAllRematchRequests();
    
    for (const [requestId, request] of rematchRequests) {
      // Check if request has expired
      if (now - new Date(request.timestamp).getTime() > this.REMATCH_REQUEST_TIMEOUT_MS) {
        await this.redisService.removeRematchRequest(requestId);
        cleanupCount++;
        this.logger.log(`Cleaned up expired rematch request: ${requestId}`);
      }
    }

    if (cleanupCount > 0) {
      this.logger.log(`Cleaned up ${cleanupCount} expired rematch requests`);
    }
  }

  /**
   * Calculate estimated wait time based on queue position and game type
   * @param position - Position in queue
   * @returns Estimated wait time in seconds
   */
  private calculateEstimatedWaitTime(position: number): number {
    // This is a simplified estimation
    // In a real system, this would be based on historical matching data
    const baseWaitTime = 30; // 30 seconds base wait
    const positionMultiplier = 15; // 15 seconds per position

    return baseWaitTime + position * positionMultiplier;
  }

  /**
   * Get a queue entry response DTO from a queue entry
   * @param entry - Queue entry to convert
   * @returns Queue response DTO
   */
  private async getQueueEntryResponse(entry: QueueEntry): Promise<QueueResponseDto> {
    // Calculate position based on join time
    let position = 1;
    let totalInQueue = 0;

    const queueEntries = await this.redisService.getAllQueueEntries(`queue:${entry.gameType}`);
    
    for (const queueEntryStr of queueEntries) {
      try {
        const queueEntry = JSON.parse(queueEntryStr) as QueueEntry;
        
        // Ensure dates are properly parsed
        const entryJoinedAt = queueEntry.joinedAt instanceof Date 
          ? queueEntry.joinedAt 
          : new Date(queueEntry.joinedAt);
        
        const currentJoinedAt = entry.joinedAt instanceof Date
          ? entry.joinedAt
          : new Date(entry.joinedAt);
        
        if (queueEntry.status === 'waiting') {
          totalInQueue++;
          
          if (entryJoinedAt < currentJoinedAt) {
            position++;
          }
        }
      } catch (error) {
        this.logger.error(`Error parsing queue entry: ${error.message}`);
      }
    }

    // Ensure the joinedAt is properly converted to ISO string
    const joinedAtStr = entry.joinedAt instanceof Date
      ? entry.joinedAt.toISOString()
      : new Date(entry.joinedAt).toISOString();

    return {
      queueId: entry.id,
      status: entry.status,
      position,
      estimatedWaitTimeSeconds: this.calculateEstimatedWaitTime(position),
      joinedAt: joinedAtStr,
      totalInQueue,
      gameType: entry.gameType,
      gameId: entry.gameId,
      inQueue: true,
    };
  }
}
