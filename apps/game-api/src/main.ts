import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(process.env.PORT ?? 3001);
}

// Handle the bootstrap promise
bootstrap().catch((error) => {
  console.error('Failed to start application:', error);
  process.exit(1);
});
