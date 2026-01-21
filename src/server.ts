import { INestApplication, ValidationPipe } from '@nestjs/common';
import compression from 'compression';
import helmet from 'helmet';

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
