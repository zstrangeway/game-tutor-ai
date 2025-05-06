import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { GamesModule } from './games/games.module';
import { SubscriptionModule } from './subscription/subscription.module';
import { AiModule } from './ai/ai.module';
import { MultiplayerModule } from './multiplayer/multiplayer.module';
import { ChatModule } from './chat/chat.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { PrismaModule } from './prisma/prisma.module';
import { TerminusModule } from '@nestjs/terminus';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ThrottlerGuard } from '@nestjs/throttler';
import { EmailModule } from './common/email.module';
import { LoggerModule } from './common/logger.module';
import { ScheduleModule } from '@nestjs/schedule';
import { RedisModule } from './redis/redis.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    // Global configuration module
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),

    // Global rate limiting (default limits)
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 minute
        limit: 60, // 60 requests per minute
      },
    ]),

    // Task scheduling
    ScheduleModule.forRoot(),

    // Database and caching
    PrismaModule,
    RedisModule,

    // Common modules
    EmailModule,
    LoggerModule,

    // Feature modules
    AuthModule,
    UsersModule,
    GamesModule,
    SubscriptionModule,
    AiModule,
    MultiplayerModule,
    ChatModule,
    AnalyticsModule,

    // Health checks
    TerminusModule,
    HealthModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Global exception filter
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    // Global rate limiting guard
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
