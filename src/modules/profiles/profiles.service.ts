import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, In, Raw, Repository } from 'typeorm';
import type {
  CreateScoutNoteDto,
  CreateAchievementDto,
  CreateCareerTimelineDto,
  GlobalSearchQueryDto,
  ListPlayersQueryDto,
  ListScoutsQueryDto,
  PlayerProfileResponseDto,
  ScoutProfileResponseDto,
  UpdateAchievementDto,
  UpdateCareerTimelineDto,
  UpdatePlayerProfileDto,
  UpdatePlayerSkillScoreDto,
  UpdateScoutNoteDto,
  UpdateScoutProfileDto,
  UserSummaryDto,
} from './dto';

import {
  Block,
  Achievement,
  CareerTimeline,
  Mute,
  PlayerProfile,
  PlayerStats,
  Post,
  ScoutNotes,
  ScoutProfile,
  User,
  Video,
  VideoSkillAnalysis,
} from '@/database/entities';
import {
  PlayerProfileRepository,
  ScoutProfileRepository,
} from '@/database/repositories';

@Injectable()
export class ProfilesService {
  private readonly userRepository: Repository<User>;
  private readonly playerDiscoveryRepository: PlayerProfileRepository;
  private readonly scoutDiscoveryRepository: ScoutProfileRepository;
  private readonly playerProfileRepository: Repository<PlayerProfile>;
  private readonly scoutProfileRepository: Repository<ScoutProfile>;
  private readonly blockRepository: Repository<Block>;
  private readonly muteRepository: Repository<Mute>;
  private readonly scoutNotesRepository: Repository<ScoutNotes>;
  private readonly careerTimelineRepository: Repository<CareerTimeline>;
  private readonly achievementRepository: Repository<Achievement>;
  private readonly playerStatsRepository: Repository<PlayerStats>;
  private readonly postRepository: Repository<Post>;
  private readonly videoRepository: Repository<Video>;
  private readonly videoSkillAnalysisRepository: Repository<VideoSkillAnalysis>;

  constructor(
    playerDiscoveryRepository: PlayerProfileRepository,
    scoutDiscoveryRepository: ScoutProfileRepository,
    @InjectRepository(User)
    userRepository: Repository<User>,
    @InjectRepository(PlayerProfile)
    playerProfileRepository: Repository<PlayerProfile>,
    @InjectRepository(ScoutProfile)
    scoutProfileRepository: Repository<ScoutProfile>,
    @InjectRepository(Block)
    blockRepository: Repository<Block>,
    @InjectRepository(Mute)
    muteRepository: Repository<Mute>,
    @InjectRepository(ScoutNotes)
    scoutNotesRepository: Repository<ScoutNotes>,
    @InjectRepository(CareerTimeline)
    careerTimelineRepository: Repository<CareerTimeline>,
    @InjectRepository(Achievement)
    achievementRepository: Repository<Achievement>,
    @InjectRepository(PlayerStats)
    playerStatsRepository: Repository<PlayerStats>,
    @InjectRepository(Post)
    postRepository: Repository<Post>,
    @InjectRepository(Video)
    videoRepository: Repository<Video>,
    @InjectRepository(VideoSkillAnalysis)
    videoSkillAnalysisRepository: Repository<VideoSkillAnalysis>,
  ) {
    this.playerDiscoveryRepository = playerDiscoveryRepository;
    this.scoutDiscoveryRepository = scoutDiscoveryRepository;
    this.userRepository = userRepository;
    this.playerProfileRepository = playerProfileRepository;
    this.scoutProfileRepository = scoutProfileRepository;
    this.blockRepository = blockRepository;
    this.muteRepository = muteRepository;
    this.scoutNotesRepository = scoutNotesRepository;
    this.careerTimelineRepository = careerTimelineRepository;
    this.achievementRepository = achievementRepository;
    this.playerStatsRepository = playerStatsRepository;
    this.postRepository = postRepository;
    this.videoRepository = videoRepository;
    this.videoSkillAnalysisRepository = videoSkillAnalysisRepository;
  }

