import { Controller, Post, Body } from '@nestjs/common';
import { AiService } from './ai.service';

@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('feedback')
  getFeedback(@Body() body: any) {
    return this.aiService.getFeedback(body);
  }

  @Post('analysis')
  getAnalysis(@Body() body: any) {
    return this.aiService.getAnalysis(body);
  }
}
