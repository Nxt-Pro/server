import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import compression from 'compression';
import helmet from 'helmet';
import express from 'express';

import { ConfigService } from '@nestjs/config';
import { LoggingMiddleware } from '@/common/middlewares';

export function setupServer(
  app: INestApplication,
  configService: ConfigService,
): void {
  // Global prefix
  app.setGlobalPrefix('api');

  // Middlewares
  const loggingMiddleware = new LoggingMiddleware();

  app.use(helmet());
  app.use(compression());
  app.use(loggingMiddleware.use.bind(loggingMiddleware));

  // CORS
  app.enableCors({
    origin: configService.get<string>('corsOrigin', '*'),
    credentials: true,
  });

  const uploadDir = configService.get<string>(
    'upload.localUploadDir',
    'uploads',
  );
  const uploadPath = join(process.cwd(), uploadDir);
  if (!existsSync(uploadPath)) {
    mkdirSync(uploadPath, { recursive: true });
  }
  app.use('/uploads', express.static(uploadPath));

  // Global pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Graceful shutdown
  app.enableShutdownHooks();
}
