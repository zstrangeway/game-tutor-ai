import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';
import { Logger } from '@nestjs/common';

/**
 * Script to seed AI players
 */
async function bootstrap() {
  const logger = new Logger('SeedAiPlayers');
  logger.log('Starting to seed AI players...');

  const app = await NestFactory.createApplicationContext(AppModule);
  const prisma = app.get(PrismaService);

  // Create a demo game with AI players if they don't exist
  const aiPlayersExist = await prisma.gamePlayer.findMany({
    where: { isAi: true },
    take: 1,
  });

  if (aiPlayersExist.length === 0) {
    logger.log('No AI players found, creating demo game with AI players');

    // Create a chess game with initial state
    const game = await prisma.game.create({
      data: {
        gameType: 'chess',
        state:
          '[Event "?"]\n[Site "?"]\n[Date "????.??.??"]\n[Round "?"]\n[White "?"]\n[Black "?"]\n[Result "*"]\n\n*',
      },
    });

    logger.log(`Created demo game with ID: ${game.id}`);

    // Find an admin user or create one
    let adminId: string;
    const adminUser = await prisma.user.findFirst({
      where: {
        OR: [{ username: 'admin' }, { email: 'admin@gametutor.ai' }],
      },
    });

    if (adminUser) {
      adminId = adminUser.id;
    } else {
      // Create a user for the game
      const newUser = await prisma.user.create({
        data: {
          email: 'admin@gametutor.ai',
          username: 'admin',
          password: 'hashed_password_placeholder', // In real use, hash with bcryptjs
          isVerified: true,
        },
      });
      adminId = newUser.id;
      logger.log(`Created admin user with ID: ${adminId}`);
    }

    // Create a user player
    await prisma.gamePlayer.create({
      data: {
        gameId: game.id,
        userId: adminId,
        isAi: false,
        role: 'white',
        metadata: {},
      },
    });

    logger.log('Created human player for the game');

    // Create AI players for each difficulty
    const difficulties = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'];

    for (const difficulty of difficulties) {
      const aiPlayer = await prisma.gamePlayer.create({
        data: {
          gameId: game.id,
          isAi: true,
          role: 'black', // Will be overridden in actual games
          metadata: {
            name: `${difficulty} Bot`,
            difficulty,
            description: `An ${difficulty.toLowerCase()} level AI opponent`,
          },
        },
      });
      logger.log(`Created ${difficulty} AI player with ID: ${aiPlayer.id}`);
    }

    logger.log('Successfully created all AI players');
  } else {
    logger.log('AI players already exist, skipping seeding');
  }

  await app.close();
  logger.log('Seed completed successfully');
}

bootstrap().catch((err) => {
  console.error('Error during seeding:', err);
  process.exit(1);
});
