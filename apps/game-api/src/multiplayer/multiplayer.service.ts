import { Injectable } from '@nestjs/common';

@Injectable()
export class MultiplayerService {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  joinQueue(data: any) {
    return { message: 'Join matchmaking queue endpoint' };
  }

  leaveQueue() {
    return { message: 'Leave matchmaking queue endpoint' };
  }

  getQueueStatus() {
    return { message: 'Check queue status endpoint' };
  }

  getActiveGames() {
    return { message: 'Get active multiplayer games count endpoint' };
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  requestRematch(data: any) {
    return { message: 'Request a rematch endpoint' };
  }
}
