import * as crypto from 'crypto';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { Repository } from 'typeorm';
import { OAuth2Client, type TokenPayload } from 'google-auth-library';
import type { AuthResponseDto } from './dto/auth-response.dto';
import type { MeResponseDto } from './dto/me-response.dto';
import type { OAuthLoginDto } from './dto/oauth-login.dto';
import type { TwoFaSetupResponseDto } from './dto/two-fa-setup-response.dto';
import type { RegisterDto } from './dto/register.dto';
import type { TokenResponseDto } from './dto/token-response.dto';

import type { JwtPayload } from '@/common/interfaces';
import { PlayerProfile, ScoutProfile, User } from '@/database/entities';
import { MailService } from '@/integrations/mail/mail.service';

const SALT_ROUNDS = 10;

@Injectable()
export class AuthService {
  private readonly userRepository: Repository<User>;
  private readonly playerProfileRepository: Repository<PlayerProfile>;
  private readonly scoutProfileRepository: Repository<ScoutProfile>;
  private readonly jwtService: JwtService;
  private readonly configService: ConfigService;
  private readonly mailService: MailService;

  constructor(
    @InjectRepository(User)
    userRepository: Repository<User>,
    @InjectRepository(PlayerProfile)
    playerProfileRepository: Repository<PlayerProfile>,
    @InjectRepository(ScoutProfile)
    scoutProfileRepository: Repository<ScoutProfile>,
    jwtService: JwtService,
    configService: ConfigService,
    mailService: MailService,
  ) {
    this.userRepository = userRepository;
    this.playerProfileRepository = playerProfileRepository;
    this.scoutProfileRepository = scoutProfileRepository;
    this.jwtService = jwtService;
    this.configService = configService;
    this.mailService = mailService;
  }

  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    const existing = await this.userRepository.findOne({
      where: { email: dto.email.toLowerCase() },
    });
    if (existing) {
      throw new ConflictException('Email already registered');
    }
    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    const user = this.userRepository.create({
      email: dto.email.toLowerCase(),
      passwordHash,
      role: dto.role,
      status: 'active',
    });
    await this.userRepository.save(user);

    const fullName = dto.fullName?.trim() || '';

    // Create the corresponding profile based on role
    if (dto.role === 'player') {
      const playerProfile = this.playerProfileRepository.create({
        userId: user.id,
        fullName: fullName || user.email,
        dateOfBirth: new Date('2000-01-01'), // placeholder until profile is updated
      });
      await this.playerProfileRepository.save(playerProfile);
    } else if (dto.role === 'scout') {
      const scoutProfile = this.scoutProfileRepository.create({
        userId: user.id,
        fullName: fullName || user.email,
        organization: '',
        organizationType: 'independent',
      });
      await this.scoutProfileRepository.save(scoutProfile);
    }

