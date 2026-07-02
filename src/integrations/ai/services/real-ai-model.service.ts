import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import {
  AiServiceError,
  normalizeAiError,
  normalizeAiHttpError,
  toAiServiceError,
} from '../ai-error-normalizer';
import { IAiModelService, SkillAnalysisInput, SkillAnalysisOutput } from '.';

import {
  AnalysisType,
  GoalkeeperSkill,
  ModerationResult,
  OutfieldSkill,
} from '@/common/enums';
import type { ModerationAnalysis } from '@/common/types';
import { AiConfig } from '@/config';
import { PlayerProfileRepository } from '@/database/repositories';

const DEFAULT_HEIGHT_CM = 175;

/** Legacy multipart adapter. New skill submissions should use SkillScoringService. */
@Injectable()
export class RealAiModelService implements IAiModelService {
  private readonly logger = new Logger(RealAiModelService.name);
  private readonly skillBaseUrl: string;
  private readonly moderationBaseUrl: string;
  private readonly apiKey: string;
  private readonly timeoutMs: number;

  constructor(
    configService: ConfigService,
    private readonly playerProfileRepository: PlayerProfileRepository,
  ) {
    const aiConfig = configService.getOrThrow<AiConfig>('ai');
    this.skillBaseUrl = (
      aiConfig.skillServiceUrl ||
      aiConfig.apiUrl ||
      ''
    ).replace(/\/$/, '');
    this.moderationBaseUrl = (
      aiConfig.moderationServiceUrl ||
      aiConfig.apiUrl ||
      ''
    ).replace(/\/$/, '');
    this.apiKey = aiConfig.apiKey || '';
    this.timeoutMs = aiConfig.timeoutMs;
  }

  async analyzeSkill(input: SkillAnalysisInput): Promise<SkillAnalysisOutput> {
    this.logger.log(
      `Analyzing skill: ${input.skill} for video ${input.videoUrl}`,
    );

    if (input.analysisType === AnalysisType.GOALKEEPER) {
      return this.unsupportedSkill(input.skill);
    }

    if (input.skill === OutfieldSkill.DEFENDING) {
      return this.unsupportedSkill(input.skill);
    }

    const heightCm = await this.resolveHeightCm(input.playerId);
    const blob = await this.fetchVideoBlob(input.videoUrl);

    switch (input.skill) {
      case OutfieldSkill.PACE:
        return this.mapPace(
          (await this.postMultipart('/api/pace/analyze', () => {
            const fd = new FormData();
            fd.append('video', blob, 'pace.mp4');
            fd.append('user_height_cm', String(heightCm));
            return fd;
          })) as PaceResponse,
        );
      case OutfieldSkill.PASSING:
        return this.mapPassing(
          (await this.postMultipart('/api/passing/analyze', () => {
            const fd = new FormData();
            fd.append('video', blob, 'passing.mp4');
            return fd;
          })) as PassingResponse,
        );
      case OutfieldSkill.DRIBBLING:
        return this.unsupportedSkill(input.skill);
      case OutfieldSkill.SHOOTING:
        return this.mapShooting(
          (await this.postMultipart('/api/shooting/analyze', () => {
            const fd = new FormData();
            fd.append('video', blob, 'shooting.mp4');
            return fd;
          })) as ShootingResponse,
        );
      case OutfieldSkill.PHYSICAL:
        return this.mapPhysicalAgility(
          (await this.postMultipart('/api/physical/agility', () => {
            const fd = new FormData();
            fd.append('video', blob, 'physical.mp4');
            return fd;
          })) as AgilityResponse,
        );
      default:
        return this.unsupportedSkill(input.skill);
    }
  }

  async moderateVideo(videoUrl: string): Promise<ModerationAnalysis> {
    this.logger.log(`Moderating video: ${videoUrl}`);
    const data = (await this.postJson(
      this.moderationBaseUrl,
      '/moderate-video',
      { video_url: videoUrl },
      'AI_MODERATION_SERVICE_URL must be set when USE_MOCK_AI=false',
    )) as Record<string, unknown>;

    return this.mapModerationJson(data);
  }

