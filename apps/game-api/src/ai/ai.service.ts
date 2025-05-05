import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LoggerService } from '../common/services/logger.service';
import axios from 'axios';

interface GameState {
  pgn: string;
  fen: string;
  turn: 'white' | 'black';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

// Define interfaces for OpenAI API responses
interface OpenAIMessage {
  role: string;
  content: string;
}

interface OpenAIChoice {
  message: OpenAIMessage;
  index: number;
  logprobs: null;
  finish_reason: string;
}

interface OpenAIUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

interface OpenAIResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: OpenAIChoice[];
  usage: OpenAIUsage;
}

// Define error interface for better error handling
interface ErrorWithMessage {
  message: string;
  stack?: string;
}

@Injectable()
export class AiService {
  private readonly apiKey: string | undefined;
  private readonly apiUrl = 'https://api.openai.com/v1/chat/completions';

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext('AiService');
    this.apiKey = this.configService.get<string>('OPENAI_API_KEY');

    if (!this.apiKey) {
      this.logger.warn(
        'OPENAI_API_KEY is not set, AI feedback will not work properly',
      );
    }
  }

  async getFeedback(data: {
    gameState: GameState;
    message?: string;
    moveHistory?: string[];
  }) {
    try {
      if (!this.apiKey) {
        throw new HttpException(
          'OpenAI API key not configured',
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }

      const { gameState, message, moveHistory } = data;

      // Build the system prompt based on user skill level
      let systemPrompt = 'You are a helpful chess coach. ';

      if (gameState.difficulty === 'beginner') {
        systemPrompt +=
          'Explain concepts simply in under 20 words. Be friendly and encouraging.';
      } else if (gameState.difficulty === 'intermediate') {
        systemPrompt +=
          'Provide strategic advice in 30-50 words. Focus on tactical opportunities and positional concepts.';
      } else {
        systemPrompt +=
          'Provide detailed strategic analysis with concrete lines. Include variations when relevant.';
      }

      // Build the user prompt based on whether this is a specific question or move feedback
      let userPrompt = '';

      if (message) {
        // User is asking a specific question
        userPrompt = `Game state (FEN): ${gameState.fen}\nPGN: ${gameState.pgn}\n\nPlayer question: ${message}\n\nProvide a helpful response to the player's question about this chess position.`;
      } else {
        // Automatic feedback after a move
        const lastMove =
          moveHistory && moveHistory.length > 0
            ? moveHistory[moveHistory.length - 1]
            : 'unknown move';
        userPrompt = `Game state (FEN): ${gameState.fen}\nPGN: ${gameState.pgn}\nLast move: ${lastMove}\n\nAnalyze the current position after the last move and provide feedback or advice for the ${gameState.turn} player.`;
      }

      const response = await axios.post<OpenAIResponse>(
        this.apiUrl,
        {
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          max_tokens: 150,
          temperature: 0.7,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
          },
        },
      );

      if (response.data.choices && response.data.choices.length > 0) {
        const content = response.data.choices[0].message.content;
        const totalTokens = response.data.usage?.total_tokens || 0;

        return {
          message: content,
          tokens: totalTokens,
        };
      } else {
        throw new Error('Invalid response from OpenAI API');
      }
    } catch (error) {
      const err = error as ErrorWithMessage;
      this.logger.error(`Error getting AI feedback: ${err.message}`, err.stack);

      if (error instanceof HttpException) {
        throw error;
      }

      // Return a fallback response in case of API failure
      const errorMessage = err.message;
      return {
        message:
          'I apologize, but I cannot analyze this position right now. Please try again later.',
        error: errorMessage,
      };
    }
  }

  async getAnalysis(data: { gameId: string; pgn: string; userElo?: number }) {
    try {
      if (!this.apiKey) {
        throw new HttpException(
          'OpenAI API key not configured',
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }

      const { pgn, userElo } = data;

      // Adjust feedback style based on user's Elo
      let skillLevel = 'beginner';
      if (userElo) {
        if (userElo > 1200) skillLevel = 'intermediate';
        if (userElo > 1800) skillLevel = 'advanced';
      }

      const systemPrompt = `You are a helpful chess coach analyzing a completed game for a ${skillLevel} player. Identify 2-3 key moments or mistakes and suggest improvements. Be educational and constructive.`;

      const userPrompt = `Here is the PGN of a completed chess game:\n\n${pgn}\n\nPlease analyze this game and highlight 2-3 key learning moments or mistakes. For each one, explain what happened and suggest a better approach.`;

      const response = await axios.post<OpenAIResponse>(
        this.apiUrl,
        {
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          max_tokens: 500,
          temperature: 0.7,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
          },
        },
      );

      if (response.data.choices && response.data.choices.length > 0) {
        const content = response.data.choices[0].message.content;
        const totalTokens = response.data.usage?.total_tokens || 0;

        return {
          analysis: content,
          tokens: totalTokens,
        };
      } else {
        throw new Error('Invalid response from OpenAI API');
      }
    } catch (error) {
      const err = error as ErrorWithMessage;
      this.logger.error(
        `Error getting game analysis: ${err.message}`,
        err.stack,
      );

      if (error instanceof HttpException) {
        throw error;
      }

      const errorMessage = err.message;
      return {
        analysis:
          'I apologize, but I cannot analyze this game right now. Please try again later.',
        error: errorMessage,
      };
    }
  }
}
