import { Controller, Post, Get, Body } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Post('event')
  recordEvent(@Body() body: any) {
    return this.analyticsService.recordEvent(body);
  }

  @Get('daily-tip')
  getDailyTip() {
    return this.analyticsService.getDailyTip();
  }
}
