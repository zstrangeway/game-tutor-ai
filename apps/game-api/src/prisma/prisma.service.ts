import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    super();
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  async cleanDatabase() {
    if (process.env.NODE_ENV === 'production') {
      return;
    }
    // Only allow in development/test environments
    const models = Reflect.ownKeys(this).filter(
      (key) => typeof key === 'string' && !key.startsWith('_'),
    );

    return Promise.all(
      models.map((modelKey) => {
        const model = this[modelKey as keyof PrismaClient];
        if (
          typeof model === 'object' &&
          model !== null &&
          'deleteMany' in model
        ) {
          // Using type assertion for better safety
          const modelWithDeleteMany = model as {
            deleteMany: () => Promise<unknown>;
          };
          return modelWithDeleteMany.deleteMany();
        }
        return null;
      }),
    );
  }
}
