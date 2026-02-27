import { Injectable } from '@nestjs/common';
import { FindOptionsOrder, FindOptionsWhere } from 'typeorm';

import { AuditLogAction, SortOrder } from '@/common/enums';
import { AuditLog } from '@/database/entities';
import { AuditLogRepository } from '@/database/repositories';
import { IPaginate } from '@/database/repositories/base.repository';

@Injectable()
export class AdminAuditService {
  private readonly auditLogRepository: AuditLogRepository;

  constructor(auditLogRepository: AuditLogRepository) {
    this.auditLogRepository = auditLogRepository;
  }

  /**
   * Paginated, filterable audit log.
   * GET (/api/admin/audit-log)
   */
  async getAuditLog(params: {
    action?: AuditLogAction;
    entityType?: string;
    entityId?: string;
    actorId?: string;
    page?: number;
    limit?: number;
    sortOrder?: SortOrder;
  }): Promise<IPaginate<AuditLog>> {
    const where: FindOptionsWhere<AuditLog> = {};

    if (params.action) where.action = params.action;
    if (params.entityType) where.entityType = params.entityType;
    if (params.entityId) where.entityId = params.entityId;
    if (params.actorId) where.actor = { id: params.actorId };

    const order: FindOptionsOrder<AuditLog> = {
      createdAt: params.sortOrder ?? SortOrder.DESC,
    };

    return this.auditLogRepository.paginate({
      filter: where,
      order,
      page: params.page,
      limit: params.limit,
    });
  }
}
