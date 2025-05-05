import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ChatGateway } from './gateways/chat.gateway';
import { LoggerModule } from '../common/logger.module';
import { AiModule } from '../ai/ai.module';
import { SubscriptionModule } from '../subscription/subscription.module';
import { ThrottlerModule } from '@nestjs/throttler';
import { CacheModule } from '@nestjs/cache-manager';

@Module({
  imports: [
    PrismaModule,
    LoggerModule,
    AiModule,
    SubscriptionModule,
    // Add specific rate limits for chat endpoints
    ThrottlerModule.forRoot([
      {
        name: 'regular',
        ttl: 60000, // 1 minute
        limit: 100, // 100 requests per minute for regular chat
      },
      {
        name: 'ai',
        ttl: 60000, // 1 minute
        limit: 10, // 10 AI requests per minute
      },
    ]),
    // Add caching for chat history
    CacheModule.register({
      ttl: 5 * 60 * 1000, // 5 minutes
      max: 100, // max 100 items in cache
    }),
  ],
  controllers: [ChatController],
  providers: [ChatService, ChatGateway],
  exports: [ChatService],
})
export class ChatModule {}
