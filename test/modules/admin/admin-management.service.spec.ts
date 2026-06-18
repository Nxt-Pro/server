import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import 'reflect-metadata';

import { AdminManagementService } from '@/modules/admin/services/admin-management.service';

describe('AdminManagementService', () => {
  let service: AdminManagementService;
  let userRepository: {
    find: jest.Mock;
    findOne: jest.Mock;
    findById: jest.Mock;
    create: jest.Mock;
    updateOne: jest.Mock;
  };
  let auditLogRepository: { log: jest.Mock };

  const admin = {
    id: 'admin_1',
    email: 'admin@nxtpro.dev',
    role: 'admin' as const,
    status: 'active' as const,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  };

  beforeEach(() => {
    userRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      updateOne: jest.fn(),
    };
    auditLogRepository = { log: jest.fn() };

    service = new AdminManagementService(
      userRepository as never,
      auditLogRepository as never,
    );
  });

  it('lists only admin accounts safely', async () => {
    userRepository.find.mockResolvedValue([admin]);

    await expect(service.listAdmins()).resolves.toEqual([
      expect.objectContaining({
        id: admin.id,
        email: admin.email,
        role: 'admin',
        name: admin.email,
      }),
    ]);

    expect(userRepository.find).toHaveBeenCalledWith({
      where: { role: 'admin' },
      order: { createdAt: 'ASC' },
    });
  });

  it('creates admin accounts with audit logging', async () => {
    const created = { ...admin, id: 'admin_2', email: 'new@nxtpro.dev' };
    userRepository.findOne.mockResolvedValue(null);
    userRepository.create.mockResolvedValue(created);
    auditLogRepository.log.mockResolvedValue({});

    const result = await service.createAdmin('actor_1', {
      email: 'NEW@NXTPRO.DEV',
      password: 'password123',
    });

    expect(result.email).toBe('new@nxtpro.dev');
    const createCalls = userRepository.create.mock.calls as Array<
      [
        {
          email: string;
          role: string;
          status: string;
          passwordHash: string;
        },
      ]
    >;
    const createArg = createCalls[0][0];
    expect(createArg.email).toBe('new@nxtpro.dev');
    expect(createArg.role).toBe('admin');
    expect(createArg.status).toBe('active');
    expect(typeof createArg.passwordHash).toBe('string');
    expect(auditLogRepository.log).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: 'actor_1',
        action: 'user_created',
        entityType: 'user',
        entityId: created.id,
      }),
    );
  });

  it('rejects duplicate admin emails on create', async () => {
    userRepository.findOne.mockResolvedValue(admin);

    await expect(
      service.createAdmin('actor_1', {
        email: admin.email,
        password: 'password123',
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('updates email and password without exposing the password hash', async () => {
    const updated = {
      ...admin,
      email: 'updated@nxtpro.dev',
      updatedAt: new Date('2026-01-02T00:00:00.000Z'),
    };
    userRepository.findById
      .mockResolvedValueOnce(admin)
      .mockResolvedValueOnce(updated);
    userRepository.findOne.mockResolvedValue(null);
    userRepository.updateOne.mockResolvedValue({ affected: 1 });
    auditLogRepository.log.mockResolvedValue({});

    const result = await service.updateAdmin('actor_1', admin.id, {
      email: 'updated@nxtpro.dev',
      password: 'newpassword123',
    });

    expect(result).not.toHaveProperty('passwordHash');
    const updateCalls = userRepository.updateOne.mock.calls as Array<
      [{ id: string }, { email: string; passwordHash: string }]
    >;
    const updateCall = updateCalls[0];
    expect(updateCall[0]).toEqual({ id: admin.id });
    expect(updateCall[1].email).toBe('updated@nxtpro.dev');
    expect(typeof updateCall[1].passwordHash).toBe('string');
    const auditCalls = auditLogRepository.log.mock.calls as Array<
      [
        {
          action: string;
          metadata: {
            changedFields: string[];
            passwordChanged: boolean;
          };
        },
      ]
    >;
    expect(auditCalls[0][0].action).toBe('user_updated');
    expect(auditCalls[0][0].metadata.changedFields).toEqual([
      'email',
      'password',
    ]);
    expect(auditCalls[0][0].metadata.passwordChanged).toBe(true);
  });

  it('prevents admins from disabling themselves', async () => {
    userRepository.findById.mockResolvedValue(admin);

    await expect(
      service.updateAdmin(admin.id, admin.id, { status: 'suspended' }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects non-admin targets', async () => {
    userRepository.findById.mockResolvedValue({ ...admin, role: 'player' });

    await expect(
      service.updateAdmin('actor_1', admin.id, { status: 'suspended' }),
    ).rejects.toThrow(NotFoundException);
  });
});
