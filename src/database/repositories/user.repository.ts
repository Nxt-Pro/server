import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { BaseRepository } from './base.repository';

import { AnalyticsGranularity, UserRole, UserStatus } from '@/common/enums';
import { User } from '@/database/entities';

@Injectable()
export class UserRepository extends BaseRepository<User> {
  constructor(
    @InjectRepository(User)
    repository: Repository<User>,
  ) {
    super(repository);
  }

  async findByIdWithProfiles(id: string): Promise<User | null> {
    return this.repository.findOne({
      where: { id },
      relations: ['playerProfile', 'scoutProfile'],
    });
  }

  async countByRole(role?: UserRole): Promise<number> {
    return this.repository.count({
      where: role ? { role } : undefined,
    });
  }

  async countByStatus(status: UserStatus): Promise<number> {
    return this.repository.count({ where: { status } });
  }

  /**
   * Count users created since a given date, optionally filtered by role
   */
  async countCreatedSince(since: Date): Promise<number> {
    return this.repository
      .createQueryBuilder('user')
      .where('user.created_at >= :since', { since })
      .getCount();
  }

  /**
   * Count users active since a given date (based on last_active field)
   */
  async countActiveSince(since: Date): Promise<number> {
    return this.repository
      .createQueryBuilder('user')
      .where('user.last_active >= :since', { since })
      .getCount();
  }

  /**
   * Get user growth grouped by day/week/month
   */
  async getGrowthTimeSeries(
    since: Date,
    granularity: AnalyticsGranularity = AnalyticsGranularity.DAY,
  ): Promise<{ period: string; count: number }[]> {
    const result = await this.repository
      .createQueryBuilder('user')
      .select(`DATE_TRUNC('${granularity}', user.created_at)`, 'period')
      .addSelect('COUNT(*)', 'count')
      .where('user.created_at >= :since', { since })
      .groupBy('period')
      .orderBy('period', 'ASC')
      .getRawMany<{ period: string; count: string }>();

    return result.map(r => ({
      period: r.period,
      count: parseInt(r.count, 10),
    }));
  }

  /**
   * Get role distribution
   */
  async getRoleDistribution(): Promise<{ role: string; count: number }[]> {
    const result = await this.repository
      .createQueryBuilder('user')
      .select('user.role', 'role')
      .addSelect('COUNT(*)', 'count')
      .groupBy('user.role')
      .getRawMany<{ role: string; count: string }>();

    return result.map(r => ({ role: r.role, count: parseInt(r.count, 10) }));
  }
}
