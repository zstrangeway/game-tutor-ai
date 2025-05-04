import { Controller, Post, Get, Body, Param } from '@nestjs/common';
import { GamesService } from './games.service';

@Controller('games')
export class GamesController {
  constructor(private readonly gamesService: GamesService) {}

  @Post('new')
  createGame(@Body() body: any) {
    return this.gamesService.createGame(body);
  }

  @Get()
  getGames() {
    return this.gamesService.getGames();
  }

  @Get(':id')
  getGameDetails(@Param('id') id: string) {
    return this.gamesService.getGameDetails(id);
  }

  @Post(':id/move')
  submitMove(@Param('id') id: string, @Body() body: any) {
    return this.gamesService.submitMove(id, body);
  }

  @Post(':id/resign')
  resign(@Param('id') id: string) {
    return this.gamesService.resign(id);
  }

  @Post(':id/draw/offer')
  offerDraw(@Param('id') id: string) {
    return this.gamesService.offerDraw(id);
  }

  @Post(':id/draw/respond')
  respondToDraw(@Param('id') id: string, @Body() body: any) {
    return this.gamesService.respondToDraw(id, body);
  }

  @Get(':id/pgn')
  getPgn(@Param('id') id: string) {
    return this.gamesService.getPgn(id);
  }
}
