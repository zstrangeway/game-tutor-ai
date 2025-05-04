import { Controller, Get, Post, Body } from '@nestjs/common';
import { SubscriptionService } from './subscription.service';

@Controller('subscription')
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Get('plans')
  getPlans() {
    return this.subscriptionService.getPlans();
  }

  @Post('create')
  createSubscription(@Body() body: any) {
    return this.subscriptionService.createSubscription(body);
  }

  @Post('trial')
  startTrial(@Body() body: any) {
    return this.subscriptionService.startTrial(body);
  }

  @Get('status')
  getStatus() {
    return this.subscriptionService.getStatus();
  }

  @Post('cancel')
  cancelSubscription() {
    return this.subscriptionService.cancelSubscription();
  }

  @Post('webhook')
  handleWebhook(@Body() body: any) {
    return this.subscriptionService.handleWebhook(body);
  }
}
