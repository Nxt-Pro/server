import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DatabaseService } from './database';
import { setupServer } from './server';
import { ConfigValidatorService } from '@/common/validators';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  const logger = new Logger('Bootstrap');

  logger.log('Mounting validations...');
  const configValidator = app.get(ConfigValidatorService);
  const isValid = await configValidator.validateAll();

  if (!isValid) {
    logger.error('Configuration validation failed');
    await app.close();
    process.exit(1);
  }
  logger.log('Configuration validation passed');

  logger.log('Mounting database...');
  const databaseService = app.get(DatabaseService);
  const connected = await databaseService.checkConnection();

  if (!connected) {
    logger.error('Failed to connect to database');
    await app.close();
    process.exit(1);
  }
  logger.log('Database connected successfully');

  const configService = app.get(ConfigService);
  const port = configService.get<number>('port', 3000);
  const nodeEnv = configService.get<string>('nodeEnv', 'development');

  logger.log('Setting up server...');
  setupServer(app, configService);

  await app.listen(port);

  const serverBox = `
\u001b[37m
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║  🚀 NxtPro API Server Started                             ║
║                                                           ║
║  Environment: ${nodeEnv.padEnd(43)} ║
║  Port:        ${String(port).padEnd(43)} ║
║  URL:         http://localhost:${port}/api${' '.repeat(18)} ║
║  Health:      http://localhost:${port}/api/health${' '.repeat(11)} ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
\u001b[0m`;
  logger.log(serverBox);

  // Handle uncaught errors
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
  });

  process.on('uncaughtException', error => {
    logger.error('Uncaught Exception:', error);
    process.exit(1);
  });
}

void bootstrap();
