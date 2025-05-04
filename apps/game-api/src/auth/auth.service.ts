import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import {
  RegisterDto,
  LoginDto,
  VerifyEmailDto,
  RequestPasswordResetDto,
  ResetPasswordDto,
  RefreshTokenDto,
} from './dto/auth.dto';
import { randomBytes } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { EmailService } from '../common/services/email.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private emailService: EmailService,
  ) {}

  async register(data: RegisterDto) {
    // Check if email is already in use
    const existingEmail = await this.prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingEmail) {
      throw new ConflictException('Email already in use');
    }

    // Check if username is already in use
    const existingUsername = await this.prisma.user.findUnique({
      where: { username: data.username },
    });

    if (existingUsername) {
      throw new ConflictException('Username already in use');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(data.password, 10);

    // Generate email verification token
    const verificationToken = randomBytes(32).toString('hex');
    const tokenExpiration = new Date();
    tokenExpiration.setHours(tokenExpiration.getHours() + 24); // 24 hour expiration

    try {
      // Create user with transaction to ensure both user and token are created
      const result = await this.prisma.$transaction(async (prisma) => {
        // Create user with hashed password
        const user = await prisma.user.create({
          data: {
            email: data.email,
            username: data.username,
            password: hashedPassword,
            elo: { chess: 800 }, // Default Elo for chess
            preferences: {},
            subscriptionStatus: 'free',
          },
        });

        // Create verification token
        await prisma.verificationToken.create({
          data: {
            userId: user.id,
            token: verificationToken,
            expires: tokenExpiration,
          },
        });

        return user;
      });

      // Send verification email using our EmailService
      await this.emailService.sendVerificationEmail(
        result.email,
        verificationToken,
      );

      this.logger.log(`User registered successfully: ${result.email}`);

      return {
        message:
          'User registered successfully. Please check your email to verify your account.',
        userId: result.id,
      };
    } catch (error) {
      this.logger.error(
        `Registration failed for email ${data.email}: ${(error as Error).message}`,
      );
      throw new InternalServerErrorException(
        'Registration failed. Please try again.',
      );
    }
  }

  async validateUser(email: string, password: string) {
    // Get user with password for comparison
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      this.logger.warn(`Failed login attempt for non-existent user: ${email}`);
      return null;
    }

    // Compare the provided password with the stored hash
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      this.logger.warn(
        `Failed login attempt for user: ${email} (invalid password)`,
      );
      return null;
    }

    // Remove the password from the returned user object
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _passwordToRemove, ...result } = user;
    return result;
  }

  async login(data: LoginDto) {
    const user = await this.validateUser(data.email, data.password);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Create tokens
    const tokens = await this.generateTokens(user);

    // Store refresh token in database
    await this.storeRefreshToken(user.id, tokens.refreshToken);

    this.logger.log(`Successful login for user: ${user.email}`);

    return {
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        isVerified: user.isVerified,
        subscriptionStatus: user.subscriptionStatus,
      },
    };
  }

  async logout(userId: string, refreshToken: string) {
    // Invalidate the refresh token by adding it to the token blacklist
    await this.prisma.tokenBlacklist.create({
      data: {
        token: refreshToken,
        userId,
        expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now (or match your token expiry)
      },
    });

    // Delete the refresh token
    await this.prisma.refreshToken.deleteMany({
      where: {
        userId,
        token: refreshToken,
      },
    });

    return { message: 'Logout successful' };
  }

  async refreshToken(data: RefreshTokenDto) {
    try {
      // Check if token is blacklisted
      const blacklisted = await this.prisma.tokenBlacklist.findFirst({
        where: {
          token: data.refreshToken,
        },
      });

      if (blacklisted) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Verify the refresh token
      const payload = await this.jwtService.verifyAsync<{
        sub: string;
        email: string;
        username: string;
        iat: number;
        jti: string;
      }>(data.refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });

      // Find the token in the database
      const tokenRecord = await this.prisma.refreshToken.findFirst({
        where: {
          userId: payload.sub,
          token: data.refreshToken,
        },
      });

      if (!tokenRecord) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Get the user
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: {
          id: true,
          email: true,
          username: true,
          isVerified: true,
          subscriptionStatus: true,
        },
      });

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      // Generate new tokens
      const tokens = await this.generateTokens(user);

      // Replace the old refresh token with the new one
      await this.prisma.refreshToken.update({
        where: { id: tokenRecord.id },
        data: { token: tokens.refreshToken },
      });

      return {
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
      };
    } catch (error) {
      this.logger.error(`Refresh token failed: ${(error as Error).message}`);
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  private async generateTokens(user: {
    id: string;
    email: string;
    username: string;
  }) {
    const payload = {
      sub: user.id,
      email: user.email,
      username: user.username,
      // Add a timestamp to ensure each token is unique
      iat: Math.floor(Date.now() / 1000),
      jti: randomBytes(8).toString('hex'),
    };

    // Get JWT secrets from environment using ConfigService
    const accessSecret = this.configService.get<string>('JWT_SECRET');
    const refreshSecret = this.configService.get<string>('JWT_REFRESH_SECRET');

    if (!accessSecret || !refreshSecret) {
      throw new InternalServerErrorException('JWT configuration error');
    }

    // Add an await to satisfy the require-await rule
    const accessTokenPromise = this.jwtService.signAsync(payload, {
      secret: accessSecret,
      expiresIn: '15m', // Short-lived access token
    });

    const refreshTokenPromise = this.jwtService.signAsync(payload, {
      secret: refreshSecret,
      expiresIn: '7d', // Long-lived refresh token
    });

    const [accessToken, refreshToken] = await Promise.all([
      accessTokenPromise,
      refreshTokenPromise,
    ]);

    return { accessToken, refreshToken };
  }

  private async storeRefreshToken(userId: string, token: string) {
    // Delete any existing refresh tokens for this user
    await this.prisma.refreshToken.deleteMany({
      where: { userId },
    });

    // Create new refresh token
    await this.prisma.refreshToken.create({
      data: {
        userId,
        token,
        expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });
  }

  async verify(data: VerifyEmailDto) {
    // Find verification token
    const verification = await this.prisma.verificationToken.findUnique({
      where: { token: data.token },
      include: { user: true },
    });

    if (!verification || verification.expires < new Date()) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    try {
      // Mark user as verified and delete token in a transaction
      await this.prisma.$transaction(async (prisma) => {
        // Update user as verified
        await prisma.user.update({
          where: { id: verification.userId },
          data: { isVerified: true },
        });

        // Delete used token
        await prisma.verificationToken.delete({
          where: { id: verification.id },
        });
      });

      this.logger.log(
        `Email verified successfully for user ID: ${verification.userId}`,
      );
      return { message: 'Email verified successfully' };
    } catch (error) {
      this.logger.error(
        `Verification failed for token: ${data.token.substring(0, 8)}...: ${(error as Error).message}`,
      );
      throw new InternalServerErrorException(
        'Verification failed. Please try again.',
      );
    }
  }

  async requestResetPassword(data: RequestPasswordResetDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: data.email },
    });

    if (!user) {
      // Log attempt but return generic message for security
      this.logger.warn(
        `Password reset requested for non-existent email: ${data.email}`,
      );
      return {
        message:
          'If your email is registered, you will receive a password reset link',
      };
    }

    // Generate reset token with 1-hour expiration
    const resetToken = randomBytes(32).toString('hex');
    const tokenExpiration = new Date();
    tokenExpiration.setHours(tokenExpiration.getHours() + 1);

    try {
      // Create password reset token
      await this.prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          token: resetToken,
          expires: tokenExpiration,
        },
      });

      // Send reset email using our EmailService
      await this.emailService.sendPasswordResetEmail(user.email, resetToken);

      this.logger.log(`Password reset token created for user: ${user.email}`);
      return {
        message:
          'If your email is registered, you will receive a password reset link',
      };
    } catch (error) {
      this.logger.error(
        `Failed to create password reset token for ${user.email}: ${(error as Error).message}`,
      );
      throw new InternalServerErrorException(
        'Failed to process password reset. Please try again.',
      );
    }
  }

  async resetPassword(data: ResetPasswordDto) {
    // Find valid reset token
    const resetRecord = await this.prisma.passwordResetToken.findUnique({
      where: { token: data.token },
    });

    if (!resetRecord || resetRecord.expires < new Date()) {
      this.logger.warn(
        `Invalid or expired password reset attempt with token: ${data.token.substring(0, 8)}...`,
      );
      throw new BadRequestException('Invalid or expired reset token');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(data.password, 10);

    try {
      // Update password and delete token in a transaction
      await this.prisma.$transaction(async (prisma) => {
        // Update user password
        await prisma.user.update({
          where: { id: resetRecord.userId },
          data: { password: hashedPassword },
        });

        // Delete used token
        await prisma.passwordResetToken.delete({
          where: { id: resetRecord.id },
        });
      });

      this.logger.log(
        `Password reset successful for user ID: ${resetRecord.userId}`,
      );
      return { message: 'Password reset successful' };
    } catch (error) {
      this.logger.error(
        `Password reset failed for user ID: ${resetRecord.userId}: ${(error as Error).message}`,
      );
      throw new InternalServerErrorException(
        'Password reset failed. Please try again.',
      );
    }
  }
}
