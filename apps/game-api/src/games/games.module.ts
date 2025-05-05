import { Module } from '@nestjs/common';
import { GamesController } from './games.controller';
import { GamesService } from './games.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ChessEngine } from './engines/chess-engine';
import { AiPlayerModule } from './ai-player/ai-player.module';

/**
 * Module for managing game-related functionality
 */
@Module({
  imports: [PrismaModule, AiPlayerModule],
  controllers: [GamesController],
  providers: [GamesService, ChessEngine],
  exports: [GamesService],
})
export class GamesModule {}
