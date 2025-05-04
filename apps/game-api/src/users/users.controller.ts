import { Controller, Get, Put, Body } from '@nestjs/common';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  getProfile() {
    return this.usersService.getProfile();
  }

  @Put('me')
  updateProfile(@Body() body: any) {
    return this.usersService.updateProfile(body);
  }

  @Put('me/preferences')
  updatePreferences(@Body() body: any) {
    return this.usersService.updatePreferences(body);
  }

  @Get('me/stats')
  getStats() {
    return this.usersService.getStats();
  }
}
