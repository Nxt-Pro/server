import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import compression from 'compression';
import helmet from 'helmet';
import express from 'express';

import { ConfigService } from '@nestjs/config';
import { LoggingMiddleware } from '@/common/middlewares';

const UPLOADS_CACHE_MAX_AGE = '30d';

function resolveCorsOrigin(value: string): string | string[] {
  if (value === '*') return value;

  const origins = value
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean);

  return origins.length <= 1 ? (origins[0] ?? value) : origins;
}

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
  const corsOrigin = configService.get<string>('corsOrigin', '*');
  app.enableCors({
    origin: resolveCorsOrigin(corsOrigin),
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
  app.use(
    '/uploads',
    express.static(uploadPath, {
      acceptRanges: true,
      etag: true,
      immutable: true,
      lastModified: true,
      maxAge: UPLOADS_CACHE_MAX_AGE,
      setHeaders: res => {
        res.setHeader('Content-Disposition', 'inline');
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
        res.setHeader('X-Content-Type-Options', 'nosniff');
      },
    }),
  );

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

  // Graceful shutdown. Jest e2e runs should not install process signal hooks.
  if (configService.get<string>('nodeEnv') !== 'test') {
    app.enableShutdownHooks();
  }
}
