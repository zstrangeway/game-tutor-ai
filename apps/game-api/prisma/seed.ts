import { PrismaClient } from '@prisma/client';
import * as bcryptjs from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Seed the database with initial data

  // Create some test users if they don't exist
  const adminEmail = 'admin@gametutor.ai';
  const adminExists = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (!adminExists) {
    const hashedPassword = await bcryptjs.hash('admin123', 10);
    await prisma.user.create({
      data: {
        email: adminEmail,
        username: 'admin',
        password: hashedPassword,
        isVerified: true,
      },
    });
    console.log('Created admin user');
  }

  const testEmail = 'test@gametutor.ai';
  const testExists = await prisma.user.findUnique({
    where: { email: testEmail },
  });

  if (!testExists) {
    const hashedPassword = await bcryptjs.hash('test123', 10);
    await prisma.user.create({
      data: {
        email: testEmail,
        username: 'tester',
        password: hashedPassword,
        isVerified: true,
      },
    });
    console.log('Created test user');
  }

  // Create a demo game with an AI player
  const demoGameExists = await prisma.game.findFirst({
    where: {
      gameType: 'chess',
      gamePlayers: {
        some: {
          isAi: true,
        },
      },
    },
  });

  if (!demoGameExists) {
    // Create a chess game with initial state
    const game = await prisma.game.create({
      data: {
        gameType: 'chess',
        state: '[Event "?"]\n[Site "?"]\n[Date "????.??.??"]\n[Round "?"]\n[White "?"]\n[Black "?"]\n[Result "*"]\n\n*',
      },
    });

    // Create a user player
    await prisma.gamePlayer.create({
      data: {
        gameId: game.id,
        userId: adminExists?.id,
        isAi: false,
        role: 'white',
        metadata: {},
      },
    });

    // Create AI players for each difficulty
    const difficulties = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'];
    
    for (const difficulty of difficulties) {
      await prisma.gamePlayer.create({
        data: {
          gameId: game.id,
          isAi: true,
          role: 'black',
          metadata: {
            name: `${difficulty} Bot`,
            difficulty,
            description: `An ${difficulty.toLowerCase()} level AI opponent`,
          },
        },
      });
    }

    console.log('Created demo chess game with AI players');
  }

  console.log('Seed completed successfully');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 