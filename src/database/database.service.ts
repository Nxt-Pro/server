import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Called when module initializes
   */
  async onModuleInit() {
    const isConnected = await this.checkConnection();

    if (!isConnected) {
      throw new Error('Failed to establish database connection');
    }
  }

  /**
   * Called when module destroys (graceful shutdown)
   */
  async onModuleDestroy() {
    if (this.dataSource.isInitialized) {
      await this.dataSource.destroy();
      console.log('Database connection closed');
    }
  }

  /**
   * Check database connection
   */
  async checkConnection(): Promise<boolean> {
    try {
      if (!this.dataSource.isInitialized) {
        return false;
      }

      // Simple query to test connection
      await this.dataSource.query('SELECT 1');
      return true;
    } catch (error) {
      console.error('Database connection check failed:', error);
      return false;
    }
  }

  /**
   * Get database connection info
   */
  getConnectionInfo() {
    return {
      isConnected: this.dataSource.isInitialized,
      database: this.dataSource.options.database,
      type: this.dataSource.options.type,
    };
  }

  /**
   * Execute raw query (if needed)
   */
  async query<T = unknown>(sql: string, parameters?: unknown[]): Promise<T> {
    return this.dataSource.query(sql, parameters);
  }
}
