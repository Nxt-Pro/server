import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { FindOptionsOrder, FindOptionsWhere } from 'typeorm';

import { ReportSeverity, ReportStatus, ReportType } from '@/common/enums';
import { Report } from '@/database/entities';
import {
  AuditLogRepository,
  ReportRepository,
  UserRepository,
} from '@/database/repositories';
import { IPaginate } from '@/database/repositories/base.repository';

@Injectable()
export class AdminModerationService {
  private readonly logger = new Logger(AdminModerationService.name);

  private readonly reportRepository: ReportRepository;
  private readonly userRepository: UserRepository;
  private readonly auditLogRepository: AuditLogRepository;

  constructor(
    reportRepository: ReportRepository,
    userRepository: UserRepository,
    auditLogRepository: AuditLogRepository,
  ) {
    this.reportRepository = reportRepository;
    this.userRepository = userRepository;
    this.auditLogRepository = auditLogRepository;
  }

  /**
   * List reports with filtering, pagination, and sorting.
   * GET (/api/admin/reports)
   */
  async getReports(params: {
    status?: ReportStatus;
    severity?: ReportSeverity;
    type?: ReportType;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
  }): Promise<IPaginate<Report>> {
    const where: FindOptionsWhere<Report> = {};

    if (params.status) where.status = params.status;
    if (params.severity) where.severity = params.severity;
    if (params.type) where.type = params.type;

    const order: FindOptionsOrder<Report> = {};
    const sortBy = (params.sortBy ?? 'createdAt') as keyof Report;
    order[sortBy] = params.sortOrder ?? 'DESC';

    return this.reportRepository.paginate({
      filter: where,
      order,
      page: params.page,
      limit: params.limit,
    });
  }

  /**
   * Resolve or dismiss a report.
   * PATCH (/api/admin/report/:id/resolve)
   */
  async resolveReport(
    reportId: string,
    adminId: string,
    data: { status: 'resolved' | 'dismissed'; resolutionNotes?: string },
  ): Promise<Report> {
    const report = await this.reportRepository.findWithReporter(reportId);

    if (!report) {
      throw new NotFoundException(`Report ${reportId} not found`);
    }

    if (report.status === 'resolved' || report.status === 'dismissed') {
      throw new BadRequestException(`Report is already ${report.status}`);
    }

    const oldStatus = report.status;

    await this.reportRepository.updateOne(
      { id: reportId },
      {
        status: data.status,
        resolutionNotes: data.resolutionNotes ?? undefined,
        resolvedBy: { id: adminId } as Pick<Report['resolvedBy'], 'id'>,
        resolvedAt: new Date(),
      },
    );

    // Audit log
    await this.auditLogRepository.log({
      actorId: adminId,
      action:
        data.status === 'resolved' ? 'report_resolved' : 'report_dismissed',
      entityType: 'report',
      entityId: reportId,
      description: `Report ${data.status} by admin`,
      oldStatus,
      newStatus: data.status,
      metadata: { resolutionNotes: data.resolutionNotes },
    });

    this.logger.log(`Report ${reportId} ${data.status} by admin ${adminId}`);

    return (await this.reportRepository.findWithReporter(reportId))!;
  }

  /**
   * Ban a user.
   * (POST /api/admin/ban/:user_id)
   */
  async banUser(
    userId: string,
    adminId: string,
    reason?: string,
  ): Promise<{ message: string }> {
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    if (user.status === 'banned') {
      throw new BadRequestException('User is already banned');
    }

    if (user.role === 'admin') {
      throw new BadRequestException('Cannot ban an admin user');
    }

    const oldStatus = user.status;

    await this.userRepository.updateOne({ id: userId }, { status: 'banned' });

    await this.auditLogRepository.log({
      actorId: adminId,
      action: 'user_banned',
      entityType: 'user',
      entityId: userId,
      description: reason ?? 'User banned by admin',
      oldStatus,
      newStatus: 'banned',
      metadata: { reason },
    });

    this.logger.log(`User ${userId} banned by admin ${adminId}`);

    return { message: `User ${userId} has been banned` };
  }

  /**
   * Unban a user (restore to active status).
   * POST (/api/admin/unban/:user_id)
   */
  async unbanUser(
    userId: string,
    adminId: string,
  ): Promise<{ message: string }> {
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    if (user.status !== 'banned') {
      throw new BadRequestException('User is not banned');
    }

    await this.userRepository.updateOne({ id: userId }, { status: 'active' });

    await this.auditLogRepository.log({
      actorId: adminId,
      action: 'user_status_changed',
      entityType: 'user',
      entityId: userId,
      description: 'User unbanned by admin',
      oldStatus: 'banned',
      newStatus: 'active',
    });

    this.logger.log(`User ${userId} unbanned by admin ${adminId}`);

    return { message: `User ${userId} has been unbanned` };
  }
}
