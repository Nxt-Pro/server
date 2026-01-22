import { Logger as NestLogger } from '@nestjs/common';
import { Logger as TypeOrmLogger } from 'typeorm';

export class DatabaseLogger implements TypeOrmLogger {
  private readonly logger = new NestLogger('Database');

  logQuery(query: string, parameters?: unknown[]) {
    this.logger.debug(
      `Query: ${query}${parameters?.length ? ' Params: ' + JSON.stringify(parameters) : ''}`,
    );
  }

  logQueryError(error: string | Error, query: string) {
    this.logger.error(
      `Query failed: ${query} - ${error}`,
      error instanceof Error ? error.stack : undefined,
    );
  }

  logQuerySlow(time: number, query: string) {
    this.logger.warn(`Slow query (${time}ms): ${query}`);
  }

  logSchemaBuild(message: string) {
    this.logger.log(message);
  }

  logMigration(message: string) {
    this.logger.log(message);
  }

  log(level: 'log' | 'info' | 'warn', message: string) {
    if (level === 'log' || level === 'info') {
      this.logger.log(message);
    } else if (level === 'warn') {
      this.logger.warn(message);
    }
  }
}
