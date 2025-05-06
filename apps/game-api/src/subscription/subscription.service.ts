import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LoggerService } from '../common/services/logger.service';
import { StripeService } from './services/stripe.service';
import {
  CreateSubscriptionDto,
  CancelSubscriptionDto,
  WebhookEventDto,
} from './dto';
import {
  SUBSCRIPTION_STATUS,
  PAYMENT_STATUS,
  SUBSCRIPTION_TIERS,
} from './constants/subscription-status.constant';
import {
  SubscriptionStatus,
  SubscriptionDetails,
} from './interfaces/subscription-status.interface';
import { ConfigService } from '@nestjs/config';

// Define type for user preferences
interface UserPreferences {
  subscriptionEndDate?: string | Date;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  cancelAtPeriodEnd?: boolean;
  subscriptionPlan?: string;
  paymentRecords?: Array<Record<string, unknown>>;
  [key: string]: unknown;
}

// Helper function to safely parse user preferences
function parseUserPreferences(preferences: unknown): UserPreferences {
  if (typeof preferences === 'string') {
    try {
      return JSON.parse(preferences) as UserPreferences;
    } catch {
      return {};
    }
  }
  return (preferences as UserPreferences) || {};
}

// Define interfaces for Stripe objects
interface StripeSubscription {
  id: string;
  customer: string;
  status: string;
  current_period_start: number;
  current_period_end: number;
  cancel_at_period_end: boolean;
}

interface StripeInvoice {
  id: string;
  customer: string;
  payment_intent?: string;
  amount_paid: number;
  amount_due: number;
  currency: string;
}

interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  interval: string;
  currency: string;
  features: string[];
  stripePriceId: string;
  isActive: boolean;
}

// Define an interface for Prisma subscription create data
interface PrismaSubscriptionCreateData {
  userId: string;
  planName: string;
  status: string;
  stripePriceId?: string;
  stripeSubscriptionId?: string;
  stripeCustomerId?: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
}

