import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { PrismaService } from '../prisma/prisma.service';
import { CreateChatMessageDto } from './dto/create-chat-message.dto';
import { ChatMessageResponseDto } from './dto/chat-message-response.dto';
import { GetChatHistoryDto } from './dto/get-chat-history.dto';
import { ChatGateway } from './gateways/chat.gateway';
import { LoggerService } from '../common/services/logger.service';
import { AiService } from '../ai/ai.service';
import { SubscriptionService } from '../subscription/subscription.service';
import { Cache } from 'cache-manager';
import { Prisma } from '@prisma/client';

interface GameState {
  pgn: string;
  fen: string;
  turn: 'white' | 'black';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

// Define a type for the game state object
interface GameStateData {
  pgn?: string;
  fen?: string;
  turn?: 'white' | 'black';
  moves?: string[];
  [key: string]: any;
}

// Define a type for error objects
interface ErrorWithMessage {
  message: string;
  stack?: string;
}

@Injectable()
export class ChatService {
  // Simple profanity filter - in production, consider using a more robust solution or AI moderation API
  private readonly profanityList = [
    'fuck',
    'shit',
    'ass',
    'bitch',
    'cunt',
    'dick',
    'asshole',
    'pussy',
    // Add more as needed
  ];

  // Metric counters
  private messageCount = 0;
  private aiMessageCount = 0;
  private moderationBlockCount = 0;

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
    private readonly subscriptionService: SubscriptionService,
    private readonly logger: LoggerService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    @Inject(forwardRef(() => ChatGateway))
    private readonly chatGateway?: ChatGateway,
  ) {
    this.logger.setContext('ChatService');

    // Reset metrics periodically
    setInterval(
      () => {
        this.logMetrics();
        this.resetMetrics();
      },
      60 * 60 * 1000,
    ); // hourly
  }

  private logMetrics(): void {
    this.logger.log(`
      Chat metrics (last hour):
      - Total messages: ${this.messageCount}
      - AI messages: ${this.aiMessageCount}
      - Blocked by moderation: ${this.moderationBlockCount}
    `);
  }

  private resetMetrics(): void {
    this.messageCount = 0;
    this.aiMessageCount = 0;
    this.moderationBlockCount = 0;
  }

  private moderateContent(message: string): {
    isValid: boolean;
    moderatedMessage?: string;
  } {
    // Don't moderate AI messages
    if (!message) {
      return { isValid: false };
    }

    // Check for profanity
    const lowerMessage = message.toLowerCase();

    for (const word of this.profanityList) {
      if (lowerMessage.includes(word)) {
        this.moderationBlockCount++;
        // Option 1: Block the message entirely
        return { isValid: false };

        // Option 2: Censor the message (remove this comment to use this approach)
        // const regex = new RegExp(word, 'gi');
        // message = message.replace(regex, '*'.repeat(word.length));
      }
    }

    // Check message length
    if (message.length > 1000) {
      message = message.substring(0, 1000);
    }

    return { isValid: true, moderatedMessage: message };
  }

  async createMessage(
    createChatMessageDto: CreateChatMessageDto,
    currentUserId?: string,
  ): Promise<ChatMessageResponseDto> {
    const { gameId, userId, message, isAi } = createChatMessageDto;

    // Increment message counter
    this.messageCount++;
    if (isAi) {
      this.aiMessageCount++;
    }

    // Skip moderation for AI messages
    if (!isAi) {
      const moderationResult = this.moderateContent(message);

      if (!moderationResult.isValid) {
        throw new BadRequestException('Message contains inappropriate content');
      }

      // Use the moderated message if provided
      if (moderationResult.moderatedMessage) {
        createChatMessageDto.message = moderationResult.moderatedMessage;
      }
    }

    // Validate game exists
    const game = await this.prisma.game.findUnique({
      where: { id: gameId },
      include: { gamePlayers: true },
    });

    if (!game) {
      this.logger.warn(
        `Attempted to create message for non-existent game: ${gameId}`,
      );
      throw new NotFoundException('Game not found');
    }

    // If not AI message, validate user is a player in the game
    if (!isAi && currentUserId) {
      const isPlayerInGame = game.gamePlayers.some(
        (player) => player.userId === currentUserId,
      );

      if (!isPlayerInGame) {
        this.logger.warn(
          `User ${currentUserId} attempted to send message in game ${gameId} but is not a player`,
        );
        throw new ForbiddenException('User is not a player in this game');
      }
    }

    try {
      // Create the chat message
      const chatMessage = await this.prisma.chatLog.create({
        data: {
          gameId,
          userId: isAi ? null : userId || currentUserId,
          isAi: !!isAi,
          message: createChatMessageDto.message,
        },
        include: {
          user: {
            select: {
              username: true,
            },
          },
        },
      });

      const chatMessageResponse = {
        id: chatMessage.id,
        gameId: chatMessage.gameId,
        userId: chatMessage.userId || undefined,
        username: chatMessage.user?.username,
        isAi: chatMessage.isAi,
        message: chatMessage.message,
        createdAt: chatMessage.createdAt,
      };

      // Invalidate cache for this game's chat history
      await this.cacheManager.del(`chat:${gameId}`);

      // Broadcast the message if WebSocket is available
      if (this.chatGateway) {
        this.chatGateway.broadcastMessage(gameId, chatMessageResponse);
      }

      return chatMessageResponse;
    } catch (error) {
      const err = error as ErrorWithMessage;
      this.logger.error(
        `Error creating chat message: ${err.message}`,
        err.stack,
      );
      throw error;
    }
  }

