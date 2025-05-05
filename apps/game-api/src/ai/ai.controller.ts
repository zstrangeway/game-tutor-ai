import { Controller, Post, Body } from '@nestjs/common';
import { AiService } from './ai.service';

// Import the interfaces from ai.service.ts
interface GameState {
  pgn: string;
  fen: string;
  turn: 'white' | 'black';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

interface FeedbackRequest {
  gameState: GameState;
  message?: string;
  moveHistory?: string[];
}

interface AnalysisRequest {
  gameId: string;
  pgn: string;
  userElo?: number;
}

@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('feedback')
  getFeedback(@Body() body: FeedbackRequest) {
    return this.aiService.getFeedback(body);
  }

  @Post('analysis')
  getAnalysis(@Body() body: AnalysisRequest) {
    return this.aiService.getAnalysis(body);
  }
}
