import { Module } from '@nestjs/common';
import { AiPlayerController } from './ai-player.controller';
import { AiPlayerService } from './ai-player.service';
import { PrismaModule } from '../../prisma/prisma.module';

/**
 * Module for managing AI player functionality
 */
@Module({
  imports: [PrismaModule],
  controllers: [AiPlayerController],
  providers: [AiPlayerService],
  exports: [AiPlayerService],
})
export class AiPlayerModule {}