  async getPlayerProfile(profileId: string): Promise<PlayerProfileResponseDto> {
    const profile = await this.playerProfileRepository.findOne({
      where: { userId: profileId },
    });
    if (!profile) {
      throw new NotFoundException('Player profile not found');
    }

    const recalculatedCompleteness =
      await this.calculatePlayerCompleteness(profile);
    if (Number(profile.profileCompleteness ?? 0) !== recalculatedCompleteness) {
      profile.profileCompleteness = recalculatedCompleteness;
      await this.playerProfileRepository.save(profile);
    }

    const extras = await this.loadPlayerExtras([profile.userId]);
    return this.toPlayerProfileResponse(profile, extras.get(profile.userId));
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
    profile.profileCompleteness =
      await this.calculatePlayerCompleteness(profile);
    await this.playerProfileRepository.save(profile);
    const extras = await this.loadPlayerExtras([profile.userId]);
    return this.toPlayerProfileResponse(profile, extras.get(profile.userId));
  }

  async updatePlayerSkillScore(
    userId: string,
    dto: UpdatePlayerSkillScoreDto,
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

    const key = dto.skill.trim().toLowerCase();
    const level = Math.max(0, Math.min(99, Math.round(dto.score)));
    const skillScores = { ...(profile.skillScores ?? {}) };
    skillScores[key] = level;
    profile.skillScores = skillScores;
    profile.aiScore = this.calculateAiScoreFromSkills(skillScores);
    profile.profileCompleteness =
      await this.calculatePlayerCompleteness(profile);

    await this.playerProfileRepository.save(profile);
    const extras = await this.loadPlayerExtras([profile.userId]);
    return this.toPlayerProfileResponse(profile, extras.get(profile.userId));
  }

  async createCareerTimelineItem(
    userId: string,
    dto: CreateCareerTimelineDto,
  ): Promise<PlayerProfileResponseDto> {
    const profile = await this.getOwnedPlayerProfile(userId);
    const item = this.careerTimelineRepository.create({
      playerId: userId,
      title: dto.title.trim(),
      description: dto.description?.trim() || undefined,
      startDate: new Date(dto.startDate),
      endDate: dto.isCurrent
        ? undefined
        : dto.endDate
          ? new Date(dto.endDate)
          : undefined,
      isCurrent: dto.isCurrent ?? false,
      evidenceUrl: dto.evidenceUrl?.trim() || undefined,
    });

    await this.careerTimelineRepository.save(item);
    profile.profileCompleteness =
      await this.calculatePlayerCompleteness(profile);
    await this.playerProfileRepository.save(profile);
    return this.getPlayerProfile(userId);
  }

  async updateCareerTimelineItem(
    userId: string,
    timelineId: string,
    dto: UpdateCareerTimelineDto,
  ): Promise<PlayerProfileResponseDto> {
    const profile = await this.getOwnedPlayerProfile(userId);
    const item = await this.careerTimelineRepository.findOne({
      where: { id: timelineId },
    });
    if (!item) {
      throw new NotFoundException('Career timeline item not found');
    }
    if (item.playerId !== userId) {
      throw new ForbiddenException('You can only edit your own timeline');
    }

    if (dto.title !== undefined) item.title = dto.title.trim();
    if (dto.description !== undefined)
      item.description = dto.description?.trim() || undefined;
    if (dto.startDate !== undefined) item.startDate = new Date(dto.startDate);
    if (dto.isCurrent !== undefined) item.isCurrent = dto.isCurrent;
    if (dto.endDate !== undefined)
      item.endDate = item.isCurrent
        ? undefined
        : dto.endDate
          ? new Date(dto.endDate)
          : undefined;
    if (item.isCurrent) item.endDate = undefined;
    if (dto.evidenceUrl !== undefined)
      item.evidenceUrl = dto.evidenceUrl?.trim() || undefined;

    await this.careerTimelineRepository.save(item);
    profile.profileCompleteness =
      await this.calculatePlayerCompleteness(profile);
    await this.playerProfileRepository.save(profile);
    return this.getPlayerProfile(userId);
  }

  async deleteCareerTimelineItem(
    userId: string,
    timelineId: string,
  ): Promise<PlayerProfileResponseDto> {
    const profile = await this.getOwnedPlayerProfile(userId);
    const item = await this.careerTimelineRepository.findOne({
      where: { id: timelineId },
    });
    if (!item) {
      throw new NotFoundException('Career timeline item not found');
    }
    if (item.playerId !== userId) {
      throw new ForbiddenException('You can only delete your own timeline');
    }

    await this.careerTimelineRepository.remove(item);
    profile.profileCompleteness =
      await this.calculatePlayerCompleteness(profile);
    await this.playerProfileRepository.save(profile);
    return this.getPlayerProfile(userId);
  }

