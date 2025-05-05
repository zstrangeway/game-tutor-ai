import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AiPlayerDto, AiDifficulty } from './dto/ai-player.dto';
import { GamePlayer } from '@prisma/client';

/**
 * Interface representing the AI player metadata structure
 */
interface AiPlayerMetadata {
  name?: string;
  difficulty?: AiDifficulty | string;
  description?: string;
  drawOffered?: boolean;
  drawOfferedBy?: string;
  [key: string]: any;
}

/**
 * Interface for AI player query filters
 */
interface AiPlayerFilters {
  isAi: boolean;
  [key: string]: any;
}

/**
 * Service for managing AI players
 */
@Injectable()
export class AiPlayerService {
  private readonly logger = new Logger(AiPlayerService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Find all AI players, optionally filtered by difficulty
   * @param difficulty - Optional difficulty level to filter by
   * @returns Array of AI players
   */
  async findAll(difficulty?: string): Promise<AiPlayerDto[]> {
    this.logger.debug(`Finding AI players with difficulty: ${difficulty || 'ANY'}`);
    
    try {
      // Create base where clause for AI players
      const where: AiPlayerFilters = { isAi: true };
      
      // We'll filter the difficulty after fetching since the metadata is stored as JSONB
      const aiPlayers = await this.prisma.gamePlayer.findMany({
        where,
        select: {
          id: true,
          metadata: true,
        },
      });
      
      // Transform the results to a more user-friendly format
      const formattedPlayers = aiPlayers.map(player => this.formatAiPlayer(player));
      
      // Filter by difficulty if provided
      let filteredPlayers = formattedPlayers;
      if (difficulty) {
        const upperDifficulty = difficulty.toUpperCase();
        filteredPlayers = formattedPlayers.filter(
          player => (player.difficulty as string).toUpperCase() === upperDifficulty
        );
      }
      
      this.logger.debug(`Found ${filteredPlayers.length} AI players matching criteria`);
      return filteredPlayers;
    } catch (error) {
      this.logger.error(`Error finding AI players: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Find a specific AI player by ID
   * @param id - AI player ID
   * @returns AI player details
   * @throws NotFoundException if AI player is not found
   */
  async findOne(id: string): Promise<AiPlayerDto> {
    this.logger.debug(`Finding AI player with ID: ${id}`);
    
    try {
      const aiPlayer = await this.prisma.gamePlayer.findUnique({
        where: { id },
        select: {
          id: true,
          isAi: true,
          metadata: true,
        },
      });
      
      if (!aiPlayer || !aiPlayer.isAi) {
        this.logger.warn(`AI player not found with ID: ${id}`);
        throw new NotFoundException(`AI player not found with ID: ${id}`);
      }
      
      // Transform to a more user-friendly format
      const formattedPlayer = this.formatAiPlayer(aiPlayer);
      
      this.logger.debug(`Found AI player: ${formattedPlayer.name}`);
      return formattedPlayer;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      
      this.logger.error(`Error finding AI player: ${error.message}`, error.stack);
      throw error;
    }
  }
  
  /**
   * Helper method to format an AI player entity into a DTO
   * @param player - Game player entity
   * @returns Formatted AI player DTO
   */
  private formatAiPlayer(player: Pick<GamePlayer, 'id' | 'metadata'>): AiPlayerDto {
    const metadata = player.metadata as AiPlayerMetadata || {};
    return {
      id: player.id,
      name: metadata.name || 'AI Player',
      difficulty: metadata.difficulty || AiDifficulty.BEGINNER,
      description: metadata.description || '',
    };
  }
} 