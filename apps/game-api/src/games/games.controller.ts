import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Request,
  UseGuards,
  HttpException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { GamesService } from './games.service';
import {
  CreateGameDto,
  DrawResponseDto,
  GameDto,
  GameStateDto,
  GetGamesDto,
  MoveDto,
  PaginatedGamesDto,
  PgnDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PremiumGuard } from '../common/guards/premium.guard';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';

// Define error interface for better error handling
interface ErrorWithMessage {
  message: string;
  stack?: string;
}

// Define the type for the authenticated request
interface RequestWithUser extends Request {
  user: {
    id: string;
    email?: string;
    username?: string;
  };
}

@ApiTags('games')
@ApiBearerAuth()
@Controller('games')
@UseGuards(JwtAuthGuard)
export class GamesController {
  private readonly logger = new Logger(GamesController.name);

  constructor(private readonly gamesService: GamesService) {}

  @Post('new')
  @ApiOperation({ summary: 'Create a new game' })
  @ApiResponse({
    status: 201,
    description: 'The game has been successfully created',
    type: GameDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async createGame(
    @Body() createGameDto: CreateGameDto,
    @Request() req: RequestWithUser,
  ): Promise<GameDto> {
    try {
      return await this.gamesService.createGame(createGameDto, req.user.id);
    } catch (error) {
      this.handleError(error, `Error creating game`);
    }
  }

  @Get()
  @ApiOperation({ summary: 'Get a list of games for the current user' })
  @ApiResponse({
    status: 200,
    description: 'List of games retrieved successfully',
    type: PaginatedGamesDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getGames(
    @Query() queryParams: GetGamesDto,
    @Request() req: RequestWithUser,
  ): Promise<PaginatedGamesDto> {
    return this.gamesService.getGames(queryParams, req.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific game by ID' })
  @ApiParam({ name: 'id', description: 'Game ID' })
  @ApiResponse({
    status: 200,
    description: 'Game retrieved successfully',
    type: GameDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Game not found' })
  async getGame(
    @Param('id') id: string,
    @Request() req: RequestWithUser,
  ): Promise<GameDto> {
    return this.gamesService.getGame(id, req.user.id);
  }

  @Post(':id/move')
  @ApiOperation({ summary: 'Submit a move in a game' })
  @ApiParam({ name: 'id', description: 'Game ID' })
  @ApiResponse({
    status: 200,
    description: 'Move submitted successfully',
    type: GameStateDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid move or not your turn' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Game not found' })
  async submitMove(
    @Param('id') id: string,
    @Body() moveDto: MoveDto,
    @Request() req: RequestWithUser,
  ): Promise<GameStateDto> {
    return this.gamesService.submitMove(id, moveDto.move, req.user.id);
  }

  @Post(':id/resign')
  @ApiOperation({ summary: 'Resign from a game' })
  @ApiParam({ name: 'id', description: 'Game ID' })
  @ApiResponse({
    status: 200,
    description: 'Game resigned successfully',
    type: GameStateDto,
  })
  @ApiResponse({ status: 400, description: 'Game has already ended' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Game not found' })
  async resignGame(
    @Param('id') id: string,
    @Request() req: RequestWithUser,
  ): Promise<GameStateDto> {
    return this.gamesService.resignGame(id, req.user.id);
  }

  @Post(':id/draw/offer')
  @ApiOperation({ summary: 'Offer a draw in a game' })
  @ApiParam({ name: 'id', description: 'Game ID' })
  @ApiResponse({
    status: 200,
    description: 'Draw offered successfully',
    type: GameStateDto,
  })
  @ApiResponse({ status: 400, description: 'Game has already ended' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Game not found' })
  async offerDraw(
    @Param('id') id: string,
    @Request() req: RequestWithUser,
  ): Promise<GameStateDto> {
    return this.gamesService.offerDraw(id, req.user.id);
  }

  @Post(':id/draw/respond')
  @ApiOperation({ summary: 'Respond to a draw offer' })
  @ApiParam({ name: 'id', description: 'Game ID' })
  @ApiResponse({
    status: 200,
    description: 'Draw response submitted successfully',
    type: GameStateDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Game has already ended or no draw offered',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Game not found' })
  async respondToDraw(
    @Param('id') id: string,
    @Body() drawResponseDto: DrawResponseDto,
    @Request() req: RequestWithUser,
  ): Promise<GameStateDto> {
    return this.gamesService.respondToDraw(
      id,
      drawResponseDto.accept,
      req.user.id,
    );
  }

  @Get(':id/pgn')
  @UseGuards(PremiumGuard)
  @ApiOperation({
    summary: 'Get the PGN notation for a game',
    description: 'Premium feature: requires a premium subscription',
  })
  @ApiParam({ name: 'id', description: 'Game ID' })
  @ApiResponse({
    status: 200,
    description: 'PGN retrieved successfully',
    type: PgnDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized or not premium' })
  @ApiResponse({ status: 404, description: 'Game not found' })
  async getPgn(
    @Param('id') id: string,
    @Request() req: RequestWithUser,
  ): Promise<PgnDto> {
    return this.gamesService.getPgn(id, req.user.id);
  }

  /**
   * Standardized error handling for controller methods
   * @param error - The caught error
   * @param defaultMessage - Default message if error type is unknown
   * @throws HttpException with appropriate status
   */
  private handleError(error: unknown, defaultMessage: string): never {
    if (error instanceof HttpException) {
      throw error;
    }

    const err = error as ErrorWithMessage;
    this.logger.error(`${defaultMessage}: ${err.message}`, err.stack);
    throw new InternalServerErrorException(defaultMessage);
  }
}
