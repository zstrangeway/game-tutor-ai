import {
  Controller,
  Get,
  Put,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UpdateProfileDto, UpdatePreferencesDto } from './dto/user.dto';

// Add interface for the authenticated user
interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    [key: string]: unknown;
  };
}

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(JwtAuthGuard)
  @Get('me')
  getProfile(@Request() req: AuthenticatedRequest) {
    return this.usersService.getProfile(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Put('me')
  updateProfile(
    @Request() req: AuthenticatedRequest,
    @Body() updateProfileDto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(req.user.id, updateProfileDto);
  }

  @UseGuards(JwtAuthGuard)
  @Put('me/preferences')
  updatePreferences(
    @Request() req: AuthenticatedRequest,
    @Body() updatePreferencesDto: UpdatePreferencesDto,
  ) {
    return this.usersService.updatePreferences(
      req.user.id,
      updatePreferencesDto,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('me/stats')
  getStats(@Request() req: AuthenticatedRequest) {
    return this.usersService.getStats(req.user.id);
  }

  // Example of a route that gets a user by ID using Prisma
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findById(@Param('id') id: string) {
    return this.usersService.findById(id);
  }
}
