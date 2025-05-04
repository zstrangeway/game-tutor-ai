import { Injectable } from '@nestjs/common';

@Injectable()
export class AnalyticsService {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  recordEvent(data: any) {
    return { message: 'Record user event for analytics endpoint' };
  }

  getDailyTip() {
    return { message: 'Get daily tip for user endpoint' };
  }
}
