import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';

import { UserRole, UserStatus } from '@/common/enums';
import { User } from '@/database/entities';
import { AuditLogRepository, UserRepository } from '@/database/repositories';

const SALT_ROUNDS = 10;

export interface AdminAccountResponse {
  id: string;
  email: string;
  username?: string | null;
  role: User['role'];
  status: User['status'];
  name: string;
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class AdminManagementService {
  private readonly userRepository: UserRepository;
  private readonly auditLogRepository: AuditLogRepository;

  constructor(
    userRepository: UserRepository,
    auditLogRepository: AuditLogRepository,
  ) {
    this.userRepository = userRepository;
    this.auditLogRepository = auditLogRepository;
  }

  async listAdmins(): Promise<AdminAccountResponse[]> {
    const admins = await this.userRepository.find({
      where: { role: UserRole.ADMIN },
      order: { createdAt: 'ASC' },
    });

    return admins.map(admin => this.toResponse(admin));
  }

  async createAdmin(
    actorId: string,
    data: { email: string; password: string; username?: string },
  ): Promise<AdminAccountResponse> {
    const email = data.email.trim().toLowerCase();
    const username = this.normalizeUsername(data.username);
    const existing = await this.userRepository.findOne({ where: { email } });

    if (existing) {
      throw new ConflictException('Email already registered');
    }

    if (username) {
      const existingUsername = await this.userRepository.findOne({
        where: { username },
      });

      if (existingUsername) {
        throw new ConflictException('Username already registered');
      }
    }

    const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);
    const admin = await this.userRepository.create({
      email,
      username,
      passwordHash,
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
    });

    await this.auditLogRepository.log({
      actorId,
      action: 'user_created',
      entityType: 'user',
      entityId: admin.id,
      description: 'Admin account created',
      newStatus: admin.status,
      metadata: {
        role: admin.role,
        email: admin.email,
        username: admin.username,
      },
    });

    return this.toResponse(admin);
  }

  async updateAdmin(
    actorId: string,
    adminId: string,
    data: {
      email?: string;
      username?: string;
      password?: string;
      status?: UserStatus;
    },
  ): Promise<AdminAccountResponse> {
    const admin = await this.userRepository.findById(adminId);

    if (!admin || admin.role !== 'admin') {
      throw new NotFoundException(`Admin ${adminId} not found`);
    }

    const previousEmail = admin.email;
    const previousUsername = admin.username;
    const previousStatus = admin.status;
    const updates: QueryDeepPartialEntity<User> = {};
    const changedFields: string[] = [];

    if (data.email !== undefined) {
      const email = data.email.trim().toLowerCase();

      if (!email) {
        throw new BadRequestException('Email is required');
      }

      if (email !== admin.email) {
        const existing = await this.userRepository.findOne({
          where: { email },
        });

        if (existing && existing.id !== admin.id) {
          throw new ConflictException('Email already registered');
        }

        updates.email = email;
        changedFields.push('email');
      }
    }

    if (data.username !== undefined) {
      const username = this.normalizeUsername(data.username);

      if (!username) {
        throw new BadRequestException('Username is required');
      }

      if (username !== admin.username) {
        const existing = await this.userRepository.findOne({
          where: { username },
        });

        if (existing && existing.id !== admin.id) {
          throw new ConflictException('Username already registered');
        }

        updates.username = username;
        changedFields.push('username');
      }
    }

    if (data.password !== undefined) {
      updates.passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);
      changedFields.push('password');
    }

    const requestedStatus = data.status as string | undefined;
    const currentStatus = admin.status as string;

    if (requestedStatus !== undefined && requestedStatus !== currentStatus) {
      if (admin.id === actorId && requestedStatus !== 'active') {
        throw new BadRequestException(
          'Admins cannot disable their own account',
        );
      }

      updates.status = data.status;
      changedFields.push('status');
    }

    if (changedFields.length === 0) {
      return this.toResponse(admin);
    }

    await this.userRepository.updateOne({ id: admin.id }, updates);

    await this.auditLogRepository.log({
      actorId,
      action:
        updates.status !== undefined ? 'user_status_changed' : 'user_updated',
      entityType: 'user',
      entityId: admin.id,
      description: 'Admin account updated',
      oldStatus: previousStatus,
      newStatus: data.status ?? previousStatus,
      metadata: {
        role: admin.role,
        changedFields,
        previousEmail: updates.email !== undefined ? previousEmail : undefined,
        newEmail: updates.email,
        previousUsername:
          updates.username !== undefined ? previousUsername : undefined,
        newUsername: updates.username,
        passwordChanged: data.password !== undefined,
      },
    });

    const updated = await this.userRepository.findById(admin.id);
    return this.toResponse(updated!);
  }

  private toResponse(admin: User): AdminAccountResponse {
    return {
      id: admin.id,
      email: admin.email,
      username: admin.username,
      role: admin.role,
      status: admin.status,
      name: admin.username ?? admin.email,
      createdAt: admin.createdAt.toISOString(),
      updatedAt: admin.updatedAt.toISOString(),
    };
  }

  private normalizeUsername(username?: string): string | undefined {
    const normalized = username?.trim().toLowerCase();
    return normalized || undefined;
  }
}
