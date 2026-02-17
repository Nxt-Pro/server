import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { BaseRepository } from './base.repository';

import { Attachment } from '@/database/entities';

@Injectable()
export class AttachmentRepository extends BaseRepository<Attachment> {
  constructor(
    @InjectRepository(Attachment)
    repository: Repository<Attachment>,
  ) {
    super(repository);
  }
}