@Injectable()
export class SubscriptionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
    private readonly stripeService: StripeService,
    private readonly configService: ConfigService,
  ) {
    this.logger.setContext('SubscriptionService');
  }

  /**
   * Get available subscription plans
   */
  async getPlans(): Promise<SubscriptionPlan[]> {
    try {
      // Since we're in development phase, return some placeholder plans
      // In production, this would fetch from the database
      const defaultPlans: SubscriptionPlan[] = [
        {
          id: 'plan_standard',
          name: 'standard',
          description: 'Standard plan with basic features',
          price: 9.99,
          interval: 'monthly',
          currency: 'USD',
          features: ['feature1', 'feature2'],
          stripePriceId: 'price_standard',
          isActive: true,
        },
        {
          id: 'plan_premium',
          name: 'premium',
          description: 'Premium plan with all features',
          price: 19.99,
          interval: 'monthly',
          currency: 'USD',
          features: ['feature1', 'feature2', 'feature3', 'feature4'],
          stripePriceId: 'price_premium',
          isActive: true,
        },
      ];

      try {
        // Try to fetch from database if schema is migrated
        const dbPlans = await this.prisma.$queryRaw`
          SELECT * FROM "SubscriptionPlan" WHERE "isActive" = true ORDER BY "price" ASC
        `;

        if (Array.isArray(dbPlans) && dbPlans.length > 0) {
          return dbPlans as SubscriptionPlan[];
        }
      } catch {
        // If table doesn't exist yet, use default plans
        this.logger.warn(
          'SubscriptionPlan table may not exist yet, using default plans',
        );
      }

      return defaultPlans;
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error fetching subscription plans: ${errorMsg}`);
      throw error;
    }
  }

  /**
   * Create a new subscription for a user
   */
  async createSubscription(userId: string, data: CreateSubscriptionDto) {
    try {
      // Get user
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Get plan from the available plans
      const availablePlans = await this.getPlans();
      const plan = availablePlans.find((p) => p.id === data.planId);

      if (!plan) {
        throw new NotFoundException('Subscription plan not found');
      }

      // Check if user already has a subscription
      const existingSubscription = await this.prisma.subscription.findUnique({
        where: { userId },
      });

      if (existingSubscription) {
        // Handle upgrade/downgrade logic here if needed
        throw new BadRequestException(
          'User already has an active subscription',
        );
      }

      // Store Stripe customer ID in user preferences
      const userPreferences: UserPreferences = parseUserPreferences(
        user.preferences,
      );
      let stripeCustomerId = userPreferences.stripeCustomerId || '';

      if (!stripeCustomerId) {
        const customer = await this.stripeService.createCustomer(
          user.email,
          user.username,
        );
        stripeCustomerId = customer.id;

        // Update user with Stripe customer ID in preferences
        await this.prisma.user.update({
          where: { id: userId },
          data: {
            preferences: JSON.stringify({
              ...userPreferences,
              stripeCustomerId,
            }),
          },
        });
      }

      // Create Stripe subscription
      const stripeSubscription = await this.stripeService.createSubscription(
        stripeCustomerId,
        plan.stripePriceId,
        data.paymentMethodId,
      );

      // Cast to our interface type to safely access properties
      const typedSubscription =
        stripeSubscription as unknown as StripeSubscription;

      // Create subscription with required fields
      const subscription = await this.prisma.subscription.create({
        data: {
          userId,
          planName: plan.name,
          status: typedSubscription.status,
          stripePriceId: plan.stripePriceId,
          stripeSubscriptionId: typedSubscription.id,
          stripeCustomerId: stripeCustomerId,
          currentPeriodStart: new Date(
            typedSubscription.current_period_start * 1000,
          ),
          currentPeriodEnd: new Date(
            typedSubscription.current_period_end * 1000,
          ),
          cancelAtPeriodEnd: typedSubscription.cancel_at_period_end || false,
        } as PrismaSubscriptionCreateData,
      });

      // Update user subscription status
      await this.prisma.user.update({
        where: { id: userId },
        data: { subscriptionStatus: plan.name.toLowerCase() },
      });

      // Return a response that includes data from both sources
      return {
        id: subscription.id,
        status: subscription.status,
        currentPeriodEnd: subscription.currentPeriodEnd,
        plan: plan.name,
      };
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error creating subscription: ${errorMsg}`);
      throw error;
    }
  }

  /**
   * Start a free trial for a user
   */
  async startTrial(userId: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Check if user already has a subscription
      const existingSubscription = await this.prisma.subscription.findUnique({
        where: { userId },
      });

      if (existingSubscription) {
        throw new BadRequestException(
          'User already has an active subscription',
        );
      }

      // Set trial period (e.g., 14 days)
      const trialPeriodDays = parseInt(
        this.configService.get<string>('TRIAL_PERIOD_DAYS') || '14',
      );
      const now = new Date();
      const trialEndDate = new Date(now);
      trialEndDate.setDate(now.getDate() + trialPeriodDays);

      // Create subscription with trial data and required fields
      const subscription = await this.prisma.subscription.create({
        data: {
          userId,
          planName: SUBSCRIPTION_TIERS.TRIAL,
          status: SUBSCRIPTION_STATUS.TRIALING,
          currentPeriodStart: now,
          currentPeriodEnd: trialEndDate,
          cancelAtPeriodEnd: false,
        } as PrismaSubscriptionCreateData,
      });

      // Store trial end date in user preferences
      const userPreferences: UserPreferences = parseUserPreferences(
        user.preferences,
      );

      const updatedPreferences: UserPreferences = {
        ...userPreferences,
        subscriptionEndDate: trialEndDate.toISOString(),
        subscriptionPlan: SUBSCRIPTION_TIERS.TRIAL,
      };

      await this.prisma.user.update({
        where: { id: userId },
        data: {
          subscriptionStatus: SUBSCRIPTION_TIERS.TRIAL,
          preferences: JSON.stringify(updatedPreferences),
        },
      });

      return {
        id: subscription.id,
        status: SUBSCRIPTION_STATUS.TRIALING,
        currentPeriodEnd: trialEndDate,
        plan: SUBSCRIPTION_TIERS.TRIAL,
      };
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error starting trial: ${errorMsg}`);
      throw error;
    }
  }

  /**
   * Get detailed subscription information for a user
   */
  async getUserSubscriptionDetails(
    userId: string,
  ): Promise<SubscriptionDetails> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Get subscription
      const subscription = await this.prisma.subscription.findUnique({
        where: { userId },
      });

      if (!subscription) {
        return {
          status: SUBSCRIPTION_TIERS.FREE as SubscriptionStatus,
          isActive: false,
        };
      }

      // Extract subscription details from user preferences as well
      const userPreferences: UserPreferences = parseUserPreferences(
        user.preferences,
      );

      const endDateString = userPreferences.subscriptionEndDate;
      const currentPeriodEnd = endDateString
        ? new Date(endDateString.toString())
        : undefined;
      const cancelAtPeriodEnd = userPreferences.cancelAtPeriodEnd === true;

      // Check if subscription has expired
      const now = new Date();
      const isExpired = currentPeriodEnd && currentPeriodEnd < now;

      // For trials that have expired, revert to free
      if (isExpired && subscription.status === SUBSCRIPTION_STATUS.TRIALING) {
        await this.prisma.user.update({
          where: { id: userId },
          data: { subscriptionStatus: SUBSCRIPTION_TIERS.FREE },
        });

        return {
          status: SUBSCRIPTION_TIERS.FREE as SubscriptionStatus,
          currentPeriodEnd,
          isActive: false,
        };
      }

      return {
        status: user.subscriptionStatus as SubscriptionStatus,
        currentPeriodEnd,
        cancelAtPeriodEnd,
        isActive:
          !isExpired &&
          [SUBSCRIPTION_STATUS.ACTIVE, SUBSCRIPTION_STATUS.TRIALING].includes(
            subscription.status,
          ),
      };
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error getting subscription details: ${errorMsg}`);
      throw error;
    }
  }

  /**
   * Cancel a user's subscription
   */
  async cancelSubscription(userId: string, data: CancelSubscriptionDto) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      const subscription = await this.prisma.subscription.findUnique({
        where: { userId },
      });

      if (!user || !subscription) {
        throw new NotFoundException('No active subscription found');
      }

      // Extract subscription details from user preferences
      const userPreferences: UserPreferences = parseUserPreferences(
        user.preferences,
      );
      const stripeSubscriptionId = userPreferences.stripeSubscriptionId;

      if (!stripeSubscriptionId) {
        // For non-Stripe subscriptions (like trials)
        await this.prisma.subscription.update({
          where: { userId },
          data: {
            status: SUBSCRIPTION_STATUS.CANCELED,
          },
        });

        // Update user preferences
        const updatedPreferences = {
          ...userPreferences,
          cancelAtPeriodEnd: true,
        };

        await this.prisma.user.update({
          where: { id: userId },
          data: {
            preferences: JSON.stringify(updatedPreferences),
          },
        });

        return {
          message: 'Subscription canceled successfully',
          cancelAtPeriodEnd: true,
        };
      }

      // For Stripe subscriptions
      const cancelAtPeriodEnd = data.cancelAtPeriodEnd ?? true;
      const updatedStripeSubscription =
        await this.stripeService.cancelSubscription(
          stripeSubscriptionId,
          cancelAtPeriodEnd,
        );

      const typedSubscription =
        updatedStripeSubscription as unknown as StripeSubscription;

      // Update local subscription record
      await this.prisma.subscription.update({
        where: { userId },
        data: {
          status: cancelAtPeriodEnd
            ? SUBSCRIPTION_STATUS.ACTIVE
            : SUBSCRIPTION_STATUS.CANCELED,
        },
      });

      // Update user preferences
      const updatedPreferences = {
        ...userPreferences,
        cancelAtPeriodEnd,
      };

      await this.prisma.user.update({
        where: { id: userId },
        data: {
          preferences: JSON.stringify(updatedPreferences),
        },
      });

      return {
        message: 'Subscription canceled successfully',
        cancelAtPeriodEnd,
        effectiveDate: cancelAtPeriodEnd
          ? new Date(typedSubscription.current_period_end * 1000)
          : new Date(),
      };
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error canceling subscription: ${errorMsg}`);
      throw error;
    }
  }

  /**
   * Handle webhook events from payment provider
   */
  async handleWebhook(event: WebhookEventDto) {
    try {
      // Process different event types
      switch (event.type) {
        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdated(event.data);
          break;
        case 'customer.subscription.deleted':
          await this.handleSubscriptionCanceled(event.data);
          break;
        case 'invoice.paid':
          await this.handleInvoicePaid(event.data);
          break;
        case 'invoice.payment_failed':
          await this.handlePaymentFailed(event.data);
          break;
        default:
          this.logger.log(`Unhandled webhook event type: ${event.type}`);
      }

      return { success: true };
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error handling webhook: ${errorMsg}`);
      throw error;
    }
  }

  /**
   * Handle subscription updated webhook event
   */
  private async handleSubscriptionUpdated(data: Record<string, any>) {
    try {
      // Create a strongly typed object with the expected structure
      const subscription = data.object as {
        customer: string;
        status: string;
        current_period_end?: number;
        cancel_at_period_end?: boolean;
      };

      const stripeCustomerId = subscription.customer;

      // Find user by Stripe customer ID in preferences
      const users = await this.prisma.user.findMany({
        where: {
          preferences: {
            path: ['stripeCustomerId'],
            equals: stripeCustomerId,
          },
        },
      });

      const user = users.length > 0 ? users[0] : null;
      if (!user) return;

      // Get user subscription
      const userSubscription = await this.prisma.subscription.findUnique({
        where: { userId: user.id },
      });

      if (!userSubscription) return;

      // Update subscription record
      await this.prisma.subscription.update({
        where: { userId: user.id },
        data: {
          status: subscription.status,
        },
      });

      // Update user preferences with subscription data
      const userPreferences: UserPreferences = parseUserPreferences(
        user.preferences,
      );

      // Create a new preferences object with updated values
      const updatedPreferences: UserPreferences = { ...userPreferences };

      if (subscription.current_period_end) {
        updatedPreferences.subscriptionEndDate = new Date(
          subscription.current_period_end * 1000,
        ).toISOString();
      }

      if (subscription.cancel_at_period_end !== undefined) {
        updatedPreferences.cancelAtPeriodEnd =
          subscription.cancel_at_period_end;
      }

      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          preferences: JSON.stringify(updatedPreferences),
        },
      });

      // If status changed to past_due, update user record
      if (subscription.status === SUBSCRIPTION_STATUS.PAST_DUE) {
        await this.prisma.user.update({
          where: { id: user.id },
          data: { subscriptionStatus: SUBSCRIPTION_TIERS.FREE },
        });
      }
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error handling subscription update: ${errorMsg}`);
      throw error;
    }
  }

  /**
   * Handle subscription canceled webhook event
   */
  private async handleSubscriptionCanceled(data: Record<string, any>) {
    try {
      const subscription = data.object as StripeSubscription;

      const stripeCustomerId = subscription.customer;

      // Find user by Stripe customer ID in preferences
      const users = await this.prisma.user.findMany({
        where: {
          preferences: {
            path: ['stripeCustomerId'],
            equals: stripeCustomerId,
          },
        },
      });

      const user = users.length > 0 ? users[0] : null;
      if (!user) return;

      // Get user subscription
      const userSubscription = await this.prisma.subscription.findUnique({
        where: { userId: user.id },
      });

      if (!userSubscription) return;

      // Update subscription record
      await this.prisma.subscription.update({
        where: { userId: user.id },
        data: {
          status: SUBSCRIPTION_STATUS.CANCELED,
        },
      });

      // Update user record
      await this.prisma.user.update({
        where: { id: user.id },
        data: { subscriptionStatus: SUBSCRIPTION_TIERS.FREE },
      });
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Error handling subscription cancellation: ${errorMsg}`,
      );
      throw error;
    }
  }

  /**
   * Handle invoice paid webhook event
   */
  private async handleInvoicePaid(data: Record<string, any>) {
    try {
      const invoice = data.object as StripeInvoice;

      const stripeCustomerId = invoice.customer;

      // Find user by Stripe customer ID in preferences
      const users = await this.prisma.user.findMany({
        where: {
          preferences: {
            path: ['stripeCustomerId'],
            equals: stripeCustomerId,
          },
        },
      });

      const user = users.length > 0 ? users[0] : null;
      if (!user) return;

      // Log payment information
      this.logger.log(
        `Payment succeeded for user ${user.id}: ${invoice.amount_paid / 100} ${invoice.currency}`,
      );

      // Store payment record in user preferences
      const userPreferences: UserPreferences = parseUserPreferences(
        user.preferences,
      );
      const paymentRecords = userPreferences.paymentRecords || [];

      // Create new payment record
      const newPaymentRecord = {
        id: invoice.id,
        amount: invoice.amount_paid / 100,
        currency: invoice.currency,
        status: PAYMENT_STATUS.SUCCEEDED,
        stripePaymentId: invoice.payment_intent,
        stripeInvoiceId: invoice.id,
        date: new Date().toISOString(),
      };

      const updatedPreferences: UserPreferences = {
        ...userPreferences,
        paymentRecords: [...paymentRecords, newPaymentRecord],
      };

      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          preferences: JSON.stringify(updatedPreferences),
        },
      });
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error handling invoice payment: ${errorMsg}`);
      throw error;
    }
  }

  /**
   * Handle payment failed webhook event
   */
  private async handlePaymentFailed(data: Record<string, any>) {
    try {
      const invoice = data.object as StripeInvoice;

      const stripeCustomerId = invoice.customer;

      // Find user by Stripe customer ID in preferences
      const users = await this.prisma.user.findMany({
        where: {
          preferences: {
            path: ['stripeCustomerId'],
            equals: stripeCustomerId,
          },
        },
      });

      const user = users.length > 0 ? users[0] : null;
      if (!user) return;

      // Log failure
      this.logger.warn(
        `Payment failed for user ${user.id}: ${invoice.amount_due / 100} ${invoice.currency}`,
      );

      // Store failed payment record in user preferences
      const userPreferences: UserPreferences = parseUserPreferences(
        user.preferences,
      );
      const paymentRecords = userPreferences.paymentRecords || [];

      // Create new payment record
      const newPaymentRecord = {
        id: invoice.id,
        amount: invoice.amount_due / 100,
        currency: invoice.currency,
        status: PAYMENT_STATUS.FAILED,
        stripeInvoiceId: invoice.id,
        date: new Date().toISOString(),
      };

      const updatedPreferences: UserPreferences = {
        ...userPreferences,
        paymentRecords: [...paymentRecords, newPaymentRecord],
      };

      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          preferences: JSON.stringify(updatedPreferences),
        },
      });
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error handling payment failure: ${errorMsg}`);
      throw error;
    }
  }
}
