import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { PlayerProfileResponseDto } from './dto/player-profile-response.dto';
import type { UpdatePlayerProfileDto } from './dto/update-player-profile.dto';
import type { ScoutProfileResponseDto } from './dto/scout-profile-response.dto';
import type { UpdateScoutProfileDto } from './dto/update-scout-profile.dto';
import type { UserSummaryDto } from './dto/user-summary.dto';
import type {
  ListPlayersQueryDto,
  ListScoutsQueryDto,
  GlobalSearchQueryDto,
} from './dto/discovery-query.dto';
import {
  Block,
  Mute,
  PlayerProfile,
  ScoutProfile,
  User,
} from '@/database/entities';

@Injectable()
export class ProfilesService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(PlayerProfile)
    private readonly playerProfileRepository: Repository<PlayerProfile>,
    @InjectRepository(ScoutProfile)
    private readonly scoutProfileRepository: Repository<ScoutProfile>,
    @InjectRepository(Block)
    private readonly blockRepository: Repository<Block>,
    @InjectRepository(Mute)
    private readonly muteRepository: Repository<Mute>,
  ) {}

  async getPlayerProfile(profileId: string): Promise<PlayerProfileResponseDto> {
    const profile = await this.playerProfileRepository.findOne({
      where: { userId: profileId },
    });
    if (!profile) {
      throw new NotFoundException('Player profile not found');
    }
    return this.toPlayerProfileResponse(profile);
  }

  async updatePlayerProfile(
    userId: string,
    dto: UpdatePlayerProfileDto,
  ): Promise<PlayerProfileResponseDto> {
    const profile = await this.playerProfileRepository.findOne({
      where: { userId },
    });
    if (!profile) {
      throw new NotFoundException('Player profile not found');
    }
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['role'],
    });
    if (!user || user.role !== 'player') {
      throw new ForbiddenException('Only players can update player profile');
    }
    this.applyPlayerProfileUpdates(profile, dto);
    await this.playerProfileRepository.save(profile);
    return this.toPlayerProfileResponse(profile);
  }

  async getScoutProfile(profileId: string): Promise<ScoutProfileResponseDto> {
    const profile = await this.scoutProfileRepository.findOne({
      where: { userId: profileId },
    });
    if (!profile) {
      throw new NotFoundException('Scout profile not found');
    }
    return this.toScoutProfileResponse(profile);
  }

  async updateScoutProfile(
    userId: string,
    dto: UpdateScoutProfileDto,
  ): Promise<ScoutProfileResponseDto> {
    const profile = await this.scoutProfileRepository.findOne({
      where: { userId },
    });
    if (!profile) {
      throw new NotFoundException('Scout profile not found');
    }
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['role'],
    });
    if (!user || user.role !== 'scout') {
      throw new ForbiddenException('Only scouts can update scout profile');
    }
    this.applyScoutProfileUpdates(profile, dto);
    await this.scoutProfileRepository.save(profile);
    return this.toScoutProfileResponse(profile);
  }

  async listPlayers(query: ListPlayersQueryDto): Promise<{
    data: PlayerProfileResponseDto[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(50, Math.max(1, query.limit ?? 20));

    const qb = this.playerProfileRepository
      .createQueryBuilder('p')
      .orderBy('p.aiScore', 'DESC')
      .addOrderBy('p.totalViews', 'DESC');

    if (query.position) {
      qb.andWhere('p.position = :position', { position: query.position });
    }
    if (query.country) {
      qb.andWhere('p.country ILIKE :country', {
        country: `%${query.country}%`,
      });
    }
    if (query.city) {
      qb.andWhere('p.city ILIKE :city', { city: `%${query.city}%` });
    }
    if (query.availabilityStatus) {
      qb.andWhere('p.availability_status = :status', {
        status: query.availabilityStatus,
      });
    }

    const [profiles, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    const data = profiles.map(p => this.toPlayerProfileResponse(p));
    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async listScouts(query: ListScoutsQueryDto): Promise<{
    data: ScoutProfileResponseDto[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(50, Math.max(1, query.limit ?? 20));

    const qb = this.scoutProfileRepository
      .createQueryBuilder('s')
      .orderBy('s.profile_completeness', 'DESC')
      .addOrderBy('s.created_at', 'DESC');

    if (query.organizationType) {
      qb.andWhere('s.organization_type = :type', {
        type: query.organizationType,
      });
    }
    if (query.country) {
      qb.andWhere('s.countries_covered ILIKE :country', {
        country: `%${query.country}%`,
      });
    }

    const [profiles, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    const data = profiles.map(s => this.toScoutProfileResponse(s));
    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async globalSearch(query: GlobalSearchQueryDto): Promise<{
    players: PlayerProfileResponseDto[];
    scouts: ScoutProfileResponseDto[];
    totalPlayers: number;
    totalScouts: number;
    page: number;
    limit: number;
  }> {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(50, Math.max(1, query.limit ?? 20));
    const searchTerm = query.q?.trim() ?? '';
    const type = query.type ?? 'all';

    let players: PlayerProfile[] = [];
    let totalPlayers = 0;
    let scouts: ScoutProfile[] = [];
    let totalScouts = 0;

    if ((type === 'player' || type === 'all') && searchTerm) {
      const playerQb = this.playerProfileRepository
        .createQueryBuilder('p')
        .where(
          '(p.full_name ILIKE :term OR p.club_name ILIKE :term OR p.position ILIKE :term OR p.country ILIKE :term)',
          { term: `%${searchTerm}%` },
        )
        .orderBy('p.ai_score', 'DESC');
      [players, totalPlayers] = await playerQb
        .skip((page - 1) * limit)
        .take(limit)
        .getManyAndCount();
    } else if (type === 'player' || type === 'all') {
      [players, totalPlayers] = await this.playerProfileRepository
        .createQueryBuilder('p')
        .orderBy('p.ai_score', 'DESC')
        .skip((page - 1) * limit)
        .take(limit)
        .getManyAndCount();
    }

    if ((type === 'scout' || type === 'all') && searchTerm) {
      const scoutQb = this.scoutProfileRepository
        .createQueryBuilder('s')
        .where('(s.full_name ILIKE :term OR s.organization ILIKE :term)', {
          term: `%${searchTerm}%`,
        })
        .orderBy('s.profile_completeness', 'DESC');
      [scouts, totalScouts] = await scoutQb
        .skip((page - 1) * limit)
        .take(limit)
        .getManyAndCount();
    } else if (type === 'scout' || type === 'all') {
      [scouts, totalScouts] = await this.scoutProfileRepository
        .createQueryBuilder('s')
        .orderBy('s.profile_completeness', 'DESC')
        .skip((page - 1) * limit)
        .take(limit)
        .getManyAndCount();
    }

    return {
      players: players.map(p => this.toPlayerProfileResponse(p)),
      scouts: scouts.map(s => this.toScoutProfileResponse(s)),
      totalPlayers,
      totalScouts,
      page,
      limit,
    };
  }

  async blockUser(
    blockerId: string,
    blockedId: string,
  ): Promise<{ message: string }> {
    if (blockerId === blockedId) {
      throw new ForbiddenException('You cannot block yourself');
    }
    const blockedUser = await this.userRepository.findOne({
      where: { id: blockedId },
    });
    if (!blockedUser) {
      throw new NotFoundException('User not found');
    }
    const existing = await this.blockRepository.findOne({
      where: { blockerId, blockedId },
    });
    if (existing) {
      return { message: 'User already blocked' };
    }
    const block = this.blockRepository.create({
      blockerId,
      blockedId,
    });
    await this.blockRepository.save(block);
    return { message: 'User blocked' };
  }

  async muteUser(
    muterId: string,
    mutedId: string,
  ): Promise<{ message: string }> {
    if (muterId === mutedId) {
      throw new ForbiddenException('You cannot mute yourself');
    }
    const mutedUser = await this.userRepository.findOne({
      where: { id: mutedId },
    });
    if (!mutedUser) {
      throw new NotFoundException('User not found');
    }
    const existing = await this.muteRepository.findOne({
      where: { muterId, mutedId },
    });
    if (existing) {
      return { message: 'User already muted' };
    }
    const mute = this.muteRepository.create({
      muterId,
      mutedId,
    });
    await this.muteRepository.save(mute);
    return { message: 'User muted' };
  }

  async uploadAvatar(userId: string, url: string): Promise<{ url: string }> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['playerProfile', 'scoutProfile'],
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (user.playerProfile) {
      user.playerProfile.profilePictureUrl = url;
      await this.playerProfileRepository.save(user.playerProfile);
    }
    if (user.scoutProfile) {
      user.scoutProfile.profilePictureUrl = url;
      await this.scoutProfileRepository.save(user.scoutProfile);
    }
    return { url };
  }

  async uploadCover(userId: string, url: string): Promise<{ url: string }> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['playerProfile', 'scoutProfile'],
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (user.playerProfile) {
      user.playerProfile.coverImageUrl = url;
      await this.playerProfileRepository.save(user.playerProfile);
    }
    if (user.scoutProfile) {
      user.scoutProfile.coverImageUrl = url;
      await this.scoutProfileRepository.save(user.scoutProfile);
    }
    return { url };
  }

  async getUserSummary(userId: string): Promise<UserSummaryDto> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['playerProfile', 'scoutProfile'],
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    let name = user.email;
    let profilePictureUrl: string | null = null;
    let subtitle: string | null = null;

    if (user.playerProfile) {
      name = user.playerProfile.fullName;
      profilePictureUrl = user.playerProfile.profilePictureUrl ?? null;
      const parts: string[] = [];
      if (user.playerProfile.clubName) parts.push(user.playerProfile.clubName);
      if (user.playerProfile.position) parts.push(user.playerProfile.position);
      subtitle = parts.length > 0 ? parts.join(' · ') : null;
    } else if (user.scoutProfile) {
      name = user.scoutProfile.fullName;
      profilePictureUrl = user.scoutProfile.profilePictureUrl ?? null;
      subtitle = user.scoutProfile.organization ?? null;
    }

    return {
      id: user.id,
      role: user.role,
      name,
      profile_picture_url: profilePictureUrl,
      subtitle,
    };
  }

  private applyPlayerProfileUpdates(
    profile: PlayerProfile,
    dto: UpdatePlayerProfileDto,
  ): void {
    if (dto.fullName !== undefined) profile.fullName = dto.fullName;
    if (dto.dateOfBirth !== undefined)
      profile.dateOfBirth = new Date(dto.dateOfBirth);
    if (dto.nationality !== undefined) profile.nationality = dto.nationality;
    if (dto.position !== undefined) profile.position = dto.position;
    if (dto.secondaryPositions !== undefined)
      profile.secondaryPositions = dto.secondaryPositions;
    if (dto.preferredFoot !== undefined)
      profile.preferredFoot = dto.preferredFoot;
    if (dto.heightCm !== undefined) profile.heightCm = dto.heightCm;
    if (dto.weightKg !== undefined) profile.weightKg = dto.weightKg;
    if (dto.city !== undefined) profile.city = dto.city;
    if (dto.country !== undefined) profile.country = dto.country;
    if (dto.clubName !== undefined) profile.clubName = dto.clubName;
    if (dto.availabilityStatus !== undefined)
      profile.availabilityStatus = dto.availabilityStatus;
    if (dto.bio !== undefined) profile.bio = dto.bio;
    if (dto.profilePictureUrl !== undefined)
      profile.profilePictureUrl = dto.profilePictureUrl;
    if (dto.coverImageUrl !== undefined)
      profile.coverImageUrl = dto.coverImageUrl;
  }

  private applyScoutProfileUpdates(
    profile: ScoutProfile,
    dto: UpdateScoutProfileDto,
  ): void {
    if (dto.fullName !== undefined) profile.fullName = dto.fullName;
    if (dto.organization !== undefined) profile.organization = dto.organization;
    if (dto.organizationType !== undefined)
      profile.organizationType = dto.organizationType;
    if (dto.licenseNumber !== undefined)
      profile.licenseNumber = dto.licenseNumber;
    if (dto.yearsExperience !== undefined)
      profile.yearsExperience = dto.yearsExperience;
    if (dto.scoutingPositions !== undefined)
      profile.scoutingPositions = dto.scoutingPositions;
    if (dto.countriesCovered !== undefined)
      profile.countriesCovered = dto.countriesCovered;
    if (dto.bio !== undefined) profile.bio = dto.bio;
    if (dto.profilePictureUrl !== undefined)
      profile.profilePictureUrl = dto.profilePictureUrl;
    if (dto.coverImageUrl !== undefined)
      profile.coverImageUrl = dto.coverImageUrl;
  }

  private toPlayerProfileResponse(
    profile: PlayerProfile,
  ): PlayerProfileResponseDto {
    const dateStr =
      profile.dateOfBirth instanceof Date
        ? profile.dateOfBirth.toISOString().slice(0, 10)
        : String(profile.dateOfBirth);
    return {
      id: profile.userId,
      user_id: profile.userId,
      full_name: profile.fullName,
      date_of_birth: dateStr,
      position: profile.position ?? null,
      secondary_positions: profile.secondaryPositions ?? [],
      height_cm: profile.heightCm != null ? Number(profile.heightCm) : null,
      weight_kg: profile.weightKg != null ? Number(profile.weightKg) : null,
      nationality: profile.nationality ?? null,
      city: profile.city ?? null,
      country: profile.country ?? null,
      bio: profile.bio ?? null,
      profile_picture_url: profile.profilePictureUrl ?? null,
      cover_image_url: profile.coverImageUrl ?? null,
      is_verified: profile.isVerified,
      basic_verified_at: profile.basicVerifiedAt?.toISOString() ?? null,
      club_verified_at: profile.clubVerifiedAt?.toISOString() ?? null,
      performance_verified_at:
        profile.performanceVerifiedAt?.toISOString() ?? null,
      availability_status: profile.availabilityStatus ?? null,
      club_name: profile.clubName ?? null,
      preferred_foot: profile.preferredFoot ?? null,
      ai_score: profile.aiScore != null ? Number(profile.aiScore) : 0,
      total_posts: profile.totalPosts,
      total_likes: profile.totalLikes,
      total_views: profile.totalViews,
      is_featured: profile.isFeatured,
      featured_until: profile.featuredUntil?.toISOString() ?? null,
      profile_completeness:
        profile.profileCompleteness != null
          ? Number(profile.profileCompleteness)
          : 0,
      created_at: profile.createdAt.toISOString(),
      updated_at: profile.updatedAt.toISOString(),
    };
  }

  private toScoutProfileResponse(
    profile: ScoutProfile,
  ): ScoutProfileResponseDto {
    return {
      user_id: profile.userId,
      full_name: profile.fullName,
      organization: profile.organization,
      organization_type: profile.organizationType,
      license_number: profile.licenseNumber ?? null,
      years_experience: profile.yearsExperience ?? null,
      scouting_positions: profile.scoutingPositions ?? [],
      countries_covered: profile.countriesCovered ?? [],
      bio: profile.bio ?? null,
      profile_picture_url: profile.profilePictureUrl ?? null,
      cover_image_url: profile.coverImageUrl ?? null,
      total_notes: profile.totalNotes,
      verification_status: profile.verificationStatus,
      profile_completeness:
        profile.profileCompleteness != null
          ? Number(profile.profileCompleteness)
          : 0,
      created_at: profile.createdAt.toISOString(),
      updated_at: profile.updatedAt.toISOString(),
    };
  }
}
