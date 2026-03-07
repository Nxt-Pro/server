import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { BaseRepository } from './base.repository';

import { ReportStatus } from '@/common/enums';
import { Report } from '@/database/entities';

@Injectable()
export class ReportRepository extends BaseRepository<Report> {
  constructor(
    @InjectRepository(Report)
    repository: Repository<Report>,
  ) {
    super(repository);
  }

  async findWithReporter(id: string): Promise<Report | null> {
    return this.repository.findOne({
      where: { id },
      relations: ['reporter', 'resolvedBy'],
    });
  }

  async countByStatus(status: ReportStatus): Promise<number> {
    return this.repository.count({ where: { status } });
  }

  async countCreatedSince(since: Date): Promise<number> {
    return this.repository
      .createQueryBuilder('report')
      .where('report.created_at >= :since', { since })
      .getCount();
  }
}
