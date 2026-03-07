import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import type { AuthResponseDto } from './dto/auth-response.dto';
import type { MeResponseDto } from './dto/me-response.dto';
import type { RegisterDto } from './dto/register.dto';
import type { TokenResponseDto } from './dto/token-response.dto';

import type { JwtPayload } from '@/common/interfaces';
import { PlayerProfile, ScoutProfile, User } from '@/database/entities';

const SALT_ROUNDS = 10;

@Injectable()
export class AuthService {
  private readonly userRepository: Repository<User>;
  private readonly playerProfileRepository: Repository<PlayerProfile>;
  private readonly scoutProfileRepository: Repository<ScoutProfile>;
  private readonly jwtService: JwtService;
  private readonly configService: ConfigService;

  constructor(
    @InjectRepository(User)
    userRepository: Repository<User>,
    @InjectRepository(PlayerProfile)
    playerProfileRepository: Repository<PlayerProfile>,
    @InjectRepository(ScoutProfile)
    scoutProfileRepository: Repository<ScoutProfile>,
    jwtService: JwtService,
    configService: ConfigService,
  ) {
    this.userRepository = userRepository;
    this.playerProfileRepository = playerProfileRepository;
    this.scoutProfileRepository = scoutProfileRepository;
    this.jwtService = jwtService;
    this.configService = configService;
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
      select: ['id', 'email', 'passwordHash', 'role', 'status'],
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
    const tokens = this.issueTokens(user);
    return this.toAuthResponse(user, tokens, name);
  }

  // eslint-disable-next-line no-unused-vars
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
