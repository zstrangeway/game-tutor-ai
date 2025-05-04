import { Controller, Post, Get, Body } from '@nestjs/common';
import { MultiplayerService } from './multiplayer.service';

@Controller('multiplayer')
export class MultiplayerController {
  constructor(private readonly multiplayerService: MultiplayerService) {}

  @Post('queue/join')
  joinQueue(@Body() body: any) {
    return this.multiplayerService.joinQueue(body);
  }

  @Post('queue/leave')
  leaveQueue() {
    return this.multiplayerService.leaveQueue();
  }

  @Get('queue/status')
  getQueueStatus() {
    return this.multiplayerService.getQueueStatus();
  }

  @Get('active')
  getActiveGames() {
    return this.multiplayerService.getActiveGames();
  }

  @Post('rematch')
  requestRematch(@Body() body: any) {
    return this.multiplayerService.requestRematch(body);
  }
}