  private async resolveHeightCm(playerId?: string): Promise<number> {
    if (!playerId) {
      return DEFAULT_HEIGHT_CM;
    }
    const profile = await this.playerProfileRepository.findByUserId(playerId);
    const h = profile?.heightCm != null ? Number(profile.heightCm) : Number.NaN;
    if (Number.isFinite(h) && h > 0) {
      return h;
    }
    return DEFAULT_HEIGHT_CM;
  }

  private async fetchVideoBlob(videoUrl: string): Promise<Blob> {
    let res: Response;
    try {
      res = await fetch(videoUrl, {
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (error) {
      throw new AiServiceError(
        normalizeAiError(error, {
          operation: 'media',
        }),
      );
    }
    if (!res.ok) {
      throw toAiServiceError(
        'AI_MEDIA_INVALID',
        { operation: 'media' },
        {
          developerMessage: `Failed to download video for AI: HTTP ${res.status}`,
          statusCode: res.status,
        },
      );
    }
    return res.blob();
  }

  private async postMultipart(
    path: string,
    buildForm: () => FormData,
  ): Promise<unknown> {
    if (!this.skillBaseUrl || !this.apiKey) {
      throw toAiServiceError(
        'AI_SERVICE_UNAVAILABLE',
        { serviceName: 'ai-skills', operation: 'scoring' },
        {
          developerMessage:
            'AI_SKILL_SERVICE_URL and AI_MODEL_API_KEY must be set when USE_MOCK_AI=false',
        },
      );
    }
    const url = `${this.skillBaseUrl}${path}`;
    let res: Response;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${this.apiKey}` },
        body: buildForm(),
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (error) {
      throw new AiServiceError(
        normalizeAiError(error, {
          serviceName: 'ai-skills',
          operation: 'scoring',
        }),
      );
    }

    if (!res.ok) {
      throw new AiServiceError(
        normalizeAiHttpError(res.status, await this.readAiResponseBody(res), {
          serviceName: 'ai-skills',
          operation: 'scoring',
        }),
      );
    }

    return res.json() as Promise<unknown>;
  }

  private async postJson(
    baseUrl: string,
    path: string,
    body: Record<string, unknown>,
    missingConfigMessage: string,
  ): Promise<unknown> {
    if (!baseUrl) {
      throw toAiServiceError(
        'AI_SERVICE_UNAVAILABLE',
        { serviceName: 'ai-moderation', operation: 'moderation' },
        { developerMessage: missingConfigMessage },
      );
    }

    const url = `${baseUrl}${path}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.apiKey) {
      headers.Authorization = `Bearer ${this.apiKey}`;
    }

    let res: Response;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (error) {
      throw new AiServiceError(
        normalizeAiError(error, {
          serviceName: 'ai-moderation',
          operation: 'moderation',
        }),
      );
    }

    if (!res.ok) {
      throw new AiServiceError(
        normalizeAiHttpError(res.status, await this.readAiResponseBody(res), {
          serviceName: 'ai-moderation',
          operation: 'moderation',
        }),
      );
    }

    return res.json() as Promise<unknown>;
  }

  private async readAiResponseBody(res: Response): Promise<unknown> {
    const text = await res.text();
    if (!text) return {};
    try {
      return JSON.parse(text) as unknown;
    } catch {
      return { message: text };
    }
  }

  private mapPace(data: PaceResponse): SkillAnalysisOutput {
    const kmh = Number(data.average_speed_kmh ?? 0);
    const score = Math.min(99, Math.max(0, Math.round(28 + kmh * 2.4)));
    return {
      score,
      confidence: 0.85,
      keyMoments: [{ timestamp: 0, action: 'pace', score }],
      attributes: {
        average_speed_kmh: kmh,
        total_distance_covered: Number(data.total_distance_covered ?? 0),
      },
    };
  }

  private mapPassing(data: PassingResponse): SkillAnalysisOutput {
    const avg = Number(data.average_score ?? 0);
    const score = Math.min(99, Math.max(0, Math.round(avg * 99)));
    return {
      score,
      confidence: 0.85,
      keyMoments: [{ timestamp: 0, action: 'passing', score }],
      attributes: {
        completed_passes: Number(data.completed_passes ?? 0),
        average_score: avg,
      },
    };
  }

  private mapDribbling(data: DribblingResponse): SkillAnalysisOutput {
    const raw = Number(data.dribbling_score ?? 0);
    const score = Math.min(99, Math.max(0, Math.round(raw)));
    const br = data.score_breakdown as
      | {
          speed_score?: number;
          accuracy_score?: number;
          agility_score?: number;
        }
      | undefined;
    const sl = data.slalom as { passes?: number } | undefined;
    const f8 = data.figure8 as { figure8_count?: number } | undefined;
    return {
      score,
      confidence: 0.85,
      keyMoments: [{ timestamp: 0, action: 'dribbling', score }],
      attributes: {
        dribbling_raw: raw,
        speed_score: Number(br?.speed_score ?? 0),
        accuracy_score: Number(br?.accuracy_score ?? 0),
        agility_score: Number(br?.agility_score ?? 0),
        slalom_passes: Number(sl?.passes ?? 0),
        figure8_count: Number(f8?.figure8_count ?? 0),
      },
    };
  }

  private mapShooting(data: ShootingResponse): SkillAnalysisOutput {
    const raw = Number(data.quality_score ?? data.score ?? 0);
    const score = Math.min(99, Math.max(0, Math.round(raw)));
    return {
      score,
      confidence: Number(data.tracking_confidence ?? 0),
      keyMoments: [{ timestamp: 0, action: 'shooting', score }],
      attributes: {
        quality_score: raw,
        shot_detected: data.shot_detected ? 1 : 0,
        peak_ball_speed_px_s: Number(data.peak_ball_speed_px_s ?? 0),
      },
    };
  }

  private mapPhysicalAgility(data: AgilityResponse): SkillAnalysisOutput {
    const reps = Number(data.reps ?? 0);
    const duration = Number(data.duration ?? 0);
    const score = Math.min(
      99,
      Math.max(0, Math.round(reps * 2.1 + duration * 0.4)),
    );
    return {
      score,
      confidence: 0.8,
      keyMoments: [{ timestamp: 0, action: 'physical_agility', score }],
      attributes: { reps, duration },
    };
  }

  private mapModerationJson(data: Record<string, unknown>): ModerationAnalysis {
    const verdictRaw = data.verdict ?? data.status ?? 'approved';
    const verdictStr =
      typeof verdictRaw === 'string' || typeof verdictRaw === 'number'
        ? String(verdictRaw).toLowerCase()
        : 'approved';
    let verdict = ModerationResult.APPROVED;
    if (verdictStr.includes('reject')) {
      verdict = ModerationResult.REJECTED;
    } else if (verdictStr.includes('flag')) {
      verdict = ModerationResult.FLAGGED;
    }

    return {
      verdict,
      confidence: Number(data.confidence ?? 0.88),
      isFootballRelated: Boolean(
        data.is_football_related ?? data.isFootballRelated ?? true,
      ),
      inappropriateContent: Boolean(
        data.inappropriate_content ?? data.inappropriateContent ?? false,
      ),
      flags: Array.isArray(data.flags) ? (data.flags as string[]) : [],
      details:
        typeof data.details === 'object' && data.details !== null
          ? data.details
          : {},
    };
  }

  private unsupportedSkill(
    skill: OutfieldSkill | GoalkeeperSkill,
  ): Promise<SkillAnalysisOutput> {
    return Promise.reject(
      new Error(`SKILL_NOT_SUPPORTED: ${skill} is not supported yet`),
    );
  }
}

type PaceResponse = {
  average_speed_kmh?: number;
  total_distance_covered?: number;
};

type PassingResponse = {
  completed_passes?: number;
  average_score?: number;
};

type DribblingResponse = {
  dribbling_score?: number;
  score_breakdown?: unknown;
  slalom?: unknown;
  figure8?: unknown;
};

type ShootingResponse = {
  score?: number;
  quality_score?: number;
  shot_detected?: boolean;
  tracking_confidence?: number;
  peak_ball_speed_px_s?: number;
};

type AgilityResponse = {
  reps?: number;
  duration?: number;
};
