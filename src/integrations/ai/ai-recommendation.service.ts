import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

import {
  aiErrorResponseBody,
  makeAiError,
  normalizeAiError,
  normalizeAiHttpError,
} from './ai-error-normalizer';

import { AiConfig } from '@/config';
import {
  Block,
  Bookmark,
  Chat,
  Connection,
  Like,
  Mute,
  PlayerProfile,
  Post,
  ScoutProfile,
  User,
} from '@/database/entities';

export interface RecommendationItem {
  player_id: string;
  score: number;
  full_name?: string;
  position?: string | null;
  club_name?: string | null;
  profile_picture_url?: string | null;
  ai_score?: number | null;
  is_verified?: boolean | null;
}

export interface RecommendationMetadata {
  personalized: boolean;
  fallback: boolean;
  reason?: string;
  data_source?: string;
  live_context?: boolean;
  candidate_count?: number;
  returned_count?: number;
  model_version?: string;
}

export interface RecommendationResponse {
  scout_id: string;
  generated_at?: string;
  data_source?: string;
  metadata: RecommendationMetadata;
  recommendations: RecommendationItem[];
}

interface RecommendationContextCandidate {
  playerId: string;
  position?: string | null;
  location?: string | null;
  age?: number | null;
  aiScore?: number | null;
  isVerified?: boolean | null;
  skillScores: Record<string, number>;
  postCount: number;
  videoCount: number;
  recentEngagementScore: number;
}

interface RecommendationContextPayload {
  viewer: {
    id: string;
    role?: string;
    positionPreferences: string[];
    location?: string | null;
    club?: string | null;
    verifiedOnly: boolean;
  };
  limit: number;
  exclude: {
    userIds: string[];
    postIds: string[];
    videoIds: string[];
  };
  signals: {
    likedPostIds: string[];
    bookmarkedPostIds: string[];
    viewedPostIds: string[];
    connectedUserIds: string[];
    chatUserIds: string[];
    recentlyViewedPlayerIds: string[];
  };
  candidates: RecommendationContextCandidate[];
}

interface ContextRecommendationResponse {
  viewer_id?: string;
  generated_at?: string;
  data_source?: string;
  model_version?: string;
  metadata?: Record<string, unknown>;
  recommendations?: RecommendationItem[];
}

@Injectable()
export class AiRecommendationService {
  private readonly aiConfig: AiConfig;

  constructor(
    configService: ConfigService,
    @InjectRepository(PlayerProfile)
    private readonly playerProfiles: Repository<PlayerProfile>,
    @InjectRepository(Block)
    private readonly blocks: Repository<Block>,
    @InjectRepository(Mute)
    private readonly mutes: Repository<Mute>,
    @InjectRepository(User)
    private readonly users: Repository<User>,
    @InjectRepository(ScoutProfile)
    private readonly scoutProfiles: Repository<ScoutProfile>,
    @InjectRepository(Post)
    private readonly posts: Repository<Post>,
    @InjectRepository(Like)
    private readonly likes: Repository<Like>,
    @InjectRepository(Bookmark)
    private readonly bookmarks: Repository<Bookmark>,
    @InjectRepository(Connection)
    private readonly connections: Repository<Connection>,
    @InjectRepository(Chat)
    private readonly chats: Repository<Chat>,
  ) {
    this.aiConfig = configService.getOrThrow<AiConfig>('ai');
  }

  async getScoutRecommendations(
    scoutId: string,
    k = 10,
  ): Promise<RecommendationResponse> {
    const baseUrl = this.aiConfig.recommendationServiceUrl?.replace(/\/+$/, '');
    if (!baseUrl) {
      throw new ServiceUnavailableException(
        aiErrorResponseBody(
          makeAiError(
            'AI_SERVICE_UNAVAILABLE',
            {
              serviceName: 'recommendation-system',
              operation: 'recommendation',
            },
            { developerMessage: 'AI recommendation service URL is not set' },
          ),
        ),
      );
    }

    const limit = Math.min(Math.max(Math.round(k), 1), 50);
    const contextPayload = await this.buildRecommendationContext(
      scoutId,
      limit,
    );
    if (contextPayload.candidates.length === 0) {
      return {
        scout_id: scoutId,
        generated_at: new Date().toISOString(),
        data_source: 'live_context',
        metadata: {
          personalized: false,
          fallback: false,
          reason: 'no_eligible_candidates',
          data_source: 'live_context',
          live_context: true,
          candidate_count: 0,
          returned_count: 0,
        },
        recommendations: [],
      };
    }

    let response: Response;
    try {
      response = await fetch(`${baseUrl}/api/recommendations/context`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(contextPayload),
        signal: AbortSignal.timeout(this.aiConfig.timeoutMs),
      });
    } catch (error) {
      const normalized = normalizeAiError(error, {
        serviceName: 'recommendation-system',
        operation: 'recommendation',
      });
      throw new ServiceUnavailableException(aiErrorResponseBody(normalized));
    }

