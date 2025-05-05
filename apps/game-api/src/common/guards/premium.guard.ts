import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

// Define the type for the authenticated request
interface RequestWithUser {
  user?: {
    id: string;
  };
}

/**
 * Guard that checks if a user has premium or standard subscription
 * Used to protect routes that require a paid subscription
 */
@Injectable()
export class PremiumGuard implements CanActivate {
  private readonly logger = new Logger(PremiumGuard.name);

  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const userId = request.user?.id;

    if (!userId) {
      this.logger.warn('Authentication required: user ID missing in request');
      throw new UnauthorizedException('User not authenticated');
    }

    try {
      // Check if user has an active subscription
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { subscriptionStatus: true },
      });

      if (!user) {
        this.logger.warn(`User not found: ${userId}`);
        throw new UnauthorizedException('User not found');
      }

      // Check subscription status against all paid tiers
      const isPaidSubscription = 
        user.subscriptionStatus === 'premium' ||
        user.subscriptionStatus === 'standard' ||  // Added standard tier support
        user.subscriptionStatus === 'trial';

      if (!isPaidSubscription) {
        this.logger.warn(
          `Subscription required: User ${userId} with status ${user.subscriptionStatus} attempted to access premium feature`
        );
        throw new UnauthorizedException(
          'This feature requires a paid subscription'
        );
      }

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.error(
        `Error checking subscription status: ${error.message}`,
        error.stack
      );
      throw new UnauthorizedException('Error validating subscription status');
    }
  }
}
