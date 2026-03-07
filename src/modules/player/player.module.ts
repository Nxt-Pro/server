import { Module } from '@nestjs/common';

import { PlayerController } from './player.controller';
import { PlayerService } from './player.service';

import { RepositoriesModule } from '@/database/repositories.module';

@Module({
  imports: [RepositoriesModule],
  controllers: [PlayerController],
  providers: [PlayerService],
  exports: [PlayerService],
})
export class PlayerModule {}
