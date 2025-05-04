import { Controller, Post, Body, Put } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() body: any) {
    return this.authService.register(body);
  }

  @Post('login')
  login(@Body() body: any) {
    return this.authService.login(body);
  }

  @Post('logout')
  logout() {
    return this.authService.logout();
  }

  @Post('verify')
  verify(@Body() body: any) {
    return this.authService.verify(body);
  }

  @Post('reset-password')
  requestResetPassword(@Body() body: any) {
    return this.authService.requestResetPassword(body);
  }

  @Put('reset-password')
  resetPassword(@Body() body: any) {
    return this.authService.resetPassword(body);
  }
}
