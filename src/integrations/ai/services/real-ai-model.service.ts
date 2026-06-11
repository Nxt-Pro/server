import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

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

/** NxtPro AI Integration Guide v1.3 — multipart endpoints; shooting/defending/GK use moderation + heuristic. */
@Injectable()
export class RealAiModelService implements IAiModelService {
  private readonly logger = new Logger(RealAiModelService.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly timeoutMs: number;

  constructor(
    configService: ConfigService,
    private readonly playerProfileRepository: PlayerProfileRepository,
  ) {
    const aiConfig = configService.getOrThrow<AiConfig>('ai');
    this.baseUrl = (aiConfig.apiUrl || '').replace(/\/$/, '');
    this.apiKey = aiConfig.apiKey || '';
    this.timeoutMs = Number(process.env.AI_MODEL_TIMEOUT_MS ?? '120000');
  }

  async analyzeSkill(input: SkillAnalysisInput): Promise<SkillAnalysisOutput> {
    this.logger.log(
      `Analyzing skill: ${input.skill} for video ${input.videoUrl}`,
    );

    if (input.analysisType === AnalysisType.GOALKEEPER) {
      return this.analyzeWithModerationFallback(
        input.videoUrl,
        input.skill as GoalkeeperSkill,
      );
    }

    if (
      input.skill === OutfieldSkill.SHOOTING ||
      input.skill === OutfieldSkill.DEFENDING
    ) {
      return this.analyzeWithModerationFallback(input.videoUrl, input.skill);
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
        return this.mapDribbling(
          (await this.postMultipart('/api/dribbling/analyze', () => {
            const fd = new FormData();
            fd.append('video', blob, 'dribbling.mp4');
            return fd;
          })) as DribblingResponse,
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
        return this.analyzeWithModerationFallback(input.videoUrl, input.skill);
    }
  }

  async moderateVideo(videoUrl: string): Promise<ModerationAnalysis> {
    this.logger.log(`Moderating video: ${videoUrl}`);
    const blob = await this.fetchVideoBlob(videoUrl);
    const data = (await this.postMultipart('/moderate-video', () => {
      const fd = new FormData();
      fd.append('video', blob, 'moderation.mp4');
      return fd;
    })) as Record<string, unknown>;

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
    const res = await fetch(videoUrl, {
      signal: AbortSignal.timeout(this.timeoutMs),
    });
    if (!res.ok) {
      throw new Error(`Failed to download video for AI: HTTP ${res.status}`);
    }
    return res.blob();
  }

  private async postMultipart(
    path: string,
    buildForm: () => FormData,
  ): Promise<unknown> {
    if (!this.baseUrl || !this.apiKey) {
      throw new Error(
        'AI_MODEL_API_URL and AI_MODEL_API_KEY must be set when USE_MOCK_AI=false',
      );
    }
    const url = `${this.baseUrl}${path}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.apiKey}` },
      body: buildForm(),
      signal: AbortSignal.timeout(this.timeoutMs),
    });

    if (!res.ok) {
      let msg = `AI request failed (${res.status})`;
      try {
        const errBody = (await res.json()) as {
          message?: string;
          detail?: string;
        };
        msg = errBody.message ?? errBody.detail ?? msg;
      } catch {
        /* ignore */
      }
      throw new Error(msg);
    }

    return res.json() as Promise<unknown>;
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
          ? (data.details as ModerationAnalysis['details'])
          : {},
    };
  }

  /**
   * Guide v1.3 has no dedicated drills for shooting/defending/GK; use moderation pass + stable heuristic score.
   */
  private async analyzeWithModerationFallback(
    videoUrl: string,
    skill: OutfieldSkill | GoalkeeperSkill,
  ): Promise<SkillAnalysisOutput> {
    await this.moderateVideo(videoUrl);
    const score = this.stableScoreFromUrl(videoUrl, String(skill));
    return {
      score,
      confidence: 0.55,
      keyMoments: [],
      attributes: {
        heuristic_marker: 1,
        skill_code: this.skillCode(String(skill)),
      },
    };
  }

  private skillCode(skill: string): number {
    let h = 0;
    for (let i = 0; i < skill.length; i++) {
      h = (Math.imul(31, h) + skill.charCodeAt(i)) | 0;
    }
    return Math.abs(h) % 1000;
  }

  private stableScoreFromUrl(videoUrl: string, salt: string): number {
    let h = 0;
    const s = videoUrl + salt;
    for (let i = 0; i < s.length; i++) {
      h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
    }
    return 62 + (Math.abs(h) % 28);
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

type AgilityResponse = {
  reps?: number;
  duration?: number;
};
