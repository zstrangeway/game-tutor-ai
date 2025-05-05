import { Controller, Get, Param, Query } from '@nestjs/common';
import { AiPlayerService } from './ai-player.service';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { AiPlayerDto } from './dto/ai-player.dto';
import { AiDifficulty } from './dto/ai-player.dto';

/**
 * Controller for managing AI player operations
 */
@ApiTags('ai-players')
@Controller('ai-players')
export class AiPlayerController {
  constructor(private readonly aiPlayerService: AiPlayerService) {}

  /**
   * Get list of AI players with optional difficulty filtering
   */
  @ApiOperation({
    summary: 'Get AI players',
    description:
      'Returns a list of available AI players, optionally filtered by difficulty',
  })
  @ApiResponse({
    status: 200,
    description: 'List of AI players retrieved successfully',
    type: [AiPlayerDto],
  })
  @ApiQuery({
    name: 'difficulty',
    description: 'Optional difficulty level to filter by',
    required: false,
    enum: AiDifficulty,
    example: AiDifficulty.BEGINNER,
  })
  @Get()
  async getAiPlayers(
    @Query('difficulty') difficulty?: string,
  ): Promise<AiPlayerDto[]> {
    return this.aiPlayerService.findAll(difficulty);
  }

  /**
   * Get a specific AI player by ID
   */
  @ApiOperation({
    summary: 'Get AI player by ID',
    description: 'Returns details of a specific AI player',
  })
  @ApiResponse({
    status: 200,
    description: 'AI player details retrieved successfully',
    type: AiPlayerDto,
  })
  @ApiResponse({
    status: 404,
    description: 'AI player not found',
  })
  @ApiParam({
    name: 'id',
    description: 'AI player ID',
    example: '734399fb-b601-4673-9dd9-d62d0993b534',
  })
  @Get(':id')
  async getAiPlayer(@Param('id') id: string): Promise<AiPlayerDto> {
    return this.aiPlayerService.findOne(id);
  }
}
