import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto, UpdatePreferencesDto } from './dto/user.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get a user's profile by user ID
   * @param userId The ID of the user
   * @returns User profile information
   */
  async getProfile(userId: string) {
    const user = await this.findById(userId);

    return {
      id: user.id,
      email: user.email,
      username: user.username,
      createdAt: user.createdAt,
      elo: user.elo,
      preferences: user.preferences,
      subscriptionStatus: user.subscriptionStatus,
    };
  }

  /**
   * Update a user's profile information
   * @param userId The ID of the user
   * @param data Profile data to update
   * @returns Updated user profile
   * @throws ConflictException if username or email is already in use
   */
  async updateProfile(userId: string, data: UpdateProfileDto) {
    // Check if username is already taken if we're trying to update it
    if (data.username) {
      const existingUser = await this.prisma.user.findUnique({
        where: { username: data.username },
      });

      if (existingUser && existingUser.id !== userId) {
        throw new ConflictException('Username already taken');
      }
    }

    // Check if email is already taken if we're trying to update it
    if (data.email) {
      const existingUser = await this.prisma.user.findUnique({
        where: { email: data.email },
      });

      if (existingUser && existingUser.id !== userId) {
        throw new ConflictException('Email already in use');
      }
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.email && { email: data.email }),
        ...(data.username && { username: data.username }),
      },
    });

    return {
      id: updatedUser.id,
      email: updatedUser.email,
      username: updatedUser.username,
      createdAt: updatedUser.createdAt,
      updatedAt: updatedUser.updatedAt,
    };
  }

  /**
   * Update a user's preferences
   * @param userId The ID of the user
   * @param data The preferences data to update
   * @returns Updated user preferences
   */
  async updatePreferences(userId: string, data: UpdatePreferencesDto) {
    // Ensure user exists
    await this.findById(userId);

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        preferences: data.preferences as unknown as Prisma.InputJsonValue,
      },
    });

    return {
      id: updatedUser.id,
      preferences: updatedUser.preferences,
    };
  }

  /**
   * Get a user's game statistics
   * @param userId The ID of the user
   * @returns User game statistics including win rate and ELO
   */
  async getStats(userId: string) {
    // Ensure user exists
    const user = await this.findById(userId);

    // Get game statistics
    const totalGames = await this.prisma.gamePlayer.count({
      where: {
        userId,
        isAi: false,
      },
    });

    // Get wins/losses
    const games = await this.prisma.gamePlayer.findMany({
      where: {
        userId,
        isAi: false,
      },
      include: {
        game: true,
      },
    });

    // Calculate wins and losses
    let wins = 0;
    let losses = 0;
    let draws = 0;

    games.forEach((playerGame) => {
      const game = playerGame.game;
      const playerRole = playerGame.role;

      if (!game.result) {
        return; // Game not complete
      }

      if (game.result === '1-0' && playerRole === 'white') {
        wins++;
      } else if (game.result === '0-1' && playerRole === 'black') {
        wins++;
      } else if (game.result === '1-0' && playerRole === 'black') {
        losses++;
      } else if (game.result === '0-1' && playerRole === 'white') {
        losses++;
      } else if (game.result === '1/2-1/2') {
        draws++;
      }
    });

    return {
      userId: user.id,
      username: user.username,
      elo: user.elo,
      totalGames,
      wins,
      losses,
      draws,
      winRate: totalGames > 0 ? (wins / totalGames) * 100 : 0,
    };
  }

  /**
   * Find a user by ID
   * @param id The ID of the user to find
   * @returns User data
   * @throws NotFoundException if user doesn't exist
   */
  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return user;
  }
}