  async getGameChatHistory(
    gameId: string,
    userId: string,
    params: GetChatHistoryDto,
  ): Promise<ChatMessageResponseDto[]> {
    try {
      // Validate game exists
      const game = await this.prisma.game.findUnique({
        where: { id: gameId },
        include: { gamePlayers: true },
      });

      if (!game) {
        this.logger.warn(
          `Attempted to get chat history for non-existent game: ${gameId}`,
        );
        throw new NotFoundException('Game not found');
      }

      // Validate user is a player in the game
      const isPlayerInGame = game.gamePlayers.some(
        (player) => player.userId === userId,
      );

      if (!isPlayerInGame) {
        this.logger.warn(
          `User ${userId} attempted to access chat history for game ${gameId} but is not a player`,
        );
        throw new ForbiddenException('User is not a player in this game');
      }

      // Check cache first
      const cacheKey = `chat:${gameId}:${params.offset}:${params.limit}${params.cursor ? `:${params.cursor}` : ''}`;
      const cachedHistory =
        await this.cacheManager.get<ChatMessageResponseDto[]>(cacheKey);

      if (cachedHistory) {
        return cachedHistory;
      }

      // Build the query
      const where: Prisma.ChatLogWhereInput = { gameId };

      // Support cursor-based pagination
      if (params.cursor) {
        where.id = {
          gt: params.cursor,
        };
      }

      // Get chat history
      const chatLogs = await this.prisma.chatLog.findMany({
        where,
        include: {
          user: {
            select: {
              username: true,
            },
          },
        },
        orderBy: { createdAt: 'asc' },
        skip: params.offset,
        take: params.limit,
      });

      const result = chatLogs.map((chatLog) => ({
        id: chatLog.id,
        gameId: chatLog.gameId,
        userId: chatLog.userId || undefined,
        username: chatLog.user?.username,
        isAi: chatLog.isAi,
        message: chatLog.message,
        createdAt: chatLog.createdAt,
      }));

      // Cache the result for 5 minutes
      await this.cacheManager.set(cacheKey, result, 5 * 60 * 1000);

      return result;
    } catch (error) {
      const err = error as ErrorWithMessage;
      this.logger.error(
        `Error getting chat history: ${err.message}`,
        err.stack,
      );
      throw error;
    }
  }

