import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

import { AiConfig } from '@/config';
import { Block, Mute, PlayerProfile } from '@/database/entities';

interface RecommendationItem {
  player_id: string;
  score: number;
  full_name?: string;
  position?: string | null;
  club_name?: string | null;
  profile_picture_url?: string | null;
  ai_score?: number | null;
  is_verified?: boolean | null;
}

interface RecommendationResponse {
  scout_id: string;
  generated_at?: string;
  data_source?: string;
  recommendations: RecommendationItem[];
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
        'AI recommendation service URL is not set',
      );
    }

    const limit = Math.min(Math.max(Math.round(k), 1), 50);
    const response = await fetch(
      `${baseUrl}/api/scouts/${encodeURIComponent(scoutId)}/recommendations?k=${limit}`,
      { signal: AbortSignal.timeout(this.aiConfig.timeoutMs) },
    );

    if (!response.ok) {
      throw new ServiceUnavailableException(
        `Recommendation service failed with HTTP ${response.status}`,
      );
    }

    const payload = (await response.json()) as RecommendationResponse;
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
      scout_id: String(payload.scout_id ?? scoutId),
      generated_at: payload.generated_at,
      data_source: payload.data_source,
      recommendations,
    };
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
}
