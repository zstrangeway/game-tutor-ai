import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Query,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '@prisma/client';
import {
  CreateChatMessageDto,
  GetChatHistoryDto,
  ChatMessageResponseDto,
} from './dto';
import { ThrottlerGuard, Throttle } from '@nestjs/throttler';

@ApiTags('chat')
@ApiBearerAuth()
@Controller('chat')
@UseGuards(JwtAuthGuard, ThrottlerGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('message')
  @Throttle({ default: { limit: 100, ttl: 60000 } })
  @ApiOperation({ summary: 'Send a chat message' })
  @ApiBody({ type: CreateChatMessageDto })
  @ApiResponse({
    status: 201,
    description: 'Message sent successfully',
    type: ChatMessageResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - User not in game' })
  @ApiResponse({
    status: 429,
    description: 'Too Many Requests - Rate limit exceeded',
  })
  async sendMessage(
    @Body() createChatMessageDto: CreateChatMessageDto,
    @CurrentUser() user: User,
  ) {
    // Validate user access to the game
    const hasAccess = await this.chatService.validateAccess(
      user.id,
      createChatMessageDto.gameId,
    );

    if (!hasAccess) {
      throw new ForbiddenException('User is not a player in this game');
    }

    return this.chatService.createMessage(createChatMessageDto, user.id);
  }

  @Get(':gameId')
  @Throttle({ default: { limit: 100, ttl: 60000 } })
  @ApiOperation({ summary: 'Get chat history for a game' })
  @ApiParam({ name: 'gameId', description: 'The ID of the game' })
  @ApiResponse({
    status: 200,
    description: 'Chat history retrieved successfully',
    type: [ChatMessageResponseDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - User not in game' })
  @ApiResponse({ status: 404, description: 'Game not found' })
  @ApiResponse({
    status: 429,
    description: 'Too Many Requests - Rate limit exceeded',
  })
  async getChatHistory(
    @Param('gameId') gameId: string,
    @Query() query: GetChatHistoryDto,
    @CurrentUser() user: User,
  ) {
    if (!gameId) {
      throw new BadRequestException('Game ID is required');
    }

    // Add the gameId from the path parameter
    const params: GetChatHistoryDto = {
      ...query,
      gameId,
    };

    return this.chatService.getGameChatHistory(gameId, user.id, params);
  }

  @Post('ai-feedback')
  @Throttle({ ai: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Get AI feedback on a position (Premium feature)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        gameId: { type: 'string', description: 'The game ID' },
        message: {
          type: 'string',
          description: 'Optional user question about the position',
        },
      },
      required: ['gameId'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'AI feedback provided successfully',
    type: ChatMessageResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Premium subscription required',
  })
  @ApiResponse({ status: 404, description: 'Game not found' })
  @ApiResponse({
    status: 429,
    description: 'Too Many Requests - Rate limit exceeded for AI interactions',
  })
  async getAiFeedback(
    @Body() body: { gameId: string; message?: string },
    @CurrentUser() user: User,
  ) {
    if (!body.gameId) {
      throw new BadRequestException('Game ID is required');
    }

    return this.chatService.getAiFeedback(body.gameId, user.id, body.message);
  }
}
