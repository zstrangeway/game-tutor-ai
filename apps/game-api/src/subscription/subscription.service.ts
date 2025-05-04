import { Injectable } from '@nestjs/common';

@Injectable()
export class SubscriptionService {
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
}
