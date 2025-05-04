import { PrismaClient } from '../generated/prisma';
const prisma = new PrismaClient();

async function main() {
  // Create a test user
  const testUser = await prisma.user.upsert({
    where: { email: 'test@example.com' },
    update: {},
    create: {
      email: 'test@example.com',
      username: 'testuser',
      elo: { chess: 800 },
      preferences: { theme: 'light' },
      subscriptionStatus: 'free',
    },
  });

  // Create a premium user
  const premiumUser = await prisma.user.upsert({
    where: { email: 'premium@example.com' },
    update: {},
    create: {
      email: 'premium@example.com',
      username: 'premiumuser',
      elo: { chess: 1200 },
      preferences: { theme: 'dark' },
      subscriptionStatus: 'premium',
    },
  });

  console.log({ testUser, premiumUser });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 