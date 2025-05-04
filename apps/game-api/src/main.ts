import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import helmet from 'helmet';
import * as compression from 'compression';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  // Create the NestJS application
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  // Get config service
  const configService = app.get(ConfigService);

  // Set global prefix
  app.setGlobalPrefix('api');

  // Enable CORS for the frontend
  app.enableCors({
    origin: configService.get<string>('CORS_ORIGIN', 'https://plydojo.ai'),
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
  });

  // Apply security headers
  app.use(helmet());

  // Response compression
  app.use(compression());

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Global exception filter
  app.useGlobalFilters(new HttpExceptionFilter());

  // Setup Swagger documentation
  if (configService.get<string>('NODE_ENV') !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('GameTutorAI API')
      .setDescription('The GameTutorAI API documentation')
      .setVersion('1.0')
      .addTag('Authentication')
      .addTag('Users')
      .addTag('Games')
      .addTag('Subscription')
      .addTag('Multiplayer')
      .addTag('Chat')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
    logger.log('Swagger documentation available at /api/docs');
  }

  // Start the server
  const port = configService.get<number>('PORT', 3001);
  await app.listen(port);

  logger.log(`Server running on port ${port}`);
}

// Handle the bootstrap promise
bootstrap().catch((error) => {
  console.error('Failed to start application:', error);
  process.exit(1);
});
