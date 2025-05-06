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
import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { MultiplayerService } from '../multiplayer.service';

// Define a type for error objects
interface ErrorWithMessage {
  message: string;
  stack?: string;
}

// Define type for socket data
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

@Injectable()
@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: 'multiplayer',
})
export class MultiplayerGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(MultiplayerGateway.name);
  private connections = new Map<string, Socket>();
  private gameRooms = new Map<string, Set<string>>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly multiplayerService: MultiplayerService,
  ) {}

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

        // Add to connections map
        this.connections.set(payload.sub, client);

        // Join game rooms if a gameId is provided
        const gameId = client.handshake.query.gameId as string;
        if (gameId) {
          const hasAccess = await this.multiplayerService.validateGameAccess(
            payload.sub,
            gameId,
          );

          if (!hasAccess) {
            this.logger.warn(
              `User ${payload.sub} attempted to join unauthorized game room: ${gameId}`,
            );
            client.disconnect();
            return;
          }

          await client.join(`game:${gameId}`);

          // Track players in game rooms
          if (!this.gameRooms.has(gameId)) {
            this.gameRooms.set(gameId, new Set<string>());
          }
          const gameRoom = this.gameRooms.get(gameId);
          if (gameRoom) {
            gameRoom.add(payload.sub);
          }

          this.logger.log(`Client ${client.id} joined game room: ${gameId}`);
        }
      } catch (error) {
        const err = error as ErrorWithMessage;
        this.logger.warn(`JWT verification failed: ${err.message}`);
        client.disconnect();
        return;
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
    const userId = (client.data as SocketData)?.userId;
    if (userId) {
      this.connections.delete(userId);

      // Remove from any game rooms
      this.gameRooms.forEach((users, gameId) => {
        if (users.has(userId)) {
          users.delete(userId);
          this.multiplayerService.handlePlayerDisconnect(userId, gameId);
        }
      });
    }
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('game:join')
  async handleJoinGame(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { gameId: string },
  ) {
    try {
      const userId = (client.data as SocketData)?.userId;
      if (!userId) {
        client.emit('error', { message: 'Unauthorized' });
        return;
      }

      const { gameId } = data;

      // Validate access to game
      const hasAccess = await this.multiplayerService.validateGameAccess(
        userId,
        gameId,
      );
      if (!hasAccess) {
        client.emit('error', { message: 'Unauthorized for this game' });
        return;
      }

      // Join socket room
      await client.join(`game:${gameId}`);

      // Track players in game rooms
      if (!this.gameRooms.has(gameId)) {
        this.gameRooms.set(gameId, new Set<string>());
      }
      const gameRoom = this.gameRooms.get(gameId);
      if (gameRoom) {
        gameRoom.add(userId);
      }

      // Get current game state
      const gameState = await this.multiplayerService.getGameState(gameId);

      // Send current state to the joining client
      client.emit('game:state', gameState);

      this.logger.log(`User ${userId} joined game: ${gameId}`);

      return { success: true };
    } catch (error) {
      const err = error as ErrorWithMessage;
      this.logger.error(`Error joining game: ${err.message}`, err.stack);
      client.emit('error', { message: 'Failed to join game' });
      return { success: false, message: err.message };
    }
  }

  @SubscribeMessage('game:move')
  async handleMove(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { gameId: string; move: string },
  ) {
    try {
      const userId = (client.data as SocketData)?.userId;
      if (!userId) {
        client.emit('error', { message: 'Unauthorized' });
        return { success: false, message: 'Unauthorized' };
      }

      const { gameId, move } = data;

      // Process move through game service
      const updatedState = await this.multiplayerService.processMove(
        userId,
        gameId,
        move,
      );

      // Broadcast updated state to all players in game
      this.server.to(`game:${gameId}`).emit('game:state', updatedState);

      return { success: true, state: updatedState };
    } catch (error) {
      const err = error as ErrorWithMessage;
      this.logger.error(`Error processing move: ${err.message}`, err.stack);
      client.emit('error', { message: err.message });
      return { success: false, message: err.message };
    }
  }

  @SubscribeMessage('game:resign')
  async handleResign(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { gameId: string },
  ) {
    try {
      const userId = (client.data as SocketData)?.userId;
      if (!userId) {
        client.emit('error', { message: 'Unauthorized' });
        return { success: false, message: 'Unauthorized' };
      }

      const { gameId } = data;

      // Process resignation
      const updatedState = await this.multiplayerService.processResignation(
        userId,
        gameId,
      );

      // Broadcast updated state to all players in game
      this.server.to(`game:${gameId}`).emit('game:state', updatedState);
      this.server.to(`game:${gameId}`).emit('game:end', {
        reason: 'resignation',
        winner: updatedState.result === '1-0' ? 'white' : 'black',
      });

      return { success: true, state: updatedState };
    } catch (error) {
      const err = error as ErrorWithMessage;
      this.logger.error(
        `Error processing resignation: ${err.message}`,
        err.stack,
      );
      client.emit('error', { message: err.message });
      return { success: false, message: err.message };
    }
  }

  @SubscribeMessage('game:draw:offer')
  async handleDrawOffer(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { gameId: string },
  ) {
    try {
      const userId = (client.data as SocketData)?.userId;
      if (!userId) {
        client.emit('error', { message: 'Unauthorized' });
        return { success: false, message: 'Unauthorized' };
      }

      const { gameId } = data;

      // Process draw offer
      const updatedState = await this.multiplayerService.offerDraw(
        userId,
        gameId,
      );

      // Broadcast to all players in game
      this.server.to(`game:${gameId}`).emit('game:draw:offered', {
        offeredBy: userId,
        state: updatedState,
      });

      return { success: true, state: updatedState };
    } catch (error) {
      const err = error as ErrorWithMessage;
      this.logger.error(`Error offering draw: ${err.message}`, err.stack);
      client.emit('error', { message: err.message });
      return { success: false, message: err.message };
    }
  }

  @SubscribeMessage('game:draw:respond')
  async handleDrawResponse(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { gameId: string; accept: boolean },
  ) {
    try {
      const userId = (client.data as SocketData)?.userId;
      if (!userId) {
        client.emit('error', { message: 'Unauthorized' });
        return { success: false, message: 'Unauthorized' };
      }

      const { gameId, accept } = data;

      // Process draw response
      const updatedState = await this.multiplayerService.respondToDraw(
        userId,
        gameId,
        accept,
      );

      // Broadcast updated state to all players in game
      this.server.to(`game:${gameId}`).emit('game:state', updatedState);

      if (accept) {
        this.server.to(`game:${gameId}`).emit('game:end', {
          reason: 'draw',
          result: '1/2-1/2',
        });
      } else {
        this.server.to(`game:${gameId}`).emit('game:draw:declined', {
          declinedBy: userId,
        });
      }

      return { success: true, state: updatedState };
    } catch (error) {
      const err = error as ErrorWithMessage;
      this.logger.error(`Error responding to draw: ${err.message}`, err.stack);
      client.emit('error', { message: err.message });
      return { success: false, message: err.message };
    }
  }

  // Method to notify when match is found
  notifyMatchFound(player1Id: string, player2Id: string, gameId: string) {
    const player1Socket = this.connections.get(player1Id);
    const player2Socket = this.connections.get(player2Id);

    const matchData = { gameId, status: 'found' };

    if (player1Socket) {
      player1Socket.emit('match:found', matchData);
    }

    if (player2Socket) {
      player2Socket.emit('match:found', matchData);
    }

    this.logger.log(`Match notification sent to players for game: ${gameId}`);
  }
}
