import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import {
  AnalyticsGranularity,
  AnalyticsPeriod,
  ReportStatus,
  ScoutVerificationStatus,
  UserRole,
  UserStatus,
} from '@/common/enums';
import { Connection, Event, Post } from '@/database/entities';
import {
  PlayerProfileRepository,
  ReportRepository,
  ScoutProfileRepository,
  UserRepository,
} from '@/database/repositories';

/**
 * Computes platform-level analytics from the database.
 * All queries are read-only.
 */
@Injectable()
export class AdminAnalyticsService {
  private readonly userRepository: UserRepository;
  private readonly playerProfileRepository: PlayerProfileRepository;
  private readonly scoutProfileRepository: ScoutProfileRepository;
  private readonly reportRepository: ReportRepository;
  private readonly postRepository: Repository<Post>;
  private readonly eventRepository: Repository<Event>;
  private readonly connectionRepository: Repository<Connection>;

  constructor(
    userRepository: UserRepository,
    playerProfileRepository: PlayerProfileRepository,
    scoutProfileRepository: ScoutProfileRepository,
    reportRepository: ReportRepository,
    @InjectRepository(Post)
    postRepository: Repository<Post>,
    @InjectRepository(Event)
    eventRepository: Repository<Event>,
    @InjectRepository(Connection)
    connectionRepository: Repository<Connection>,
  ) {
    this.userRepository = userRepository;
    this.playerProfileRepository = playerProfileRepository;
    this.scoutProfileRepository = scoutProfileRepository;
    this.reportRepository = reportRepository;
    this.postRepository = postRepository;
    this.eventRepository = eventRepository;
    this.connectionRepository = connectionRepository;
  }

  /**
   * Get overall platform metrics for dashboard overview.
   * GET (/api/admin/analytics/overview)
   */
  async getOverview(): Promise<{
    totalUsers: number;
    totalPlayers: number;
    totalScouts: number;
    totalAdmins: number;
    activeUsers: number;
    bannedUsers: number;
    suspendedUsers: number;
    verifiedPlayers: number;
    verifiedScouts: number;
    pendingScoutVerifications: number;
    totalPosts: number;
    totalEvents: number;
    totalConnections: number;
    pendingReports: number;
    totalReports: number;
  }> {
    const [
      totalUsers,
      totalPlayers,
      totalScouts,
      totalAdmins,
      activeUsers,
      bannedUsers,
      suspendedUsers,
      totalPosts,
      totalEvents,
      totalConnections,
      pendingReports,
      totalReports,
    ] = await Promise.all([
      this.userRepository.countByRole(),
      this.userRepository.countByRole(UserRole.PLAYER),
      this.userRepository.countByRole(UserRole.SCOUT),
      this.userRepository.countByRole(UserRole.ADMIN),
      this.userRepository.countByStatus(UserStatus.ACTIVE),
      this.userRepository.countByStatus(UserStatus.BANNED),
      this.userRepository.countByStatus(UserStatus.SUSPENDED),
      this.postRepository.count(),
      this.eventRepository.count(),
      this.connectionRepository.count({ where: { status: 'accepted' } }),
      this.reportRepository.countByStatus(ReportStatus.PENDING),
      this.reportRepository.countCreatedSince(new Date(0)),
    ]);

    // Verified counts
    const [verifiedPlayers, verifiedScouts, pendingScoutVerifications] =
      await Promise.all([
        this.playerProfileRepository
          .find({ where: { isVerified: true } })
          .then(r => r.length),
        this.scoutProfileRepository.countByVerificationStatus(
          ScoutVerificationStatus.VERIFIED,
        ),
        this.scoutProfileRepository.countByVerificationStatus(
          ScoutVerificationStatus.PENDING,
        ),
      ]);

    return {
      totalUsers,
      totalPlayers,
      totalScouts,
      totalAdmins,
      activeUsers,
      bannedUsers,
      suspendedUsers,
      verifiedPlayers,
      verifiedScouts,
      pendingScoutVerifications,
      totalPosts,
      totalEvents,
      totalConnections,
      pendingReports,
      totalReports,
    };
  }

  /**
   * Get engagement metrics for a given period (7d, 30d, 90d, 1y).
   * GET (/api/admin/analytics/engagement)
   */
  async getEngagement(period: AnalyticsPeriod): Promise<{
    period: string;
    activeUsers: number;
    newPosts: number;
    newEvents: number;
    newConnections: number;
    newReports: number;
    averagePostEngagement: number;
  }> {
    const since = this.periodToDate(period);

    const [activeUsers, newPosts, newEvents, newConnections, newReports] =
      await Promise.all([
        this.userRepository.countActiveSince(since),
        this.postRepository
          .createQueryBuilder('post')
          .where('post.created_at >= :since', { since })
          .getCount(),
        this.eventRepository
          .createQueryBuilder('event')
          .where('event.created_at >= :since', { since })
          .getCount(),
        this.connectionRepository
          .createQueryBuilder('conn')
          .where('conn.requested_at >= :since', { since })
          .andWhere('conn.status = :status', { status: 'accepted' })
          .getCount(),
        this.reportRepository.countCreatedSince(since),
      ]);

    // Avg engagement: average (likes + comments + views) per post in period
    const avgResult = await this.postRepository
      .createQueryBuilder('post')
      .select(
        'COALESCE(AVG(post.likes_count + post.comments_count + post.views_count), 0)',
        'avg',
      )
      .where('post.created_at >= :since', { since })
      .getRawOne<{ avg: string }>();

    const averagePostEngagement = parseFloat(avgResult?.avg ?? '0');

    return {
      period,
      activeUsers,
      newPosts,
      newEvents,
      newConnections,
      newReports,
      averagePostEngagement: Math.round(averagePostEngagement * 100) / 100,
    };
  }

  /**
   * Get growth metrics (new users, posts) over time for a given period and granularity.
   * GET (/api/admin/analytics/growth)
   */
  async getGrowth(
    period: AnalyticsPeriod,
    granularity: AnalyticsGranularity = AnalyticsGranularity.DAY,
  ): Promise<{
    period: string;
    granularity: string;
    roleDistribution: { role: string; count: number }[];
    userGrowth: { period: string; count: number }[];
    postGrowth: { period: string; count: number }[];
  }> {
    const since = this.periodToDate(period);

    const [roleDistribution, userGrowth] = await Promise.all([
      this.userRepository.getRoleDistribution(),
      this.userRepository.getGrowthTimeSeries(since, granularity),
    ]);

    // Post growth time series — granularity enum values ('day'|'week'|'month') are valid DATE_TRUNC units
    const postGrowthRaw = await this.postRepository
      .createQueryBuilder('post')
      .select(`DATE_TRUNC('${granularity}', post.created_at)`, 'period')
      .addSelect('COUNT(*)', 'count')
      .where('post.created_at >= :since', { since })
      .groupBy('period')
      .orderBy('period', 'ASC')
      .getRawMany<{ period: string; count: string }>();

    const postGrowth = postGrowthRaw.map(r => ({
      period: r.period,
      count: parseInt(r.count, 10),
    }));

    return {
      period,
      granularity,
      roleDistribution,
      userGrowth,
      postGrowth,
    };
  }

  private periodToDate(period: AnalyticsPeriod): Date {
    const now = new Date();
    switch (period) {
      case AnalyticsPeriod.SEVEN_DAYS:
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case AnalyticsPeriod.THIRTY_DAYS:
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      case AnalyticsPeriod.NINETY_DAYS:
        return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      case AnalyticsPeriod.ONE_YEAR:
        return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    }
  }
}
