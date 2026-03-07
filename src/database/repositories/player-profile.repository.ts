import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  FindOptionsWhere,
  QueryDeepPartialEntity,
  Repository,
  UpdateResult,
} from 'typeorm';

import { BaseRepository } from './base.repository';

import { PlayerProfile } from '@/database/entities';

@Injectable()
export class PlayerProfileRepository extends BaseRepository<PlayerProfile> {
  constructor(
    @InjectRepository(PlayerProfile)
    repository: Repository<PlayerProfile>,
  ) {
    super(repository);
  }

  async findByUserId(userId: string): Promise<PlayerProfile | null> {
    return this.repository.findOne({
      where: { userId },
    });
  }

  async updateByUserId(
    userId: string,
    data: QueryDeepPartialEntity<PlayerProfile>,
  ): Promise<UpdateResult> {
    return this.repository.update(
      { userId } as FindOptionsWhere<PlayerProfile>,
      data,
    );
  }
}
