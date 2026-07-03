import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { FindOptionsOrder, FindOptionsWhere } from 'typeorm';

import { ReportSeverity, ReportStatus, ReportType } from '@/common/enums';
import { Report, User } from '@/database/entities';
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
    private readonly eventEmitter: EventEmitter2,
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
        resolvedBy: { id: adminId },
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

    const updatedReport =
      (await this.reportRepository.findWithReporter(reportId))!;
    this.notifyReportStatusChanged(updatedReport, adminId, data.status);

    return updatedReport;
  }

  private notifyReportStatusChanged(
    report: Report,
    adminId: string,
    status: 'resolved' | 'dismissed',
  ): void {
    const reporter = report.reporter;

    if (!reporter?.id || reporter.id === adminId) {
      return;
    }

    this.eventEmitter.emit('notification.create', {
      userId: reporter.id,
      actorId: adminId,
      title: status === 'resolved' ? 'Report resolved' : 'Report dismissed',
      message: `Your report "${report.title}" was ${status}.`,
      type: 'report_status',
      referenceId: report.id,
      referenceType: 'report',
      preference: 'verificationUpdates',
      dedupeKey: `report_status:${report.id}:${status}`,
      data: {
        reportId: report.id,
        status,
      },
      email: reporter.email
        ? {
            to: reporter.email,
            subject:
              status === 'resolved'
                ? 'Your NxtPro report was resolved'
                : 'Your NxtPro report was dismissed',
            message: `Your report "${report.title}" was ${status}.`,
          }
        : undefined,
    });
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
    this.notifyAccountStatusChanged(user, adminId, 'banned', reason);

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
    this.notifyAccountStatusChanged(user, adminId, 'active');

    return { message: `User ${userId} has been unbanned` };
  }

  private notifyAccountStatusChanged(
    user: User,
    adminId: string,
    status: User['status'],
    reason?: string,
  ): void {
    this.eventEmitter.emit('notification.create', {
      userId: user.id,
      actorId: adminId,
      title: 'Account status updated',
      message: `Your NxtPro account status is now ${status}.${reason ? ` ${reason}` : ''}`,
      type: 'admin_action',
      referenceId: user.id,
      referenceType: 'profile',
      preference: 'verificationUpdates',
      dedupeKey: `account_status:${user.id}:${status}`,
      data: {
        status,
      },
      email: user.email
        ? {
            to: user.email,
            subject: 'Your NxtPro account status changed',
            message: `Your NxtPro account status is now "${status}".${reason ? ` ${reason}` : ''}`,
          }
        : undefined,
    });
  }
}
