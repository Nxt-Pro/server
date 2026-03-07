import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  FindOptionsWhere,
  QueryDeepPartialEntity,
  Repository,
  UpdateResult,
} from 'typeorm';

import { BaseRepository } from './base.repository';

import { ScoutVerificationStatus } from '@/common/enums';
import { ScoutProfile } from '@/database/entities';

@Injectable()
export class ScoutProfileRepository extends BaseRepository<ScoutProfile> {
  constructor(
    @InjectRepository(ScoutProfile)
    repository: Repository<ScoutProfile>,
  ) {
    super(repository);
  }

  async findByUserId(userId: string): Promise<ScoutProfile | null> {
    return this.repository.findOne({
      where: { userId },
    });
  }

  async updateByUserId(
    userId: string,
    data: QueryDeepPartialEntity<ScoutProfile>,
  ): Promise<UpdateResult> {
    return this.repository.update(
      { userId } as FindOptionsWhere<ScoutProfile>,
      data,
    );
  }

  async countByVerificationStatus(
    status: ScoutVerificationStatus,
  ): Promise<number> {
    return this.repository.count({ where: { verificationStatus: status } });
  }
}
