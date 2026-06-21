import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import 'reflect-metadata';
import speakeasy from 'speakeasy';

import { AuthService } from '@/modules/auth/auth.service';

describe('AuthService 2FA account behavior', () => {
  let service: AuthService;
  let userRepository: {
    findOne: jest.Mock;
    save: jest.Mock<Promise<unknown>, [unknown]>;
  };
  let jwtService: {
    verify: jest.Mock;
    sign: jest.Mock;
  };
  let configService: {
    get: jest.Mock;
  };

  beforeEach(() => {
    userRepository = {
      findOne: jest.fn(),
      save: jest.fn<Promise<unknown>, [unknown]>(),
    };
    jwtService = {
      verify: jest.fn(),
      sign: jest.fn(),
    };
    configService = {
      get: jest.fn((key: string, fallback?: string) => {
        const values: Record<string, string> = {
          'jwt.secret': 'access-secret',
          'jwt.refreshSecret': 'refresh-secret',
          'jwt.expiresIn': '7d',
          'jwt.refreshExpiresIn': '30d',
        };
        return values[key] ?? fallback;
      }),
    };

    service = new AuthService(
      userRepository as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      jwtService as never,
      configService as never,
      {} as never,
    );
  });

  it('rejects enabling 2FA through the generic PATCH endpoint', async () => {
    userRepository.findOne.mockResolvedValue({
      id: 'user_1',
      twoFactorEnabled: false,
      twoFactorCode: null,
      twoFactorCodeExpiresAt: null,
      twoFactorSecret: 'SECRET',
    });

    await expect(service.setTwoFactorEnabled('user_1', true)).rejects.toThrow(
      BadRequestException,
    );

    expect(userRepository.save).not.toHaveBeenCalled();
  });

  it('disables 2FA and clears stored 2FA material', async () => {
    const user = {
      id: 'user_1',
      twoFactorEnabled: true,
      twoFactorCode: '123456',
      twoFactorCodeExpiresAt: new Date('2026-01-01T00:00:00.000Z'),
      twoFactorSecret: 'SECRET',
    };
    userRepository.findOne.mockResolvedValue(user);

    await expect(
      service.setTwoFactorEnabled('user_1', false),
    ).resolves.toBeUndefined();

    expect(userRepository.save).toHaveBeenCalledWith({
      ...user,
      twoFactorEnabled: false,
      twoFactorCode: null,
      twoFactorCodeExpiresAt: null,
      twoFactorSecret: null,
    });
  });

  it('rejects 2FA setup when already enabled', async () => {
    userRepository.findOne.mockResolvedValue({
      id: 'user_1',
      email: 'user@nxtpro.dev',
      twoFactorEnabled: true,
      twoFactorSecret: 'SECRET',
    });

    await expect(service.startTwoFactorSetup('user_1')).rejects.toThrow(
      BadRequestException,
    );

    expect(userRepository.save).not.toHaveBeenCalled();
  });

  it('returns the exact pending setup secret that it saves before confirmation', async () => {
    const user = {
      id: 'user_1',
      email: 'user@nxtpro.dev',
      twoFactorEnabled: false,
      twoFactorSecret: 'OLDPENDINGSECRET',
      twoFactorCode: '123456',
      twoFactorCodeExpiresAt: new Date('2026-01-01T00:00:00.000Z'),
    };
    userRepository.findOne.mockResolvedValueOnce(user);

    const setup = await service.startTwoFactorSetup('user_1');

    expect(setup.secret).toBeTruthy();
    expect(setup.secret).not.toBe('OLDPENDINGSECRET');

    const savedUser = userRepository.save.mock.calls[0]?.[0] as
      | {
          twoFactorSecret: string;
          twoFactorCode: string | null;
          twoFactorCodeExpiresAt: Date | null;
        }
      | undefined;

    expect(savedUser).toBeDefined();
    if (!savedUser) {
      throw new Error('Expected setup to save the pending 2FA secret');
    }

    const savedSetupUser = savedUser;

    expect(savedSetupUser.twoFactorSecret).toBe(setup.secret);
    expect(savedSetupUser.twoFactorCode).toBeNull();
    expect(savedSetupUser.twoFactorCodeExpiresAt).toBeNull();

    const token = speakeasy.totp({
      secret: setup.secret,
      encoding: 'base32',
    });

    userRepository.save.mockClear();
    userRepository.findOne.mockResolvedValueOnce(savedSetupUser);

    await expect(
      service.confirmTwoFactorSetup('user_1', token),
    ).resolves.toBeUndefined();

    expect(userRepository.save).toHaveBeenCalledWith({
      ...savedSetupUser,
      twoFactorEnabled: true,
    });
  });

  it('rejects blank 2FA confirmation codes', async () => {
    await expect(service.confirmTwoFactorSetup('user_1', '  ')).rejects.toThrow(
      BadRequestException,
    );

    expect(userRepository.findOne).not.toHaveBeenCalled();
  });

  it('enables 2FA when setup confirmation receives a valid current TOTP code', async () => {
    const user = {
      id: 'user_1',
      email: 'user@nxtpro.dev',
      twoFactorEnabled: false,
      twoFactorSecret: 'JBSWY3DPEHPK3PXP',
    };
    const token = speakeasy.totp({
      secret: user.twoFactorSecret,
      encoding: 'base32',
    });
    userRepository.findOne.mockResolvedValue(user);

    await expect(
      service.confirmTwoFactorSetup(
        'user_1',
        `${token.slice(0, 3)} ${token.slice(3)}`,
      ),
    ).resolves.toBeUndefined();

    expect(userRepository.save).toHaveBeenCalledWith({
      ...user,
      twoFactorEnabled: true,
    });
  });

  it('rejects invalid 2FA setup confirmation codes', async () => {
    userRepository.findOne.mockResolvedValue({
      id: 'user_1',
      email: 'user@nxtpro.dev',
      twoFactorEnabled: false,
      twoFactorSecret: 'JBSWY3DPEHPK3PXP',
    });

    await expect(
      service.confirmTwoFactorSetup('user_1', '000000'),
    ).rejects.toThrow(UnauthorizedException);

    expect(userRepository.save).not.toHaveBeenCalled();
  });

  it('verifies login 2FA with the current authenticator code', async () => {
    const twoFactorSecret = 'JBSWY3DPEHPK3PXP';
    const token = speakeasy.totp({
      secret: twoFactorSecret,
      encoding: 'base32',
    });

    jwtService.verify.mockReturnValue({
      sub: 'user_1',
      email: 'user@nxtpro.dev',
      role: 'player',
      type: '2fa',
    });
    jwtService.sign
      .mockReturnValueOnce('access-token')
      .mockReturnValueOnce('refresh-token');
    userRepository.findOne.mockResolvedValue({
      id: 'user_1',
      email: 'user@nxtpro.dev',
      username: null,
      role: 'player',
      status: 'active',
      twoFactorEnabled: true,
      twoFactorSecret,
      playerProfile: { fullName: 'User One' },
      scoutProfile: null,
    });
    userRepository.save.mockResolvedValue({});

    await expect(
      service.verifyTwoFactor('pending-token', token),
    ).resolves.toMatchObject({
      token: 'access-token',
      refreshToken: 'refresh-token',
      user: {
        id: 'user_1',
        twoFactorEnabled: true,
      },
    });
  });

  it('returns persisted 2FA status from getMe', async () => {
    userRepository.findOne.mockResolvedValue({
      id: 'user_1',
      email: 'user@nxtpro.dev',
      username: null,
      role: 'player',
      status: 'active',
      twoFactorEnabled: true,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      lastActive: undefined,
      playerProfile: { fullName: 'User One' },
      scoutProfile: null,
    });

    await expect(service.getMe('user_1')).resolves.toMatchObject({
      id: 'user_1',
      twoFactorEnabled: true,
    });
  });

  it('throws when getMe cannot find the user', async () => {
    userRepository.findOne.mockResolvedValue(null);

    await expect(service.getMe('missing')).rejects.toThrow(
      UnauthorizedException,
    );
  });
});
