import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { LoggerService } from '../../common/services/logger.service';

@Injectable()
export class StripeService {
  private stripe: Stripe | null = null;
  private mockMode = false;

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext('StripeService');
    const stripeSecretKey = this.configService.get<string>('STRIPE_SECRET_KEY');

    if (!stripeSecretKey) {
      this.logger.warn(
        'STRIPE_SECRET_KEY is not defined in environment variables. Using mock Stripe service.',
      );
      this.mockMode = true;
    } else {
      this.stripe = new Stripe(stripeSecretKey, {
        apiVersion: '2025-04-30.basil',
      });
    }
  }

  async createCustomer(email: string, name: string): Promise<Stripe.Customer> {
    try {
      if (this.mockMode) {
        this.logger.log(`[MOCK] Creating customer for ${email}`);
        return {
          id: `mock_cus_${Date.now()}`,
          email,
          name,
          object: 'customer',
        } as Stripe.Customer;
      }

      if (!this.stripe) {
        throw new Error('Stripe client not initialized');
      }

      return await this.stripe.customers.create({
        email,
        name,
      });
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to create customer: ${errorMessage}`);
      throw error;
    }
  }

  async createSubscription(
    customerId: string,
    priceId: string,
    paymentMethodId: string,
  ): Promise<Stripe.Subscription> {
    try {
      if (this.mockMode) {
        this.logger.log(
          `[MOCK] Creating subscription for customer ${customerId} with price ${priceId}`,
        );
        const now = Math.floor(Date.now() / 1000);
        const monthInSeconds = 30 * 24 * 60 * 60;

        return {
          id: `mock_sub_${Date.now()}`,
          customer: customerId,
          status: 'active',
          current_period_start: now,
          current_period_end: now + monthInSeconds,
          cancel_at_period_end: false,
          object: 'subscription',
          items: {
            data: [
              {
                id: `mock_si_${Date.now()}`,
                price: { id: priceId },
                object: 'subscription_item',
              },
            ],
            object: 'list',
            has_more: false,
            url: '',
          },
        } as unknown as Stripe.Subscription;
      }

      if (!this.stripe) {
        throw new Error('Stripe client not initialized');
      }

      // Attach payment method to customer
      await this.stripe.paymentMethods.attach(paymentMethodId, {
        customer: customerId,
      });

      // Set as default payment method
      await this.stripe.customers.update(customerId, {
        invoice_settings: {
          default_payment_method: paymentMethodId,
        },
      });

      // Create subscription
      return await this.stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: priceId }],
        expand: ['latest_invoice.payment_intent'],
      });
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to create subscription: ${errorMessage}`);
      throw error;
    }
  }

  async cancelSubscription(
    subscriptionId: string,
    cancelAtPeriodEnd = true,
  ): Promise<Stripe.Subscription> {
    try {
      if (this.mockMode) {
        this.logger.log(
          `[MOCK] Canceling subscription ${subscriptionId}, cancelAtPeriodEnd: ${cancelAtPeriodEnd}`,
        );
        const now = Math.floor(Date.now() / 1000);
        const monthInSeconds = 30 * 24 * 60 * 60;

        if (cancelAtPeriodEnd) {
          return {
            id: subscriptionId,
            status: 'active',
            cancel_at_period_end: true,
            current_period_start: now,
            current_period_end: now + monthInSeconds,
            object: 'subscription',
          } as unknown as Stripe.Subscription;
        } else {
          return {
            id: subscriptionId,
            status: 'canceled',
            cancel_at_period_end: false,
            canceled_at: now,
            current_period_start: now - monthInSeconds,
            current_period_end: now + monthInSeconds,
            object: 'subscription',
          } as unknown as Stripe.Subscription;
        }
      }

      if (!this.stripe) {
        throw new Error('Stripe client not initialized');
      }

      if (cancelAtPeriodEnd) {
        return await this.stripe.subscriptions.update(subscriptionId, {
          cancel_at_period_end: true,
        });
      } else {
        return await this.stripe.subscriptions.cancel(subscriptionId);
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to cancel subscription: ${errorMessage}`);
      throw error;
    }
  }

  async getSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    try {
      if (this.mockMode) {
        this.logger.log(`[MOCK] Getting subscription ${subscriptionId}`);
        const now = Math.floor(Date.now() / 1000);
        const monthInSeconds = 30 * 24 * 60 * 60;

        return {
          id: subscriptionId,
          status: 'active',
          current_period_start: now,
          current_period_end: now + monthInSeconds,
          cancel_at_period_end: false,
          object: 'subscription',
        } as unknown as Stripe.Subscription;
      }

      if (!this.stripe) {
        throw new Error('Stripe client not initialized');
      }

      return await this.stripe.subscriptions.retrieve(subscriptionId);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to retrieve subscription: ${errorMessage}`);
      throw error;
    }
  }

  async createCheckoutSession(
    customerId: string,
    priceId: string,
    successUrl: string,
    cancelUrl: string,
  ): Promise<Stripe.Checkout.Session> {
    try {
      if (this.mockMode) {
        this.logger.log(
          `[MOCK] Creating checkout session for customer ${customerId} with price ${priceId}`,
        );

        return {
          id: `mock_cs_${Date.now()}`,
          url: `${successUrl}?session_id=mock_cs_${Date.now()}`,
          customer: customerId,
          payment_status: 'paid',
          status: 'complete',
          object: 'checkout.session',
        } as unknown as Stripe.Checkout.Session;
      }

      if (!this.stripe) {
        throw new Error('Stripe client not initialized');
      }

      return await this.stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card'],
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: successUrl,
        cancel_url: cancelUrl,
      });
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to create checkout session: ${errorMessage}`);
      throw error;
    }
  }

  constructWebhookEvent(
    payload: Buffer,
    signature: string,
  ): Promise<Stripe.Event> {
    try {
      if (this.mockMode) {
        this.logger.log(`[MOCK] Constructing webhook event`);

        // Parse the payload if it's a string or buffer
        let parsedData: unknown;
        try {
          parsedData =
            typeof payload === 'string'
              ? JSON.parse(payload)
              : JSON.parse(payload.toString());
        } catch (e) {
          throw new Error(
            `Failed to parse webhook payload: ${e instanceof Error ? e.message : String(e)}`,
          );
        }

        // Validate that it has the minimum properties of a Stripe event
        if (!this.isStripeEvent(parsedData)) {
          throw new Error('Invalid webhook event data structure');
        }

        return Promise.resolve(parsedData);
      }

      if (!this.stripe) {
        throw new Error('Stripe client not initialized');
      }

      const webhookSecret = this.configService.get<string>(
        'STRIPE_WEBHOOK_SECRET',
      );
      if (!webhookSecret) {
        throw new BadRequestException(
          'Stripe webhook secret is not configured',
        );
      }
      const event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        webhookSecret,
      );
      return Promise.resolve(event);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to construct webhook event: ${errorMessage}`);
      throw error;
    }
  }

  // Type guard to check if a value has the minimum properties of a Stripe event
  private isStripeEvent(value: unknown): value is Stripe.Event {
    return (
      typeof value === 'object' &&
      value !== null &&
      'id' in value &&
      'object' in value &&
      'type' in value &&
      (value as Record<string, unknown>).object === 'event'
    );
  }
}
