import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { BaseRepository } from './base.repository';

import { Video } from '@/database/entities';

@Injectable()
export class VideoRepository extends BaseRepository<Video> {
  constructor(
    @InjectRepository(Video)
    repository: Repository<Video>,
  ) {
    super(repository);
  }
}