  async getAiFeedback(
    gameId: string,
    userId: string,
    userMessage?: string,
  ): Promise<ChatMessageResponseDto> {
    try {
      // Validate game exists and includes an AI player
      const game = await this.prisma.game.findUnique({
        where: { id: gameId },
        include: {
          gamePlayers: true,
        },
      });

      if (!game) {
        this.logger.warn(
          `Attempted to get AI feedback for non-existent game: ${gameId}`,
        );
        throw new NotFoundException('Game not found');
      }

      // Check if this is an AI game
      const hasAiPlayer = game.gamePlayers.some((player) => player.isAi);
      if (!hasAiPlayer) {
        this.logger.warn(
          `Attempted to get AI feedback for non-AI game: ${gameId}`,
        );
        throw new BadRequestException('This game does not have an AI player');
      }

      // Validate user is a player in the game
      const isPlayerInGame = game.gamePlayers.some(
        (player) => player.userId === userId,
      );

      if (!isPlayerInGame) {
        this.logger.warn(
          `User ${userId} attempted to get AI feedback for game ${gameId} but is not a player`,
        );
        throw new ForbiddenException('User is not a player in this game');
      }

      // Check subscription status for AI feedback access (Premium tier feature)
      const subscriptionDetails =
        await this.subscriptionService.getUserSubscriptionDetails(userId);
      const subscriptionStatus = subscriptionDetails.status;
      const hasPremiumAccess =
        subscriptionStatus === 'premium' || subscriptionStatus === 'trial';

      if (!hasPremiumAccess) {
        this.logger.warn(
          `User ${userId} attempted to access premium AI feedback without subscription`,
        );
        throw new ForbiddenException(
          'AI feedback requires a Premium subscription',
        );
      }

      // Parse the game state from the stored JSON
      const gameState: GameState = {
        pgn: '',
        fen: '',
        turn: 'white',
        difficulty: 'beginner',
      };

      // Try to extract game state information
      if (game.state) {
        try {
          const state =
            typeof game.state === 'string'
              ? (JSON.parse(game.state) as Record<string, string>)
              : (game.state as Record<string, string>);

          if (state.pgn) gameState.pgn = state.pgn;
          if (state.fen) gameState.fen = state.fen;
          if (state.turn) gameState.turn = state.turn as 'white' | 'black';
        } catch (e) {
          const err = e as ErrorWithMessage;
          this.logger.warn(`Error parsing game state: ${err.message}`);
        }
      }

      // Try to get the difficulty from the AI player's metadata
      const aiPlayer = game.gamePlayers.find((p) => p.isAi);
      if (aiPlayer && aiPlayer.metadata) {
        try {
          const metadata =
            typeof aiPlayer.metadata === 'string'
              ? (JSON.parse(aiPlayer.metadata) as Record<string, string>)
              : (aiPlayer.metadata as Record<string, string>);

          if (metadata.difficulty) {
            gameState.difficulty = metadata.difficulty as
              | 'beginner'
              | 'intermediate'
              | 'advanced';
          }
        } catch (e) {
          const err = e as ErrorWithMessage;
          this.logger.warn(`Error parsing AI player metadata: ${err.message}`);
        }
      }

      // Get the move history (if available)
      let moveHistory: string[] = [];
      if (game.state) {
        try {
          // Type assertion to GameStateData to access 'moves' property
          const stateData = (
            typeof game.state === 'string' ? JSON.parse(game.state) : game.state
          ) as GameStateData;

          if (stateData.moves && Array.isArray(stateData.moves)) {
            moveHistory = stateData.moves;
          }
        } catch (e) {
          const err = e as ErrorWithMessage;
          this.logger.warn(`Error getting move history: ${err.message}`);
        }
      }

      // Get AI feedback via the AI service
      const feedback = (await this.aiService.getFeedback({
        gameState,
        message: userMessage,
        moveHistory,
      })) as { message: string; tokens?: number; error?: string };

      this.aiMessageCount++;

      // Create and return the AI message
      return this.createMessage({
        gameId,
        message: feedback.message,
        isAi: true,
      });
    } catch (error) {
      const err =
        error instanceof Error
          ? error
          : new Error(typeof error === 'string' ? error : 'Unknown error');

      this.logger.error(`Error getting AI feedback: ${err.message}`, err.stack);

      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      // For other errors, return a generic error message
      const genericMessage: Omit<CreateChatMessageDto, 'userId'> = {
        gameId,
        message:
          'Sorry, I cannot analyze this position right now. Please try again later.',
        isAi: true,
      };
      return this.createMessage(genericMessage);
    }
  }

  async validateAccess(userId: string, gameId: string): Promise<boolean> {
    try {
      const game = await this.prisma.game.findUnique({
        where: { id: gameId },
        include: { gamePlayers: true },
      });

      if (!game) {
        return false;
      }

      return game.gamePlayers.some((player) => player.userId === userId);
    } catch (error) {
      const err = error as ErrorWithMessage;
      this.logger.error(`Error validating access: ${err.message}`, err.stack);
      return false;
    }
  }
}
