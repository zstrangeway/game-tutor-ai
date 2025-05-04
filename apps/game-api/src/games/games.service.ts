import { Injectable } from '@nestjs/common';

@Injectable()
export class GamesService {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  createGame(data: any) {
    return { message: 'Create new game endpoint' };
  }

  getGames() {
    return { message: 'Get list of user games endpoint' };
  }

  getGameDetails(id: string) {
    return { message: `Get game details endpoint for game ${id}` };
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  submitMove(id: string, data: any) {
    return { message: `Submit move endpoint for game ${id}` };
  }

  resign(id: string) {
    return { message: `Resign endpoint for game ${id}` };
  }

  offerDraw(id: string) {
    return { message: `Offer draw endpoint for game ${id}` };
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  respondToDraw(id: string, data: any) {
    return { message: `Respond to draw offer endpoint for game ${id}` };
  }

  getPgn(id: string) {
    return { message: `Get PGN notation endpoint for game ${id}` };
  }
}
