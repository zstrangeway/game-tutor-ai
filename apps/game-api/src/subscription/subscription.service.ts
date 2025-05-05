import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LoggerService } from '../common/services/logger.service';

export type SubscriptionStatus = 'free' | 'standard' | 'premium' | 'trial';

// Define an interface for error objects
interface ErrorWithMessage {
  message: string;
  stack?: string;
}

// Define an interface for user preferences that includes subscription data
interface UserPreferences {
  subscriptionEndDate?: string | Date;
  [key: string]: unknown;
}

@Injectable()
export class SubscriptionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext('SubscriptionService');
  }

  getPlans() {
    return { message: 'Get available subscription plans endpoint' };
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  createSubscription(data: any) {
    return { message: 'Create new subscription endpoint' };
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  startTrial(data: any) {
    return { message: 'Start free trial endpoint' };
  }

  getStatus() {
    return { message: 'Get current subscription status endpoint' };
  }

  cancelSubscription() {
    return { message: 'Cancel subscription endpoint' };
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  handleWebhook(data: any) {
    return { message: 'Stripe webhook endpoint' };
  }

  async getUserSubscriptionStatus(userId: string): Promise<SubscriptionStatus> {
    try {
      // In a real implementation, this would fetch from the database
      // For now, we'll implement a stub that returns the subscription status
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          subscriptionStatus: true,
          // Note: subscriptionEndDate field doesn't exist in the schema yet
          // We'll use preferences for now to store end date information
          preferences: true,
        },
      });

      if (!user) {
        this.logger.warn(
          `Attempted to get subscription status for non-existent user: ${userId}`,
        );
        return 'free';
      }

      // If subscriptionStatus is null, return 'free'
      if (!user.subscriptionStatus) {
        return 'free';
      }

      // Check if the subscription has expired (for trial or paid subscriptions)
      // We'll assume the end date might be stored in preferences as JSON
      let isExpired = false;
      if (user.preferences) {
        try {
          const preferences: UserPreferences =
            typeof user.preferences === 'string'
              ? (JSON.parse(user.preferences) as UserPreferences)
              : (user.preferences as UserPreferences);

          // Check if there's a subscription end date in preferences
          if (preferences.subscriptionEndDate) {
            const endDate = new Date(preferences.subscriptionEndDate);
            if (endDate < new Date()) {
              this.logger.log(
                `User ${userId} subscription has expired`,
                'SubscriptionService',
              );
              isExpired = true;
            }
          }
        } catch (e) {
          const err = e as ErrorWithMessage;
          this.logger.warn(
            `Error parsing subscription end date: ${err.message}`,
          );
        }
      }

      if (isExpired) {
        return 'free';
      }

      // Otherwise return the stored status
      return user.subscriptionStatus as SubscriptionStatus;
    } catch (error) {
      const err = error as ErrorWithMessage;
      this.logger.error(
        `Error getting user subscription status: ${err.message}`,
        err.stack,
      );
      // Default to free tier on error to avoid giving premium features by mistake
      return 'free';
    }
  }
}
