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
  let mailService: { sendVerificationStatusEmail: jest.Mock };
  let notificationPreferencesService: { allowsEmailNotification: jest.Mock };
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
    mailService = {
      sendVerificationStatusEmail: jest.fn().mockResolvedValue(undefined),
    };
    notificationPreferencesService = {
      allowsEmailNotification: jest.fn().mockResolvedValue(true),
    };

    service = new AdminVerificationService(
      playerProfileRepository as unknown as PlayerProfileRepository,
      scoutProfileRepository as unknown as ScoutProfileRepository,
      auditLogRepository as unknown as AuditLogRepository,
      userRepository as unknown as UserRepository,
      eventEmitter as never,
      mailService as never,
      notificationPreferencesService as never,
    );
  });

  it('notifies and emails players when verification is approved', async () => {
    playerProfileRepository.findByUserId
      .mockResolvedValueOnce({ userId: 'user_1', isVerified: false })
      .mockResolvedValueOnce({ userId: 'user_1', isVerified: true });

    await service.verifyPlayer('user_1', 'admin_1', 'Looks good');

    expect(eventEmitter.emit).toHaveBeenCalledWith('notification.create', {
      userId: 'user_1',
      title: 'Verification approved',
      message: 'Your NxtPro profile has been verified.',
      type: 'verification',
      referenceId: 'user_1',
      preference: 'verificationUpdates',
    });
    expect(mailService.sendVerificationStatusEmail).toHaveBeenCalledWith(
      'user@nxtpro.dev',
      'verified',
      'Looks good',
    );
  });

  it('notifies scouts when verification is rejected and respects email preferences', async () => {
    notificationPreferencesService.allowsEmailNotification.mockResolvedValue(
      false,
    );
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

    expect(eventEmitter.emit).toHaveBeenCalledWith('notification.create', {
      userId: 'user_1',
      title: 'Verification rejected',
      message:
        'Your NxtPro verification was rejected. Missing license document',
      type: 'verification',
      referenceId: 'user_1',
      preference: 'verificationUpdates',
    });
    expect(mailService.sendVerificationStatusEmail).not.toHaveBeenCalled();
  });
});
