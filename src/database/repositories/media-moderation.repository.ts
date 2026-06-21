import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryDeepPartialEntity, Repository, UpdateResult } from 'typeorm';

import { BaseRepository } from './base.repository';

import { MediaModeration } from '@/database/entities';

@Injectable()
export class MediaModerationRepository extends BaseRepository<MediaModeration> {
  constructor(
    @InjectRepository(MediaModeration)
    repository: Repository<MediaModeration>,
  ) {
    super(repository);
  }

  async findByAttachmentId(
    attachmentId: string,
  ): Promise<MediaModeration | null> {
    return this.repository.findOne({
      where: { attachmentId },
    });
  }

  async updateByAttachmentId(
    attachmentId: string,
    data: QueryDeepPartialEntity<MediaModeration>,
  ): Promise<UpdateResult> {
    return this.repository.update({ attachmentId }, data);
  }
}
