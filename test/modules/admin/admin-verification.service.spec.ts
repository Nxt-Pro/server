import {
  AuditLogRepository,
  PlayerProfileRepository,
  ScoutProfileRepository,
  UserRepository,
} from '@/database/repositories';
import { AdminVerificationService } from '@/modules/admin/services/admin-verification.service';

describe('AdminVerificationService notifications', () => {
  let playerProfileRepository: {
    findByUserId: jest.Mock;
    updateByUserId: jest.Mock;
  };
  let scoutProfileRepository: {
    findByUserId: jest.Mock;
    updateByUserId: jest.Mock;
  };
  let auditLogRepository: { log: jest.Mock };
  let userRepository: { findByIdWithProfiles: jest.Mock };
  let eventEmitter: { emit: jest.Mock };
  let service: AdminVerificationService;

  beforeEach(() => {
    playerProfileRepository = {
      findByUserId: jest.fn(),
      updateByUserId: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    scoutProfileRepository = {
      findByUserId: jest.fn(),
      updateByUserId: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    auditLogRepository = { log: jest.fn().mockResolvedValue({}) };
    userRepository = {
      findByIdWithProfiles: jest.fn().mockResolvedValue({
        id: 'user_1',
        email: 'user@nxtpro.dev',
      }),
    };
    eventEmitter = { emit: jest.fn() };

    service = new AdminVerificationService(
      playerProfileRepository as unknown as PlayerProfileRepository,
      scoutProfileRepository as unknown as ScoutProfileRepository,
      auditLogRepository as unknown as AuditLogRepository,
      userRepository as unknown as UserRepository,
      eventEmitter as never,
    );
  });

  it('emits central delivery intent when verification is approved', async () => {
    playerProfileRepository.findByUserId
      .mockResolvedValueOnce({ userId: 'user_1', isVerified: false })
      .mockResolvedValueOnce({ userId: 'user_1', isVerified: true });

    await service.verifyPlayer('user_1', 'admin_1', 'Looks good');

    expect(eventEmitter.emit).toHaveBeenCalledWith(
      'notification.create',
      expect.objectContaining({
        userId: 'user_1',
        actorId: 'admin_1',
        title: 'Verification approved',
        message: 'Your NxtPro profile has been verified.',
        type: 'verification_status',
        referenceId: 'user_1',
        referenceType: 'profile',
        preference: 'verificationUpdates',
        dedupeKey: 'verification_status:user_1:verified',
        email: {
          to: 'user@nxtpro.dev',
          subject: 'Your NxtPro profile was verified',
          message: 'Your NxtPro profile has been verified.',
        },
      }),
    );
  });

  it('emits central delivery intent when verification is rejected', async () => {
    scoutProfileRepository.findByUserId
      .mockResolvedValueOnce({
        userId: 'user_1',
        verificationStatus: 'pending',
      })
      .mockResolvedValueOnce({
        userId: 'user_1',
        verificationStatus: 'rejected',
      });

    await service.verifyScout('user_1', 'admin_1', {
      status: 'rejected',
      notes: 'Missing license document',
    });

    expect(eventEmitter.emit).toHaveBeenCalledWith(
      'notification.create',
      expect.objectContaining({
        userId: 'user_1',
        actorId: 'admin_1',
        title: 'Verification rejected',
        message:
          'Your NxtPro verification was rejected. Missing license document',
        type: 'verification_status',
        referenceId: 'user_1',
        referenceType: 'profile',
        preference: 'verificationUpdates',
        dedupeKey: 'verification_status:user_1:rejected',
        email: {
          to: 'user@nxtpro.dev',
          subject: 'Your NxtPro verification was rejected',
          message:
            'Your NxtPro verification was rejected. Missing license document',
        },
      }),
    );
  });
});
