import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { BaseRepository } from './base.repository';

import { AuditLog } from '@/database/entities';

@Injectable()
export class AuditLogRepository extends BaseRepository<AuditLog> {
  constructor(
    @InjectRepository(AuditLog)
    repository: Repository<AuditLog>,
  ) {
    super(repository);
  }

  async findWithActor(id: string): Promise<AuditLog | null> {
    return this.repository.findOne({
      where: { id },
      relations: ['actor'],
    });
  }

  /**
   * Create an audit log entry with all context
   */
  async log(params: {
    actorId?: string;
    action: AuditLog['action'];
    entityType: string;
    entityId: string;
    description?: string;
    oldStatus?: string;
    newStatus?: string;
    metadata?: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<AuditLog> {
    const entry = this.repository.create({
      actor: params.actorId
        ? ({ id: params.actorId } as Pick<AuditLog['actor'], 'id'>)
        : undefined,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      description: params.description,
      oldStatus: params.oldStatus,
      newStatus: params.newStatus,
      metadata: params.metadata,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    });

    return this.repository.save(entry);
  }
}