    const responseBody = await this.readResponseBody(response);

    if (!response.ok) {
      throw new ServiceUnavailableException(
        aiErrorResponseBody(
          normalizeAiHttpError(response.status, responseBody, {
            serviceName: 'recommendation-system',
            operation: 'recommendation',
          }),
        ),
      );
    }

    const payload = responseBody as ContextRecommendationResponse;
    if (!payload || typeof payload !== 'object') {
      throw new ServiceUnavailableException(
        aiErrorResponseBody(
          makeAiError(
            'AI_RESULT_INVALID',
            {
              serviceName: 'recommendation-system',
              operation: 'recommendation',
            },
            {
              developerMessage:
                'Recommendation service returned a non-object payload',
            },
          ),
        ),
      );
    }
    const candidates = Array.isArray(payload.recommendations)
      ? payload.recommendations
          .map(item => ({
            player_id: String(item.player_id ?? ''),
            score: Number(item.score ?? 0),
          }))
          .filter(item => item.player_id && Number.isFinite(item.score))
      : [];
    const recommendations = await this.hydrateVisibleRecommendations(
      scoutId,
      candidates,
    );

    return {
      scout_id: scoutId,
      generated_at: payload.generated_at,
      data_source: payload.data_source,
      metadata: this.buildResponseMetadata(payload, recommendations.length),
      recommendations,
    };
  }

  async buildRecommendationContext(
    scoutId: string,
    limit: number,
  ): Promise<RecommendationContextPayload> {
    const [viewer, scoutProfile, hiddenUserIds, handledPlayerIds, signals] =
      await Promise.all([
        this.users.findOne({ where: { id: scoutId } }),
        this.scoutProfiles.findOne({ where: { userId: scoutId } }),
        this.getMutualHiddenUserIds(scoutId),
        this.getHandledPlayerIds(scoutId),
        this.getViewerSignals(scoutId),
      ]);

    const excludedUserIds = new Set<string>([
      scoutId,
      ...hiddenUserIds,
      ...handledPlayerIds,
    ]);
    const candidates = await this.buildCandidatePlayers(excludedUserIds);
    const location = this.normalizeStringList(scoutProfile?.countriesCovered);

    return {
      viewer: {
        id: scoutId,
        role: viewer?.role ?? 'scout',
        positionPreferences: this.normalizeStringList(
          scoutProfile?.scoutingPositions,
        ),
        location: location.length > 0 ? location.join(', ') : null,
        club: scoutProfile?.organization ?? null,
        verifiedOnly: false,
      },
      limit,
      exclude: {
        userIds: [...excludedUserIds],
        postIds: [...signals.likedPostIds, ...signals.bookmarkedPostIds],
        videoIds: [],
      },
      signals: {
        likedPostIds: signals.likedPostIds,
        bookmarkedPostIds: signals.bookmarkedPostIds,
        viewedPostIds: [],
        connectedUserIds: handledPlayerIds,
        chatUserIds: signals.chatUserIds,
        recentlyViewedPlayerIds: [],
      },
      candidates,
    };
  }

  private async readResponseBody(response: Response): Promise<unknown> {
    const mockableResponse = response as Response & {
      json?: () => Promise<unknown>;
      text?: () => Promise<string>;
    };
    if (typeof mockableResponse.text !== 'function') {
      if (typeof mockableResponse.json === 'function') {
        return mockableResponse.json();
      }
      return {};
    }
    const text = await mockableResponse.text();
    if (!text) return {};
    try {
      return JSON.parse(text) as unknown;
    } catch {
      if (response.ok) {
        throw new ServiceUnavailableException(
          aiErrorResponseBody(
            makeAiError(
              'AI_RESULT_INVALID',
              {
                serviceName: 'recommendation-system',
                operation: 'recommendation',
              },
              {
                developerMessage:
                  'Recommendation service returned non-JSON response',
              },
            ),
          ),
        );
      }
      return { message: text };
    }
  }

  private async hydrateVisibleRecommendations(
    scoutId: string,
    candidates: Pick<RecommendationItem, 'player_id' | 'score'>[],
  ): Promise<RecommendationItem[]> {
    const candidateIds = Array.from(
      new Set(
        candidates
          .map(candidate => candidate.player_id)
          .filter(playerId => playerId && playerId !== scoutId),
      ),
    );
    if (candidateIds.length === 0) return [];

    const [profiles, blocks, mutes] = await Promise.all([
      this.playerProfiles.find({
        where: { userId: In(candidateIds) },
        relations: ['user'],
      }),
      this.blocks.find({
        where: [
          { blockerId: scoutId, blockedId: In(candidateIds) },
          { blockerId: In(candidateIds), blockedId: scoutId },
        ],
      }),
      this.mutes.find({
        where: [
          { muterId: scoutId, mutedId: In(candidateIds) },
          { muterId: In(candidateIds), mutedId: scoutId },
        ],
      }),
    ]);

    const excludedIds = new Set<string>();
    for (const block of blocks) {
      excludedIds.add(
        block.blockerId === scoutId ? block.blockedId : block.blockerId,
      );
    }
    for (const mute of mutes) {
      excludedIds.add(mute.muterId === scoutId ? mute.mutedId : mute.muterId);
    }

    const profileById = new Map(
      profiles
        .filter(profile => {
          const user = profile.user;
          return (
            user?.role === 'player' &&
            user.status === 'active' &&
            !excludedIds.has(profile.userId)
          );
        })
        .map(profile => [profile.userId, profile]),
    );

    return candidates
      .map((candidate): RecommendationItem | null => {
        const profile = profileById.get(candidate.player_id);
        if (!profile) return null;
        return {
          player_id: profile.userId,
          score: candidate.score,
          full_name: profile.fullName,
          position: profile.position ?? null,
          club_name: profile.clubName ?? null,
          profile_picture_url: profile.profilePictureUrl ?? null,
          ai_score: profile.aiScore == null ? null : Number(profile.aiScore),
          is_verified: profile.isVerified,
        };
      })
      .filter((item): item is RecommendationItem => item !== null);
  }

  private buildResponseMetadata(
    payload: ContextRecommendationResponse,
    hydratedCount: number,
  ): RecommendationMetadata {
    const rawMetadata =
      payload.metadata && typeof payload.metadata === 'object'
        ? payload.metadata
        : {};
    return {
      personalized: rawMetadata.personalized !== false,
      fallback: rawMetadata.fallback === true,
      reason:
        typeof rawMetadata.reason === 'string' ? rawMetadata.reason : undefined,
      data_source: payload.data_source,
      live_context: rawMetadata.live_context === true,
      candidate_count:
        typeof rawMetadata.candidate_count === 'number'
          ? rawMetadata.candidate_count
          : undefined,
      returned_count: hydratedCount,
      model_version: payload.model_version,
    };
  }

  private async getMutualHiddenUserIds(userId: string): Promise<string[]> {
    const [blocks, mutes] = await Promise.all([
      this.blocks.find({
        where: [{ blockerId: userId }, { blockedId: userId }],
      }),
      this.mutes.find({
        where: [{ muterId: userId }, { mutedId: userId }],
      }),
    ]);

    const excluded = new Set<string>();
    for (const block of blocks) {
      excluded.add(
        block.blockerId === userId ? block.blockedId : block.blockerId,
      );
    }
    for (const mute of mutes) {
      excluded.add(mute.muterId === userId ? mute.mutedId : mute.muterId);
    }
    return [...excluded];
  }

  private async getHandledPlayerIds(scoutId: string): Promise<string[]> {
    const connections = await this.connections.find({
      where: { scoutId },
      select: ['playerId', 'status'],
    });
    return connections
      .filter(connection =>
        ['accepted', 'pending', 'rejected', 'blocked'].includes(
          connection.status,
        ),
      )
      .map(connection => connection.playerId);
  }

  private async getViewerSignals(userId: string): Promise<{
    likedPostIds: string[];
    bookmarkedPostIds: string[];
    chatUserIds: string[];
  }> {
    const [likes, bookmarks, chatUserIds] = await Promise.all([
      this.likes.find({
        where: { userId },
        select: ['postId'],
        order: { createdAt: 'DESC' },
        take: 100,
      }),
      this.bookmarks.find({
        where: { userId, bookmarkableType: 'post' },
        select: ['bookmarkableId'],
        order: { createdAt: 'DESC' },
        take: 100,
      }),
      this.getChatUserIds(userId),
    ]);

    return {
      likedPostIds: likes.map(like => like.postId),
      bookmarkedPostIds: bookmarks.map(bookmark => bookmark.bookmarkableId),
      chatUserIds,
    };
  }

  private async getChatUserIds(userId: string): Promise<string[]> {
    const rows = await this.chats
      .createQueryBuilder('chat')
      .leftJoin('chat.scout', 'scout')
      .leftJoin('chat.player', 'player')
      .select('scout.id', 'scoutId')
      .addSelect('player.id', 'playerId')
      .where('(scout.id = :userId OR player.id = :userId)', { userId })
      .andWhere('chat.status IN (:...statuses)', {
        statuses: ['pending', 'active'],
      })
      .getRawMany<{ scoutId?: string; playerId?: string }>();

    return rows
      .map(row => (row.scoutId === userId ? row.playerId : row.scoutId))
      .filter((id): id is string => Boolean(id && id !== userId));
  }

  private async buildCandidatePlayers(
    excludedUserIds: Set<string>,
  ): Promise<RecommendationContextCandidate[]> {
    const qb = this.playerProfiles
      .createQueryBuilder('profile')
      .innerJoinAndSelect('profile.user', 'user')
      .where('user.role = :role', { role: 'player' })
      .andWhere('user.status = :status', { status: 'active' })
      .orderBy('profile.aiScore', 'DESC', 'NULLS LAST')
      .addOrderBy('profile.updatedAt', 'DESC')
      .take(250);

    const excluded = [...excludedUserIds];
    if (excluded.length > 0) {
      qb.andWhere('profile.userId NOT IN (:...excluded)', { excluded });
    }

    const profiles = await qb.getMany();
    const userIds = profiles.map(profile => profile.userId);
    const aggregates = await this.getCandidatePostAggregates(userIds);

    return profiles.map(profile => {
      const aggregate = aggregates.get(profile.userId);
      const location = [profile.city, profile.country]
        .map(value => value?.trim())
        .filter(Boolean)
        .join(', ');
      const postCount = aggregate?.postCount ?? profile.totalPosts ?? 0;
      return {
        playerId: profile.userId,
        position: profile.position ?? null,
        location: location || null,
        age: this.calculateAge(profile.dateOfBirth),
        aiScore: profile.aiScore == null ? null : Number(profile.aiScore),
        isVerified: profile.isVerified,
        skillScores: this.normalizeSkillScores(profile.skillScores),
        postCount,
        videoCount: aggregate?.videoCount ?? 0,
        recentEngagementScore:
          aggregate?.recentEngagementScore ??
          Number(profile.totalLikes ?? 0) +
            Number(profile.totalViews ?? 0) / 10,
      };
    });
  }

  private async getCandidatePostAggregates(
    userIds: string[],
  ): Promise<
    Map<
      string,
      { postCount: number; videoCount: number; recentEngagementScore: number }
    >
  > {
    if (userIds.length === 0) return new Map();

    const rows = await this.posts
      .createQueryBuilder('post')
      .leftJoin('post.attachments', 'attachment')
      .select('post.userId', 'userId')
      .addSelect('COUNT(DISTINCT post.id)', 'postCount')
      .addSelect(
        "COUNT(DISTINCT CASE WHEN attachment.content_type = 'video' THEN attachment.id END)",
        'videoCount',
      )
      .addSelect(
        'COALESCE(SUM(post.engagement_score + post.likes_count + post.comments_count + post.shares_count + (post.views_count * 0.2)), 0)',
        'recentEngagementScore',
      )
      .where('post.userId IN (:...userIds)', { userIds })
      .andWhere('post.visibility = :visibility', { visibility: 'public' })
      .groupBy('post.userId')
      .getRawMany<{
        userId?: string;
        postCount?: string | number;
        videoCount?: string | number;
        recentEngagementScore?: string | number;
      }>();

    return new Map(
      rows
        .map(row => {
          const userId = String(row.userId ?? '').trim();
          if (!userId) return null;
          return [
            userId,
            {
              postCount: this.toFiniteNumber(row.postCount),
              videoCount: this.toFiniteNumber(row.videoCount),
              recentEngagementScore: this.toFiniteNumber(
                row.recentEngagementScore,
              ),
            },
          ] as const;
        })
        .filter(
          (
            row,
          ): row is readonly [
            string,
            {
              postCount: number;
              videoCount: number;
              recentEngagementScore: number;
            },
          ] => row !== null,
        ),
    );
  }

  private normalizeStringList(
    value: string[] | string | null | undefined,
  ): string[] {
    if (!value) return [];
    const rawValues = Array.isArray(value) ? value : String(value).split(',');
    return rawValues.map(item => item.trim()).filter(Boolean);
  }

  private normalizeSkillScores(value: unknown): Record<string, number> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .map(([key, rawValue]) => [key, this.toFiniteNumber(rawValue)] as const)
        .filter(([, rawValue]) => rawValue > 0),
    );
  }

  private calculateAge(value: Date | string | null | undefined): number | null {
    if (!value) return null;
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    const now = new Date();
    let age = now.getFullYear() - date.getFullYear();
    const hadBirthday =
      now.getMonth() > date.getMonth() ||
      (now.getMonth() === date.getMonth() && now.getDate() >= date.getDate());
    if (!hadBirthday) age -= 1;
    return age >= 0 ? age : null;
  }

  private toFiniteNumber(value: unknown): number {
    const numeric = Number(value ?? 0);
    return Number.isFinite(numeric) ? numeric : 0;
  }
}
