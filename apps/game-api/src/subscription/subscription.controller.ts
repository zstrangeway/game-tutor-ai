import { Controller, Get, Post, Body, UseGuards, Req } from '@nestjs/common';
import { SubscriptionService } from './subscription.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  CreateSubscriptionDto,
  CancelSubscriptionDto,
  WebhookEventDto,
} from './dto';

// Define interface for Request with User
interface RequestWithUser {
  user: {
    id: string;
    email: string;
    username: string;
  };
}

@Controller('subscription')
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Get('plans')
  getPlans(): Promise<
    Array<{
      id: string;
      name: string;
      description: string;
      price: number;
      interval: string;
      currency: string;
      features: string[];
      stripePriceId: string;
      isActive: boolean;
    }>
  > {
    return this.subscriptionService.getPlans();
  }

  @UseGuards(JwtAuthGuard)
  @Post('create')
  createSubscription(
    @Req() req: RequestWithUser,
    @Body() createSubscriptionDto: CreateSubscriptionDto,
  ) {
    return this.subscriptionService.createSubscription(
      req.user.id,
      createSubscriptionDto,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('trial')
  startTrial(@Req() req: RequestWithUser) {
    return this.subscriptionService.startTrial(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('status')
  async getStatus(@Req() req: RequestWithUser) {
    return this.subscriptionService.getUserSubscriptionDetails(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('cancel')
  cancelSubscription(
    @Req() req: RequestWithUser,
    @Body() cancelSubscriptionDto: CancelSubscriptionDto,
  ) {
    return this.subscriptionService.cancelSubscription(
      req.user.id,
      cancelSubscriptionDto,
    );
  }

  @Post('webhook')
  handleWebhook(@Body() webhookEventDto: WebhookEventDto) {
    return this.subscriptionService.handleWebhook(webhookEventDto);
  }
}