  async createAchievement(
    userId: string,
    dto: CreateAchievementDto,
  ): Promise<PlayerProfileResponseDto> {
    await this.getOwnedPlayerProfile(userId);
    const achievement = this.achievementRepository.create({
      playerId: userId,
      title: dto.title.trim(),
      description: dto.description.trim(),
      year: dto.year,
      competitionLevel: dto.competitionLevel,
      evidenceUrl: dto.evidenceUrl?.trim() || undefined,
      verified: false,
    });

    await this.achievementRepository.save(achievement);
    return this.getPlayerProfile(userId);
  }

  async updateAchievement(
    userId: string,
    achievementId: string,
    dto: UpdateAchievementDto,
  ): Promise<PlayerProfileResponseDto> {
    await this.getOwnedPlayerProfile(userId);
    const achievement = await this.achievementRepository.findOne({
      where: { id: achievementId },
    });
    if (!achievement) {
      throw new NotFoundException('Achievement not found');
    }
    if (achievement.playerId !== userId) {
      throw new ForbiddenException('You can only edit your own achievements');
    }

    if (dto.title !== undefined) achievement.title = dto.title.trim();
    if (dto.description !== undefined)
      achievement.description = dto.description.trim();
    if (dto.year !== undefined) achievement.year = dto.year;
    if (dto.competitionLevel !== undefined)
      achievement.competitionLevel = dto.competitionLevel;
    if (dto.evidenceUrl !== undefined)
      achievement.evidenceUrl = dto.evidenceUrl?.trim() || undefined;
    achievement.verified = false;

    await this.achievementRepository.save(achievement);
    return this.getPlayerProfile(userId);
  }