    const tokens = this.issueTokens(user);
    return this.toAuthResponse(user, tokens, fullName || user.email);
  }

  async login(email: string, password: string): Promise<AuthResponseDto> {
    const user = await this.userRepository.findOne({
      where: { email: email.toLowerCase() },
      select: [
        'id',
        'email',
        'passwordHash',
        'role',
        'status',
        'twoFactorEnabled',
      ],
      relations: ['playerProfile', 'scoutProfile'],
    });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid email or password');
    }
    if (user.status !== 'active') {
      throw new UnauthorizedException('Account is not active');
    }
    const name =
      (
        user as {
          playerProfile?: { fullName?: string };
          scoutProfile?: { fullName?: string };
        }
      ).playerProfile?.fullName ??
      (user as { scoutProfile?: { fullName?: string } }).scoutProfile
        ?.fullName ??
      '';
    // If 2FA is enabled, do not issue access/refresh tokens yet.
    // Instead, generate a short-lived 2FA token and require a TOTP code.
    if (user.twoFactorEnabled) {
      const twoFactorToken = this.issueTwoFactorToken(user);

      return {
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          name: name || user.email,
        },
        token: '',
        twoFactorRequired: true,
        twoFactorToken,
      };
    }

    const tokens = this.issueTokens(user);
    return this.toAuthResponse(user, tokens, name);
  }

  async logout(_userId: string, _refreshToken?: string): Promise<void> {
    // Stateless: client discards tokens. Optional: add in-memory or Redis blocklist later.
  }

  async refresh(refreshToken: string): Promise<AuthResponseDto> {
    const secret = this.configService.get<string>('jwt.refreshSecret');
    if (!secret) {
      throw new UnauthorizedException('Refresh not configured');
    }
    let payload: JwtPayload & { type?: string };
    try {
      payload = this.jwtService.verify<JwtPayload & { type: string }>(
        refreshToken,
        { secret },
      );
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Invalid refresh token');
    }
    const user = await this.userRepository.findOne({
      where: { id: payload.sub },
      select: ['id', 'email', 'role'],
      relations: ['playerProfile', 'scoutProfile'],
    });
    if (!user || user.role !== payload.role) {
      throw new UnauthorizedException('User not found');
    }
    const name =
      (
        user as {
          playerProfile?: { fullName?: string };
          scoutProfile?: { fullName?: string };
        }
      ).playerProfile?.fullName ??
      (user as { scoutProfile?: { fullName?: string } }).scoutProfile
        ?.fullName ??
      '';
    const tokens = this.issueTokens(user);
    return this.toAuthResponse(user, tokens, name);
  }

  async getMe(userId: string): Promise<MeResponseDto> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'email', 'role', 'status', 'lastActive', 'createdAt'],
      relations: ['playerProfile', 'scoutProfile'],
    });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    const name =
      (
        user as {
          playerProfile?: { fullName?: string };
          scoutProfile?: { fullName?: string };
        }
      ).playerProfile?.fullName ??
      (user as { scoutProfile?: { fullName?: string } }).scoutProfile
        ?.fullName ??
      '';
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      name: name || user.email,
      status: user.status,
      lastActive: user.lastActive?.toISOString(),
      createdAt: user.createdAt.toISOString(),
    };
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'passwordHash'],
    });
    if (!user || !(await bcrypt.compare(currentPassword, user.passwordHash))) {
      throw new UnauthorizedException('Current password is incorrect');
    }
    user.passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await this.userRepository.save(user);
  }

  async requestPasswordReset(email: string): Promise<void> {
    const normalizedEmail = email.toLowerCase();
    const user = await this.userRepository.findOne({
      where: { email: normalizedEmail },
      select: ['id', 'email', 'passwordResetToken', 'passwordResetExpiresAt'],
    });

    if (!user) {
      throw new BadRequestException('Email is not registered');
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto
      .createHash('sha256')
      .update(rawToken)
      .digest('hex');

    user.passwordResetToken = hashedToken;
    user.passwordResetExpiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await this.userRepository.save(user);

    const frontendBaseUrl =
      this.configService.get<string>('app.frontendBaseUrl') ??
      this.configService.get<string>('frontend.baseUrl') ??
      'https://app.nxtpro.app';

    const resetUrl = `${frontendBaseUrl.replace(/\/+$/, '')}/reset-password?token=${rawToken}&email=${encodeURIComponent(
      normalizedEmail,
    )}`;

    await this.mailService.sendPasswordResetEmail(normalizedEmail, resetUrl);
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await this.userRepository.findOne({
      where: { passwordResetToken: hashedToken },
      select: [
        'id',
        'passwordHash',
        'passwordResetToken',
        'passwordResetExpiresAt',
      ],
    });

    if (
      !user ||
      !user.passwordResetExpiresAt ||
      user.passwordResetExpiresAt.getTime() < Date.now()
    ) {
      throw new BadRequestException('Reset token is invalid or has expired');
    }

    user.passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    user.passwordResetToken = null;
    user.passwordResetExpiresAt = null;

    await this.userRepository.save(user);
  }

  async setTwoFactorEnabled(userId: string, enabled: boolean): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: [
        'id',
        'twoFactorEnabled',
        'twoFactorCode',
        'twoFactorCodeExpiresAt',
      ],
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    user.twoFactorEnabled = enabled;

    if (!enabled) {
      user.twoFactorCode = null;
      user.twoFactorCodeExpiresAt = null;
      user.twoFactorSecret = null;
    }

    await this.userRepository.save(user);
  }

  async startTwoFactorSetup(userId: string): Promise<TwoFaSetupResponseDto> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'email', 'twoFactorSecret'],
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const generatedSecret = (
      speakeasy as unknown as {
        generateSecret: (options: unknown) => { base32: string };
      }
    ).generateSecret({
      length: 32,
      name: `NxtPro (${user.email})`,
    });

    const secret = user.twoFactorSecret ?? generatedSecret.base32;

    user.twoFactorSecret = secret;
    await this.userRepository.save(user);

    const otpauthUrl = (
      speakeasy as unknown as {
        otpauthURL: (options: unknown) => string;
      }
    ).otpauthURL({
      secret,
      label: `NxtPro (${user.email})`,
      encoding: 'base32',
      issuer: 'NxtPro',
    });

    const qrCodeDataUrl = await (
      QRCode as unknown as {
        toDataURL: (text: string) => Promise<string>;
      }
    ).toDataURL(otpauthUrl);

    return {
      secret,
      otpauthUrl,
      qrCodeDataUrl,
    };
  }

  async confirmTwoFactorSetup(userId: string, code: string): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'email', 'twoFactorSecret', 'twoFactorEnabled'],
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (!user.twoFactorSecret) {
      throw new BadRequestException('Two-factor secret not initialized');
    }

    const verified = (
      speakeasy as unknown as {
        totp: { verify: (options: unknown) => boolean };
      }
    ).totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: code,
      window: 1,
    });

    if (!verified) {
      throw new UnauthorizedException('Invalid verification code');
    }

    user.twoFactorEnabled = true;
    await this.userRepository.save(user);
  }

  async verifyTwoFactor(
    twoFactorToken: string,
    code: string,
  ): Promise<AuthResponseDto> {
    const secret = this.configService.get<string>('jwt.secret');
    if (!secret) {
      throw new Error('JWT secret not configured');
    }

    let payload: JwtPayload & { type?: string };
    try {
      payload = this.jwtService.verify<JwtPayload & { type?: string }>(
        twoFactorToken,
        {
          secret,
        },
      );
    } catch {
      throw new UnauthorizedException('Invalid or expired two-factor token');
    }

    if (payload.type !== '2fa') {
      throw new UnauthorizedException('Invalid two-factor token');
    }

    const user = await this.userRepository.findOne({
      where: { id: payload.sub },
      select: [
        'id',
        'email',
        'role',
        'status',
        'twoFactorEnabled',
        'twoFactorSecret',
      ],
      relations: ['playerProfile', 'scoutProfile'],
    });

    if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
      throw new UnauthorizedException('User not found or 2FA not enabled');
    }

    const verified = (
      speakeasy as unknown as {
        totp: { verify: (options: unknown) => boolean };
      }
    ).totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: code,
      window: 1,
    });

    if (!verified) {
      throw new UnauthorizedException('Invalid verification code');
    }

    await this.userRepository.save(user);

    const name =
      (
        user as {
          playerProfile?: { fullName?: string };
          scoutProfile?: { fullName?: string };
        }
      ).playerProfile?.fullName ??
      (user as { scoutProfile?: { fullName?: string } }).scoutProfile
        ?.fullName ??
      '';

    const tokens = this.issueTokens(user);
    return this.toAuthResponse(user, tokens, name || user.email);
  }

  async oauthLogin(dto: OAuthLoginDto): Promise<AuthResponseDto> {
    const provider = dto.provider.toLowerCase();

    let providerUserId = dto.providerUserId;
    let normalizedEmailFromProvider = dto.email?.toLowerCase();
    let normalizedNameFromProvider = dto.name?.trim();

    if (provider === 'google') {
      const googleIdentity = await this.verifyGoogleIdentity(dto);
      providerUserId = googleIdentity.providerUserId;
      normalizedEmailFromProvider = googleIdentity.email;
      normalizedNameFromProvider = googleIdentity.name;
    }

    if (provider === 'facebook') {
      const facebookIdentity = await this.verifyFacebookIdentity(dto);
      providerUserId = facebookIdentity.providerUserId;
      normalizedEmailFromProvider = facebookIdentity.email;
      normalizedNameFromProvider = facebookIdentity.name;
    }

    if (!providerUserId) {
      throw new BadRequestException('OAuth provider user ID is required');
    }

    let user = await this.userRepository.findOne({
      where: {
        oauthProvider: provider,
        oauthProviderId: providerUserId,
      },
      relations: ['playerProfile', 'scoutProfile'],
    });

    if (!user && normalizedEmailFromProvider) {
      user = await this.userRepository.findOne({
        where: { email: normalizedEmailFromProvider },
        relations: ['playerProfile', 'scoutProfile'],
      });
    }

    const normalizedEmail =
      normalizedEmailFromProvider ??
      `${providerUserId}@${provider}.oauth.local`;

    if (!user) {
      const passwordHash = await bcrypt.hash(
        crypto.randomBytes(16).toString('hex'),
        SALT_ROUNDS,
      );

      user = this.userRepository.create({
        email: normalizedEmail,
        passwordHash,
        role: 'player',
        status: 'active',
        oauthProvider: provider,
        oauthProviderId: providerUserId,
      });

      await this.userRepository.save(user);

      const fullName = normalizedNameFromProvider || normalizedEmail;
      const playerProfile = this.playerProfileRepository.create({
        userId: user.id,
        fullName,
        dateOfBirth: new Date('2000-01-01'),
      });
      await this.playerProfileRepository.save(playerProfile);
    } else {
      if (user.status !== 'active') {
        throw new UnauthorizedException('Account is not active');
      }

      if (!user.oauthProvider || !user.oauthProviderId) {
        user.oauthProvider = provider;
        user.oauthProviderId = providerUserId;
        await this.userRepository.save(user);
      }
    }

    const name =
      (normalizedNameFromProvider ||
        (
          user as {
            playerProfile?: { fullName?: string };
            scoutProfile?: { fullName?: string };
          }
        ).playerProfile?.fullName) ??
      (user as { scoutProfile?: { fullName?: string } }).scoutProfile
        ?.fullName ??
      '';

    const tokens = this.issueTokens(user);
    return this.toAuthResponse(user, tokens, name || user.email);
  }

  private async verifyGoogleIdentity(dto: OAuthLoginDto): Promise<{
    providerUserId: string;
    email?: string;
    name?: string;
  }> {
    if (!dto.idToken) {
      throw new BadRequestException('Google OAuth requires an ID token');
    }

    const clientIds =
      this.configService.get<string[]>('oauth.google.clientIds') ?? [];

    if (clientIds.length === 0) {
      throw new UnauthorizedException('Google OAuth is not configured');
    }

    const oauthClient = new OAuth2Client();

    let payload: TokenPayload | undefined;
    try {
      const ticket = await oauthClient.verifyIdToken({
        idToken: dto.idToken,
        audience: clientIds,
      });
      payload = ticket.getPayload();
    } catch {
      throw new UnauthorizedException('Invalid Google ID token');
    }

    if (!payload?.sub) {
      throw new UnauthorizedException('Invalid Google identity payload');
    }

    if (payload.email && payload.email_verified === false) {
      throw new UnauthorizedException('Google email is not verified');
    }

    return {
      providerUserId: payload.sub,
      email: payload.email,
      name: payload.name,
    };
  }

  private async verifyFacebookIdentity(dto: OAuthLoginDto): Promise<{
    providerUserId: string;
    email?: string;
    name?: string;
  }> {
    if (!dto.accessToken) {
      throw new BadRequestException('Facebook OAuth requires an access token');
    }

    const facebookAppId = this.configService.get<string>(
      'oauth.facebook.appId',
    );
    const facebookAppSecret = this.configService.get<string>(
      'oauth.facebook.appSecret',
    );

    try {
      if (facebookAppId && facebookAppSecret) {
        const appAccessToken = `${facebookAppId}|${facebookAppSecret}`;
        const debugUrl = new URL('https://graph.facebook.com/debug_token');
        debugUrl.searchParams.set('input_token', dto.accessToken);
        debugUrl.searchParams.set('access_token', appAccessToken);

        const debugResponse = await fetch(debugUrl.toString());
        const debugPayload = (await debugResponse.json()) as {
          data?: { is_valid?: boolean; app_id?: string };
        };

        if (!debugResponse.ok || !debugPayload.data?.is_valid) {
          throw new UnauthorizedException('Invalid Facebook access token');
        }

        if (
          debugPayload.data.app_id &&
          facebookAppId &&
          debugPayload.data.app_id !== facebookAppId
        ) {
          throw new UnauthorizedException(
            'Facebook token app ID does not match configuration',
          );
        }
      }

      const meUrl = new URL('https://graph.facebook.com/me');
      meUrl.searchParams.set('fields', 'id,name,email');
      meUrl.searchParams.set('access_token', dto.accessToken);

      const meResponse = await fetch(meUrl.toString());
      const mePayload = (await meResponse.json()) as {
        id?: string;
        email?: string;
        name?: string;
      };

      if (!meResponse.ok || !mePayload.id) {
        throw new UnauthorizedException('Invalid Facebook identity payload');
      }

      return {
        providerUserId: mePayload.id,
        email: mePayload.email,
        name: mePayload.name,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new UnauthorizedException('Could not verify Facebook access token');
    }
  }

  private issueTokens(
    user: Pick<User, 'id' | 'email' | 'role'>,
  ): TokenResponseDto {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      type: 'access',
    };
    const refreshPayload: JwtPayload = {
      ...payload,
      type: 'refresh',
    };
    const accessExpiresIn = this.configService.get<string>(
      'jwt.expiresIn',
      '7d',
    );
    const refreshExpiresIn = this.configService.get<string>(
      'jwt.refreshExpiresIn',
      '30d',
    );
    const secret = this.configService.get<string>('jwt.secret');
    const refreshSecret = this.configService.get<string>('jwt.refreshSecret');
    if (!secret || !refreshSecret) {
      throw new Error('JWT secrets not configured');
    }
    const accessExpiresInSeconds = this.parseExpiryToSeconds(accessExpiresIn);
    const refreshExpiresInSeconds = this.parseExpiryToSeconds(refreshExpiresIn);
    const accessToken = this.jwtService.sign({ ...payload } as object, {
      secret,
      expiresIn: accessExpiresInSeconds,
    });
    const refreshToken = this.jwtService.sign({ ...refreshPayload } as object, {
      secret: refreshSecret,
      expiresIn: refreshExpiresInSeconds,
    });
    return {
      accessToken,
      refreshToken,
      expiresIn: accessExpiresInSeconds,
    };
  }

  private issueTwoFactorToken(
    user: Pick<User, 'id' | 'email' | 'role'>,
  ): string {
    const secret = this.configService.get<string>('jwt.secret');
    if (!secret) {
      throw new Error('JWT secret not configured');
    }

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      type: '2fa',
    };

    const twoFactorExpiresIn = this.configService.get<string>(
      'jwt.twoFactorExpiresIn',
      '10m',
    );

    const expiresInSeconds = this.parseExpiryToSeconds(twoFactorExpiresIn);

    return this.jwtService.sign({ ...payload } as object, {
      secret,
      expiresIn: expiresInSeconds,
    });
  }

  private toAuthResponse(
    user: Pick<User, 'id' | 'email' | 'role'>,
    tokens: TokenResponseDto,
    name: string,
  ): AuthResponseDto {
    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        name: name || user.email,
      },
      token: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn,
    };
  }

  private generateTwoFactorCode(): string {
    const code = Math.floor(100000 + Math.random() * 900000);
    return String(code);
  }

  private parseExpiryToSeconds(expiresIn: string): number {
    const match = expiresIn.match(/^(\d+)([smhd])$/);
    if (!match) return 7 * 24 * 3600;
    const n = parseInt(match[1], 10);
    const unit = match[2];
    const multipliers: Record<string, number> = {
      s: 1,
      m: 60,
      h: 3600,
      d: 86400,
    };
    return n * (multipliers[unit] ?? 86400);
  }
}
