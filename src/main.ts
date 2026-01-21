import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DatabaseService } from './database';
import { setupServer } from './server';
import { ConfigValidatorService } from './validators';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  console.log('Mounting validations...');
  const configValidator = app.get(ConfigValidatorService);
  const isValid = await configValidator.validateAll();

  if (!isValid) {
    console.error('Configuration validation failed');
    await app.close();
    process.exit(1);
  }
  console.log('Configuration validation passed');

  console.log('Mounting database...');
  const databaseService = app.get(DatabaseService);
  const connected = await databaseService.checkConnection();

  if (!connected) {
    console.error('Failed to connect to database');
    await app.close();
    process.exit(1);
  }
  console.log('Database connected successfully');

  const configService = app.get(ConfigService);
  const port = configService.get<number>('port', 3000);
  const nodeEnv = configService.get<string>('nodeEnv', 'development');

  console.log('Setting up server...');
  setupServer(app, configService);

  await app.listen(port);

  console.log(`
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
  `);
}

// Handle uncaught errors
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

process.on('uncaughtException', error => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

bootstrap();
