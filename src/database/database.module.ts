import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatabaseService } from './database.service';
import { typeOrmConfig } from '@/config';

@Global()
@Module({
  imports: [TypeOrmModule.forRootAsync(typeOrmConfig)],
  providers: [DatabaseService],
  exports: [DatabaseService],
})
export class DatabaseModule {}
