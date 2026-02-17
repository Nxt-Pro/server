import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryDeepPartialEntity, Repository } from 'typeorm';

import { BaseRepository } from './base.repository';

import { VideoSkillAnalysis } from '@/database/entities';

@Injectable()
export class VideoSkillAnalysisRepository extends BaseRepository<VideoSkillAnalysis> {
  constructor(
    @InjectRepository(VideoSkillAnalysis)
    repository: Repository<VideoSkillAnalysis>,
  ) {
    super(repository);
  }

  async findByVideoId(
    videoId: string,
    status?: VideoSkillAnalysis['status'],
  ): Promise<VideoSkillAnalysis | null> {
    return this.repository.findOne({
      where: status ? { videoId, status } : { videoId },
    });
  }

  async upsert(
    data: QueryDeepPartialEntity<VideoSkillAnalysis>,
    conflictPaths: string[],
  ): Promise<void> {
    await this.repository.upsert(data, conflictPaths);
  }
}
