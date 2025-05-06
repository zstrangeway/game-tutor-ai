import {
  Controller,
  Post,
  Get,
  Body,
  Request,
  UseGuards,
} from '@nestjs/common';
import { MultiplayerService } from './multiplayer.service';
import { JoinQueueDto } from './dto/join-queue.dto';
import { QueueResponseDto } from './dto/queue-response.dto';
import { QueueStatusDto } from './dto/queue-status.dto';
import { RematchRequestDto } from './dto/rematch-request.dto';
import { RematchResponseDto } from './dto/rematch-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';

// Define the request with user for type safety
interface RequestWithUser extends Request {
  user: {
    id: string;
    email?: string;
    username?: string;
  };
}

@ApiTags('Multiplayer')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('multiplayer')
export class MultiplayerController {
  constructor(private readonly multiplayerService: MultiplayerService) {}

  @ApiOperation({ summary: 'Join matchmaking queue' })
  @ApiResponse({
    status: 201,
    description: 'Successfully joined queue',
    type: QueueResponseDto,
  })
  @Post('queue/join')
  async joinQueue(
    @Body() joinQueueDto: JoinQueueDto,
    @Request() req: RequestWithUser,
  ): Promise<QueueResponseDto> {
    return this.multiplayerService.joinQueue(joinQueueDto, req.user.id);
  }

  @ApiOperation({ summary: 'Leave matchmaking queue' })
  @ApiResponse({ status: 200, description: 'Successfully left queue' })
  @Post('queue/leave')
  async leaveQueue(
    @Request() req: RequestWithUser,
  ): Promise<{ success: boolean; message: string }> {
    return this.multiplayerService.leaveQueue(req.user.id);
  }

  @ApiOperation({ summary: 'Get queue status' })
  @ApiResponse({
    status: 200,
    description: 'Queue status information',
    type: QueueStatusDto,
  })
  @Get('queue/status')
  async getQueueStatus(
    @Request() req: RequestWithUser,
  ): Promise<QueueStatusDto> {
    return this.multiplayerService.getQueueStatus(req.user.id);
  }

  @ApiOperation({ summary: 'Get count of active multiplayer games' })
  @ApiResponse({ status: 200, description: 'Active games count', type: Object })
  @Get('active')
  async getActiveGames(): Promise<{ count: number }> {
    return this.multiplayerService.getActiveGames();
  }

  @ApiOperation({ summary: 'Request a rematch with opponent' })
  @ApiResponse({
    status: 200,
    description: 'Rematch request status',
    type: RematchResponseDto,
  })
  @Post('rematch')
  async requestRematch(
    @Body() rematchRequestDto: RematchRequestDto,
    @Request() req: RequestWithUser,
  ): Promise<RematchResponseDto> {
    return this.multiplayerService.requestRematch(
      rematchRequestDto,
      req.user.id,
    );
  }
}