  async deleteAchievement(
    userId: string,
    achievementId: string,
  ): Promise<PlayerProfileResponseDto> {
    await this.getOwnedPlayerProfile(userId);
    const achievement = await this.achievementRepository.findOne({
      where: { id: achievementId },
    });
    if (!achievement) {
      throw new NotFoundException('Achievement not found');
    }
    if (achievement.playerId !== userId) {
      throw new ForbiddenException('You can only delete your own achievements');
    }

    await this.achievementRepository.remove(achievement);
    return this.getPlayerProfile(userId);
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
    profile.profileCompleteness = this.calculateScoutCompleteness(profile);
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

    const filter: Record<string, unknown> = {};
    if (query.position) filter.position = query.position;
    if (query.country) filter.country = ILike(`%${query.country}%`);
    if (query.city) filter.city = ILike(`%${query.city}%`);
    if (query.availabilityStatus)
      filter.availabilityStatus = query.availabilityStatus;

    const paginated = await this.playerDiscoveryRepository.paginate({
      filter: filter,
      order: { aiScore: 'DESC', totalViews: 'DESC' },
      page,
      limit,
    });

    const extras = await this.loadPlayerExtras(
      paginated.documents.map(player => player.userId),
    );
    const data = paginated.documents.map(p =>
      this.toPlayerProfileResponse(p, extras.get(p.userId)),
    );
    return {
      data,
      total: paginated.count,
      page,
      limit,
      totalPages: paginated.pages || 1,
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

    const filter: Record<string, unknown> = {};
    if (query.organizationType)
      filter.organizationType = query.organizationType;
    if (query.country) {
      filter.countriesCovered = Raw(alias => `${alias} ILIKE :country`, {
        country: `%${query.country}%`,
      });
    }

    const paginated = await this.scoutDiscoveryRepository.paginate({
      filter: filter,
      order: { profileCompleteness: 'DESC', createdAt: 'DESC' },
      page,
      limit,
    });

    const data = paginated.documents.map(s => this.toScoutProfileResponse(s));
    return {
      data,
      total: paginated.count,
      page,
      limit,
      totalPages: paginated.pages || 1,
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

  async unblockUser(
    blockerId: string,
    blockedId: string,
  ): Promise<{ message: string }> {
    const result = await this.blockRepository.delete({ blockerId, blockedId });
    if (!result.affected) {
      throw new NotFoundException('Block not found');
    }
    return { message: 'User unblocked' };
  }

  async unmuteUser(
    muterId: string,
    mutedId: string,
  ): Promise<{ message: string }> {
    const result = await this.muteRepository.delete({ muterId, mutedId });
    if (!result.affected) {
      throw new NotFoundException('Mute not found');
    }
    return { message: 'User unmuted' };
  }

  async createScoutNote(
    scoutUserId: string,
    dto: CreateScoutNoteDto,
  ): Promise<ScoutNotes> {
    const scoutProfile = await this.scoutProfileRepository.findOne({
      where: { userId: scoutUserId },
    });
    if (!scoutProfile) {
      throw new ForbiddenException('Only scouts can create notes');
    }
    const playerProfile = await this.playerProfileRepository.findOne({
      where: { userId: dto.playerId },
    });
    if (!playerProfile) {
      throw new NotFoundException('Player not found');
    }

    const note = this.scoutNotesRepository.create({
      scoutId: scoutUserId,
      playerId: dto.playerId,
      title: dto.title,
      content: dto.content,
      isPrivate: dto.isPrivate ?? true,
    });
    const saved = await this.scoutNotesRepository.save(note);

    // Increment total notes count
    await this.scoutProfileRepository.increment(
      { userId: scoutUserId },
      'totalNotes',
      1,
    );

    return saved;
  }

  async updateScoutNote(
    noteId: string,
    scoutUserId: string,
    dto: UpdateScoutNoteDto,
  ): Promise<ScoutNotes> {
    const note = await this.scoutNotesRepository.findOne({
      where: { id: noteId },
    });
    if (!note) {
      throw new NotFoundException('Note not found');
    }
    if (note.scoutId !== scoutUserId) {
      throw new ForbiddenException('You can only edit your own notes');
    }

    if (dto.title !== undefined) note.title = dto.title;
    if (dto.content !== undefined) note.content = dto.content;
    if (dto.isPrivate !== undefined) note.isPrivate = dto.isPrivate;

    return this.scoutNotesRepository.save(note);
  }

  async deleteScoutNote(
    noteId: string,
    scoutUserId: string,
  ): Promise<{ message: string }> {
    const note = await this.scoutNotesRepository.findOne({
      where: { id: noteId },
    });
    if (!note) {
      throw new NotFoundException('Note not found');
    }
    if (note.scoutId !== scoutUserId) {
      throw new ForbiddenException('You can only delete your own notes');
    }

    await this.scoutNotesRepository.remove(note);

    // Decrement total notes count
    await this.scoutProfileRepository.decrement(
      { userId: scoutUserId },
      'totalNotes',
      1,
    );

    return { message: 'Note deleted' };
  }

  async getScoutNotes(
    scoutUserId: string,
    playerId?: string,
    page = 1,
    limit = 20,
  ): Promise<{
    data: ScoutNotes[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const where: Record<string, string> = { scoutId: scoutUserId };
    if (playerId) {
      where.playerId = playerId;
    }

    const [data, total] = await this.scoutNotesRepository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async getScoutNote(noteId: string, scoutUserId: string): Promise<ScoutNotes> {
    const note = await this.scoutNotesRepository.findOne({
      where: { id: noteId },
    });
    if (!note) {
      throw new NotFoundException('Note not found');
    }
    if (note.scoutId !== scoutUserId) {
      throw new ForbiddenException('You can only view your own notes');
    }
    return note;
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
    extras?: {
      stats: PlayerStats[];
      careerTimeline: CareerTimeline[];
      achievements: Achievement[];
    },
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
      cover_image_url: (profile.coverImageUrl as string | null) ?? null,
      is_verified: profile.isVerified,
      basic_verified_at: profile.basicVerifiedAt?.toISOString() ?? null,
      club_verified_at: profile.clubVerifiedAt?.toISOString() ?? null,
      performance_verified_at:
        profile.performanceVerifiedAt?.toISOString() ?? null,
      availability_status: profile.availabilityStatus ?? null,
      club_name: profile.clubName ?? null,
      preferred_foot: profile.preferredFoot ?? null,
      ai_score: profile.aiScore != null ? Number(profile.aiScore) : 0,
      skill_scores: profile.skillScores ?? {},
      total_posts: profile.totalPosts,
      total_likes: profile.totalLikes,
      total_views: profile.totalViews,
      is_featured: profile.isFeatured,
      featured_until: profile.featuredUntil?.toISOString() ?? null,
      profile_completeness:
        profile.profileCompleteness != null
          ? Number(profile.profileCompleteness)
          : 0,
      stats: (extras?.stats ?? []).map(stats => ({
        id: stats.id,
        player_id: stats.playerId,
        season_year: stats.seasonYear,
        goals: stats.goals,
        assists: stats.assists,
        matches_played: stats.matchesPlayed,
        yellow_cards: stats.yellowCards,
        red_cards: stats.redCards,
        clean_sheets: stats.cleanSheets,
        avg_rating: stats.avgRating != null ? Number(stats.avgRating) : null,
        created_at: stats.createdAt.toISOString(),
        updated_at: stats.updatedAt.toISOString(),
      })),
      career_timeline: (extras?.careerTimeline ?? []).map(item => ({
        id: item.id,
        player_id: item.playerId,
        title: item.title,
        description: item.description ?? null,
        start_date:
          item.startDate instanceof Date
            ? item.startDate.toISOString().slice(0, 10)
            : String(item.startDate),
        end_date:
          item.endDate == null
            ? null
            : item.endDate instanceof Date
              ? item.endDate.toISOString().slice(0, 10)
              : String(item.endDate),
        is_current: item.isCurrent,
        evidence_url: item.evidenceUrl ?? null,
        created_at: item.createdAt.toISOString(),
        updated_at: item.updatedAt.toISOString(),
      })),
      achievements: (extras?.achievements ?? []).map(achievement => ({
        id: achievement.id,
        player_id: achievement.playerId,
        title: achievement.title,
        description: achievement.description,
        year: achievement.year,
        competition_level: achievement.competitionLevel,
        verified: achievement.verified,
        evidence_url: achievement.evidenceUrl ?? null,
        created_at: achievement.createdAt.toISOString(),
        updated_at: achievement.updatedAt.toISOString(),
      })),
      created_at: profile.createdAt.toISOString(),
      updated_at: profile.updatedAt.toISOString(),
    };
  }

  private async loadPlayerExtras(userIds: string[]): Promise<
    Map<
      string,
      {
        stats: PlayerStats[];
        careerTimeline: CareerTimeline[];
        achievements: Achievement[];
      }
    >
  > {
    const uniqueIds = Array.from(new Set(userIds.filter(Boolean)));
    const extras = new Map<
      string,
      {
        stats: PlayerStats[];
        careerTimeline: CareerTimeline[];
        achievements: Achievement[];
      }
    >();

    for (const id of uniqueIds) {
      extras.set(id, { stats: [], careerTimeline: [], achievements: [] });
    }

    if (uniqueIds.length === 0) {
      return extras;
    }

    const [statsRows, timelineRows, achievementRows] = await Promise.all([
      this.playerStatsRepository.find({
        where: { playerId: In(uniqueIds) },
        order: { seasonYear: 'DESC', createdAt: 'DESC' },
      }),
      this.careerTimelineRepository.find({
        where: { playerId: In(uniqueIds) },
        order: { startDate: 'DESC', createdAt: 'DESC' },
      }),
      this.achievementRepository.find({
        where: { playerId: In(uniqueIds) },
        order: { year: 'DESC', createdAt: 'DESC' },
      }),
    ]);

    for (const stats of statsRows) {
      extras.get(stats.playerId)?.stats.push(stats);
    }
    for (const item of timelineRows) {
      extras.get(item.playerId)?.careerTimeline.push(item);
    }
    for (const achievement of achievementRows) {
      extras.get(achievement.playerId)?.achievements.push(achievement);
    }

    return extras;
  }

  private calculateAiScoreFromSkills(scores: Record<string, number>): number {
    const values = Object.values(scores)
      .map(v => Number(v))
      .filter(v => Number.isFinite(v) && v >= 0);
    if (values.length === 0) return 0;
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    return Math.max(0, Math.min(99, Math.round(avg * 100) / 100));
  }

  private async getOwnedPlayerProfile(userId: string): Promise<PlayerProfile> {
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
    return profile;
  }

  private toScoutProfileResponse(
    profile: ScoutProfile,
  ): ScoutProfileResponseDto {
    return {
      id: profile.userId,
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
      cover_image_url: (profile.coverImageUrl as string | null) ?? null,
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

  /**
   * Calculates player profile completeness as a percentage (0–100).
   * Checks the most important fields a player should fill out.
   */
  private async calculatePlayerCompleteness(
    profile: PlayerProfile,
  ): Promise<number> {
    const userId = profile.userId;
    const expectedSkillKeys =
      profile.position?.toLowerCase() === 'goalkeeper'
        ? ['diving', 'reflexes', 'handling', 'speed', 'kicking', 'positioning']
        : ['pace', 'dribbling', 'shooting', 'defending', 'passing', 'physical'];

    const [careerTimelineCount, postCount, videoCount, analyzedCount] =
      await Promise.all([
        this.careerTimelineRepository.count({ where: { playerId: userId } }),
        this.postRepository.count({ where: { userId } }),
        this.videoRepository
          .createQueryBuilder('video')
          .innerJoin('video.attachment', 'attachment')
          .innerJoin('attachment.post', 'post')
          .where('post.user_id = :userId', { userId })
          .getCount(),
        this.videoSkillAnalysisRepository
          .createQueryBuilder('analysis')
          .innerJoin('analysis.video', 'video')
          .innerJoin('video.attachment', 'attachment')
          .innerJoin('attachment.post', 'post')
          .where('post.user_id = :userId', { userId })
          .andWhere('analysis.status = :status', { status: 'completed' })
          .andWhere("jsonb_typeof(analysis.ai_score) = 'object'")
          .andWhere("analysis.ai_score <> '{}'::jsonb")
          .getCount(),
      ]);

    const latestSkillAnalysis = await this.videoSkillAnalysisRepository
      .createQueryBuilder('analysis')
      .innerJoin('analysis.video', 'video')
      .innerJoin('video.attachment', 'attachment')
      .innerJoin('attachment.post', 'post')
      .where('post.user_id = :userId', { userId })
      .andWhere('analysis.status = :status', { status: 'completed' })
      .andWhere("jsonb_typeof(analysis.ai_score) = 'object'")
      .andWhere("analysis.ai_score <> '{}'::jsonb")
      .orderBy('analysis.processed_at', 'DESC')
      .addOrderBy('analysis.updated_at', 'DESC')
      .getOne();

    const latestAiScore = latestSkillAnalysis?.aiScore ?? {};
    const hasAllSkillScores = expectedSkillKeys.every(
      key =>
        typeof latestAiScore[key] === 'number' &&
        Number(latestAiScore[key]) > 0,
    );

    const fields: boolean[] = [
      !!profile.fullName,
      !!profile.dateOfBirth,
      !!profile.nationality,
      !!profile.position,
      !!profile.preferredFoot,
      profile.heightCm != null && profile.heightCm > 0,
      profile.weightKg != null && profile.weightKg > 0,
      !!profile.city,
      !!profile.country,
      !!profile.bio,
      !!profile.profilePictureUrl,
      !!profile.coverImageUrl,
      !!profile.clubName,
      !!profile.availabilityStatus,
      profile.aiScore != null && Number(profile.aiScore) > 0,
      careerTimelineCount > 0,
      postCount > 0,
      videoCount > 0,
      analyzedCount > 0,
      hasAllSkillScores,
    ];
    const filled = fields.filter(Boolean).length;
    return Math.round((filled / fields.length) * 100);
  }

  /**
   * Calculates scout profile completeness as a percentage (0–100).
   */
  private calculateScoutCompleteness(profile: ScoutProfile): number {
    const fields: boolean[] = [
      !!profile.fullName,
      !!profile.organization,
      !!profile.organizationType,
      !!profile.licenseNumber,
      profile.yearsExperience != null && profile.yearsExperience > 0,
      (profile.scoutingPositions?.length ?? 0) > 0,
      (profile.countriesCovered?.length ?? 0) > 0,
      !!profile.bio,
      !!profile.profilePictureUrl,
      !!profile.coverImageUrl,
    ];
    const filled = fields.filter(Boolean).length;
    return Math.round((filled / fields.length) * 100);
  }
}
