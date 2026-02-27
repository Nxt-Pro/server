import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';

import { ScoutVerificationStatus } from '@/common/enums';
import { PlayerProfile, ScoutProfile } from '@/database/entities';
import {
  AuditLogRepository,
  PlayerProfileRepository,
  ScoutProfileRepository,
} from '@/database/repositories';

export interface PendingPlayer {
  type: 'player';
  userId: string;
  fullName: string;
  profileCompleteness: number;
  createdAt: Date;
  position?: string;
  clubName?: string;
}

export interface PendingScout {
  type: 'scout';
  userId: string;
  fullName: string;
  profileCompleteness: number;
  createdAt: Date;
  organization?: string;
  organizationType?: string;
  licenseNumber?: string;
  verificationStatus?: string;
  verificationDocuments?: Record<string, unknown>;
}

@Injectable()
export class AdminVerificationService {
  private readonly logger = new Logger(AdminVerificationService.name);

  private readonly playerProfileRepository: PlayerProfileRepository;
  private readonly scoutProfileRepository: ScoutProfileRepository;
  private readonly auditLogRepository: AuditLogRepository;

  constructor(
    playerProfileRepository: PlayerProfileRepository,
    scoutProfileRepository: ScoutProfileRepository,
    auditLogRepository: AuditLogRepository,
  ) {
    this.playerProfileRepository = playerProfileRepository;
    this.scoutProfileRepository = scoutProfileRepository;
    this.auditLogRepository = auditLogRepository;
  }

  /**
   * List pending players (unverified) and pending scouts separately.
   * GET (/api/admin/verifications)
   */
  async getPendingVerifications(): Promise<{
    players: PendingPlayer[];
    scouts: PendingScout[];
  }> {
    const [unverifiedPlayers, pendingScouts] = await Promise.all([
      this.playerProfileRepository.find({
        where: { isVerified: false },
        order: { createdAt: 'ASC' },
      }),
      this.scoutProfileRepository.find({
        where: { verificationStatus: ScoutVerificationStatus.PENDING },
        order: { createdAt: 'ASC' },
      }),
    ]);

    const players: PendingPlayer[] = unverifiedPlayers.map(player => ({
      type: 'player' as const,
      userId: player.userId,
      fullName: player.fullName,
      profileCompleteness: Number(player.profileCompleteness),
      createdAt: player.createdAt,
      position: player.position,
      clubName: player.clubName,
    }));

    const scouts: PendingScout[] = pendingScouts.map(scout => ({
      type: 'scout' as const,
      userId: scout.userId,
      fullName: scout.fullName,
      profileCompleteness: Number(scout.profileCompleteness),
      createdAt: scout.createdAt,
      organization: scout.organization,
      organizationType: scout.organizationType,
      licenseNumber: scout.licenseNumber,
      verificationStatus: scout.verificationStatus,
      verificationDocuments: scout.verificationDocuments,
    }));

    return { players, scouts };
  }

  /**
   * Verify a player profile.
   * PATCH (/api/admin/verify/player/:id)
   */
  async verifyPlayer(
    userId: string,
    adminId: string,
    notes?: string,
  ): Promise<PlayerProfile> {
    const profile = await this.playerProfileRepository.findByUserId(userId);

    if (!profile) {
      throw new NotFoundException(
        `Player profile for user ${userId} not found`,
      );
    }

    if (profile.isVerified) {
      throw new BadRequestException('Player is already verified');
    }

    const now = new Date();

    await this.playerProfileRepository.updateByUserId(userId, {
      isVerified: true,
      basicVerifiedAt: now,
    });

    await this.auditLogRepository.log({
      actorId: adminId,
      action: 'user_verified',
      entityType: 'player_profile',
      entityId: userId,
      description: notes ?? 'Player verified by admin',
      oldStatus: 'unverified',
      newStatus: 'verified',
      metadata: { notes },
    });

    this.logger.log(`Player ${userId} verified by admin ${adminId}`);

    return (await this.playerProfileRepository.findByUserId(userId))!;
  }

  /**
   * Verify or reject a scout profile.
   * PATCH (/api/admin/verify/scout/:id)
   */
  async verifyScout(
    userId: string,
    adminId: string,
    data: { status: 'verified' | 'rejected'; notes?: string },
  ): Promise<ScoutProfile> {
    const profile = await this.scoutProfileRepository.findByUserId(userId);

    if (!profile) {
      throw new NotFoundException(`Scout profile for user ${userId} not found`);
    }

    if (
      (profile.verificationStatus as ScoutVerificationStatus) ===
      ScoutVerificationStatus.VERIFIED
    ) {
      throw new BadRequestException('Scout is already verified');
    }

    const oldStatus = profile.verificationStatus;

    await this.scoutProfileRepository.updateByUserId(userId, {
      verificationStatus: data.status,
    });

    await this.auditLogRepository.log({
      actorId: adminId,
      action: 'user_verified',
      entityType: 'scout_profile',
      entityId: userId,
      description: data.notes ?? `Scout ${data.status} by admin`,
      oldStatus,
      newStatus: data.status,
      metadata: { notes: data.notes },
    });

    this.logger.log(`Scout ${userId} ${data.status} by admin ${adminId}`);

    return (await this.scoutProfileRepository.findByUserId(userId))!;
  }
}
