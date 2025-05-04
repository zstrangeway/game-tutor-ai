import {
  Controller,
  Post,
  Body,
  Put,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  ClassSerializerInterceptor,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import {
  RegisterDto,
  LoginDto,
  VerifyEmailDto,
  RequestPasswordResetDto,
  ResetPasswordDto,
  RefreshTokenDto,
} from './dto/auth.dto';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

// Define interface for the Request with user property
interface RequestWithUser extends Request {
  user: {
    id: string;
  };
}

@ApiTags('Authentication')
@Controller('auth')
@UseInterceptors(ClassSerializerInterceptor)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiOperation({ summary: 'Register a new user' })
  @ApiBody({ type: () => RegisterDto })
  @ApiResponse({
    status: 201,
    description: 'User successfully registered. Verification email sent.',
  })
  @ApiResponse({
    status: 409,
    description: 'Email or username already in use',
  })
  @Post('register')
  @Throttle({ default: { limit: 3, ttl: 60000 } }) // Stricter rate limit for registration
  register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @ApiOperation({ summary: 'Authenticate a user' })
  @ApiBody({ type: () => LoginDto })
  @ApiResponse({
    status: 200,
    description: 'User successfully authenticated. JWT token returned.',
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid credentials',
  })
  @UseGuards(LocalAuthGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // Rate limit for login attempts
  async login(@Request() req: any, @Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @ApiOperation({ summary: 'Logout a user' })
  @ApiResponse({
    status: 200,
    description: 'User successfully logged out',
  })
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(
    @Request() req: RequestWithUser,
    @Body() body: { refreshToken: string },
  ) {
    return this.authService.logout(req.user.id, body.refreshToken);
  }

  @ApiOperation({ summary: 'Refresh access token' })
  @ApiBody({ type: () => RefreshTokenDto })
  @ApiResponse({
    status: 200,
    description: 'Token successfully refreshed',
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid refresh token',
  })
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // Rate limit for refresh token requests
  refreshToken(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refreshToken(refreshTokenDto);
  }

  @ApiOperation({ summary: 'Verify user email address' })
  @ApiBody({ type: () => VerifyEmailDto })
  @ApiResponse({
    status: 200,
    description: 'Email successfully verified',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid or expired verification token',
  })
  @Post('verify')
  @HttpCode(HttpStatus.OK)
  verify(@Body() verifyEmailDto: VerifyEmailDto) {
    return this.authService.verify(verifyEmailDto);
  }

  @ApiOperation({ summary: 'Request password reset' })
  @ApiBody({ type: () => RequestPasswordResetDto })
  @ApiResponse({
    status: 200,
    description: 'Password reset email sent if email is registered',
  })
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 3, ttl: 60000 } }) // Rate limit for password reset requests
  requestResetPassword(@Body() requestResetDto: RequestPasswordResetDto) {
    return this.authService.requestResetPassword(requestResetDto);
  }

  @ApiOperation({ summary: 'Reset user password with token' })
  @ApiBody({ type: () => ResetPasswordDto })
  @ApiResponse({
    status: 200,
    description: 'Password successfully reset',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid or expired reset token',
  })
  @Put('reset-password')
  @HttpCode(HttpStatus.OK)
  resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetPasswordDto);
  }
}
