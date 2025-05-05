import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards, Inject, forwardRef, Optional } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ChatService } from '../chat.service';
import { CreateChatMessageDto } from '../dto';
import { LoggerService } from '../../common/services/logger.service';
import { JwtService } from '@nestjs/jwt';

// Define a type for error objects
interface ErrorWithMessage {
  message: string;
  stack?: string;
}

// Define type for socket data to avoid 'any' warnings
interface SocketData {
  userId: string;
}

// Type for verification result from JWT
interface JwtVerificationResult {
  sub: string;
  username?: string;
  email?: string;
  iat?: number;
  exp?: number;
}

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: 'chat',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    @Inject(forwardRef(() => ChatService))
    private readonly chatService: ChatService,
    @Optional() private readonly jwtService: JwtService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext('ChatGateway');
  }

  async handleConnection(client: Socket) {
    try {
      // Extract token from handshake
      const token = client.handshake.headers.authorization?.split(' ')[1];

      // Validate JWT token
      if (!token) {
        this.logger.warn(
          `Socket connection attempt without token: ${client.id}`,
        );
        client.disconnect();
        return;
      }

      try {
        // Only verify if jwtService is available
        if (this.jwtService) {
          const payload: JwtVerificationResult = this.jwtService.verify(token);
          if (!payload || !payload.sub) {
            this.logger.warn(
              `Invalid token payload on socket connection: ${client.id}`,
            );
            client.disconnect();
            return;
          }

          // Store user ID in socket data for later use
          (client.data as SocketData).userId = payload.sub;
          this.logger.log(
            `Client connected: ${client.id} (user: ${payload.sub})`,
          );
        } else {
          // For development/testing, we'll just accept any token
          (client.data as SocketData).userId = 'test-user';
          this.logger.log(`Client connected (dev mode): ${client.id}`);
        }
      } catch (error) {
        const err = error as ErrorWithMessage;
        this.logger.warn(`JWT verification failed: ${err.message}`);
        client.disconnect();
        return;
      }

      // Join game rooms based on query params
      const gameId = client.handshake.query.gameId as string;
      if (gameId) {
        // Validate the user has access to this game
        const hasAccess = await this.chatService.validateAccess(
          (client.data as SocketData).userId,
          gameId,
        );

        if (!hasAccess) {
          this.logger.warn(
            `User ${(client.data as SocketData).userId} attempted to join unauthorized game room: ${gameId}`,
          );
          client.disconnect();
          return;
        }

        await client.join(`game:${gameId}`);
        this.logger.log(`Client ${client.id} joined game room: ${gameId}`);
      }
    } catch (error) {
      const err = error as ErrorWithMessage;
      this.logger.error(
        `WebSocket connection error: ${err.message}`,
        err.stack,
      );
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @UseGuards(JwtAuthGuard)
  @SubscribeMessage('chat:message')
  async handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { gameId: string; message: string; userId: string },
  ) {
    try {
      const { gameId, message } = data;
      const userId = (client.data as SocketData).userId;

      if (!userId) {
        this.logger.warn('Unauthorized message attempt');
        client.emit('error', { message: 'Unauthorized' });
        return;
      }

      // Validate user has access to this game
      const hasAccess = await this.chatService.validateAccess(userId, gameId);
      if (!hasAccess) {
        this.logger.warn(
          `User ${userId} attempted to send message to unauthorized game: ${gameId}`,
        );
        client.emit('error', { message: 'Unauthorized for this game' });
        return;
      }

      // Create message in database
      const chatMessageDto: CreateChatMessageDto = {
        gameId,
        userId,
        message,
        isAi: false,
      };

      const savedMessage = await this.chatService.createMessage(
        chatMessageDto,
        userId,
      );

      // Broadcast to game room
      this.server.to(`game:${gameId}`).emit('chat:message', savedMessage);

      return savedMessage;
    } catch (error) {
      const err = error as ErrorWithMessage;
      this.logger.error(
        `Error handling chat message: ${err.message}`,
        err.stack,
      );
      client.emit('error', { message: 'Failed to process chat message' });
    }
  }

  @UseGuards(JwtAuthGuard)
  @SubscribeMessage('chat:typing')
  handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { gameId: string; isTyping: boolean },
  ) {
    try {
      const { gameId, isTyping } = data;
      const userId = (client.data as SocketData).userId;

      if (!userId) {
        return { success: false, message: 'Unauthorized' };
      }

      // Broadcast typing status to all clients in the game room except sender
      client.to(`game:${gameId}`).emit('chat:typing', {
        userId,
        isTyping,
      });

      return { success: true };
    } catch (error) {
      const err = error as ErrorWithMessage;
      this.logger.error(
        `Error handling typing status: ${err.message}`,
        err.stack,
      );
      return { success: false, message: 'Failed to update typing status' };
    }
  }

  // Method to broadcast a new message to clients
  // This will be called by the ChatService after creating messages
  broadcastMessage(gameId: string, message: ChatResponseMessage) {
    this.server.to(`game:${gameId}`).emit('chat:message', message);
  }
}

// Define the shape of chat response messages to avoid 'any'
interface ChatResponseMessage {
  id: string;
  gameId: string;
  userId?: string;
  username?: string;
  isAi: boolean;
  message: string;
  createdAt: Date;
}
