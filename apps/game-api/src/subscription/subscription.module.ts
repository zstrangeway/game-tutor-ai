import { Module } from '@nestjs/common';
import { SubscriptionController } from './subscription.controller';
import { SubscriptionService } from './subscription.service';
import { PrismaModule } from '../prisma/prisma.module';
import { LoggerModule } from '../common/logger.module';
import { StripeService } from './services/stripe.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [PrismaModule, LoggerModule, ConfigModule],
  controllers: [SubscriptionController],
  providers: [SubscriptionService, StripeService],
  exports: [SubscriptionService],
})
export class SubscriptionModule {}
