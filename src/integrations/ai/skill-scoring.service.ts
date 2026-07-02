import { promises as fs } from 'fs';
import { basename, isAbsolute, relative, resolve, sep } from 'path';

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';

import {
  AiServiceError,
  aiErrorResponseBody,
  makeAiError,
  normalizeAiError,
  normalizeAiHttpError,
  toAiServiceError,
  type NormalizedAiError,
} from './ai-error-normalizer';
import { SubmitSkillScoringDto } from './dto';
import {
  SkillSupportEntry,
  findSupportedSkill,
  listSupportedSkillSummaries,
} from './skill-support.registry';

import { SkillScoringJobPayload, SkillScoringMediaInput } from '@/common/types';
import { AiConfig, UploadConfig } from '@/config';
import { AiSkillScoreJob, PlayerProfile } from '@/database/entities';
import {
  AiSkillScoreJobRepository,
  PlayerProfileRepository,
} from '@/database/repositories';
import { SkillAnalysisProducer } from '@/queues/producers';

const SKILL_NOT_SUPPORTED = 'SKILL_NOT_SUPPORTED';

interface NormalizedSkillMediaInput extends SkillScoringMediaInput {
  slotKey: string;
  mediaType: 'video' | 'image';
}

interface SkillScoringAcceptedResponse {
  supported: true;
  scoringJobId: string;
  jobId: string;
  status: AiSkillScoreJob['status'];
  skillKey: string;
  displayName: string;
}

interface SkillScoringUnsupportedResponse {
  supported: false;
  code: typeof SKILL_NOT_SUPPORTED;
  message: string;
  skill: string;
  supportedSkills: ReturnType<typeof listSupportedSkillSummaries>;
}

export type SubmitSkillScoringResponse =
  | SkillScoringAcceptedResponse
  | SkillScoringUnsupportedResponse;

@Injectable()
export class SkillScoringService {
  private readonly logger = new Logger(SkillScoringService.name);
  private readonly aiConfig: AiConfig;
  private readonly uploadConfig: UploadConfig;

  constructor(
    private readonly configService: ConfigService,
    private readonly scoringJobs: AiSkillScoreJobRepository,
    private readonly playerProfiles: PlayerProfileRepository,
    private readonly skillAnalysisProducer: SkillAnalysisProducer,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.aiConfig = this.configService.getOrThrow<AiConfig>('ai');
    this.uploadConfig = this.configService.getOrThrow<UploadConfig>('upload');
  }

  getSupportedSkills() {
    return listSupportedSkillSummaries();
  }

  async submitSkillScoring(
    userId: string,
    dto: SubmitSkillScoringDto,
  ): Promise<SubmitSkillScoringResponse> {
    const registryEntry = findSupportedSkill(dto.skill);
    if (!registryEntry) {
      return {
        supported: false,
        code: SKILL_NOT_SUPPORTED,
        message: 'This skill is not supported by AI scoring yet.',
        skill: dto.skill,
        supportedSkills: this.getSupportedSkills(),
      };
    }

    if (!this.aiConfig.scoringEnabled) {
      throw new ServiceUnavailableException(
        aiErrorResponseBody(
          makeAiError('AI_SERVICE_UNAVAILABLE', {
            serviceName: 'ai-skills',
            operation: 'scoring',
          }),
        ),
      );
    }
    if (!this.aiConfig.queueEnabled) {
      throw new ServiceUnavailableException(
        aiErrorResponseBody(
          makeAiError('AI_SERVICE_UNAVAILABLE', {
            serviceName: 'ai-skills',
            operation: 'scoring',
          }),
        ),
      );
    }

    const player = await this.playerProfiles.findByUserId(userId);
    if (!player) {
      throw new ForbiddenException('Only player profiles can request scoring.');
    }

    const media = this.normalizeMediaInputs(registryEntry, dto.media);
    const heightCm = this.resolveHeightCm(registryEntry, dto.heightCm, player);
    await this.assertMediaWithinLimit(media);

    const activeJob = await this.scoringJobs.findActiveForSkill(
      userId,
      registryEntry.skillKey,
    );
    if (activeJob?.queueJobId) {
      return {
        supported: true,
        scoringJobId: activeJob.id,
        jobId: activeJob.queueJobId,
        status: activeJob.status,
        skillKey: activeJob.skillKey,
        displayName: activeJob.displayName,
      };
    }

    const scoringJob = await this.scoringJobs.create({
      playerId: userId,
      requestedBy: userId,
      queueJobId: null,
      skillKey: registryEntry.skillKey,
      displayName: registryEntry.displayName,
      profileSkillKey: registryEntry.profileSkillField,
      serviceName: registryEntry.serviceName,
      status: 'queued',
      input: {
        media,
        heightCm,
        endpoint: registryEntry.endpoint,
      },
      result: null,
      score: null,
      confidence: null,
      modelVersion: null,
      summary: null,
      failureReason: null,
      failureCode: null,
      failureDetails: null,
      retryable: null,
      completedAt: null,
    });

    const queued = await this.skillAnalysisProducer.queueSkillScoring({
      scoringJobId: scoringJob.id,
      playerId: userId,
      requestedBy: userId,
      skillKey: registryEntry.skillKey,
      media,
      heightCm,
    });

    await this.scoringJobs.setQueueJobId(scoringJob.id, queued.jobId);

    return {
      supported: true,
      scoringJobId: scoringJob.id,
      jobId: queued.jobId,
      status: 'queued',
      skillKey: registryEntry.skillKey,
      displayName: registryEntry.displayName,
    };
  }

  async getJobForUser(jobId: string, userId: string): Promise<AiSkillScoreJob> {
    const job = await this.scoringJobs.findVisibleJob(jobId, userId);
    if (!job) {
      throw new NotFoundException('AI scoring job not found');
    }
    return job;
  }

  listJobsForUser(userId: string, limit?: number): Promise<AiSkillScoreJob[]> {
    return this.scoringJobs.listForUser(userId, limit);
  }

  async processQueuedJob(
    payload: SkillScoringJobPayload,
    queueJobId: string,
  ): Promise<Record<string, unknown>> {
    const registryEntry = findSupportedSkill(payload.skillKey);
    if (!registryEntry) {
      throw new Error(`Unsupported AI scoring skill: ${payload.skillKey}`);
    }

    await this.scoringJobs.markProcessing(payload.scoringJobId, queueJobId);

    const raw = await this.callSkillService(registryEntry, payload.media, {
      heightCm: payload.heightCm,
      skillKey: payload.skillKey,
    });
    const mapped = registryEntry.mapResult(raw);
    const score = Math.max(0, Math.min(99, Math.round(mapped.score)));
    if (!Number.isFinite(score)) {
      throw toAiServiceError(
        'AI_RESULT_INVALID',
        {
          serviceName: registryEntry.serviceName,
          skillKey: registryEntry.skillKey,
          operation: 'scoring',
        },
        { developerMessage: 'AI score mapper produced a non-finite score' },
      );
    }

    await this.updatePlayerSkillScore(
      payload.playerId,
      registryEntry.profileSkillField,
      score,
    );

    await this.scoringJobs.markCompleted(payload.scoringJobId, {
      score,
      confidence: mapped.confidence,
      summary: mapped.summary,
      modelVersion: mapped.modelVersion,
      result: mapped.details,
    });

    this.eventEmitter.emit('notification.create', {
      userId: payload.playerId,
      title: 'Skill score completed',
      message: `${registryEntry.displayName} scoring finished with ${score}.`,
      type: 'skill_score',
      referenceId: payload.scoringJobId,
    });

    return {
      scoringJobId: payload.scoringJobId,
      skillKey: registryEntry.skillKey,
      score,
      confidence: mapped.confidence,
      summary: mapped.summary,
      modelVersion: mapped.modelVersion,
    };
  }

  async markQueuedJobFailed(
    payload: SkillScoringJobPayload,
    error: unknown,
  ): Promise<NormalizedAiError> {
    const registryEntry = findSupportedSkill(payload.skillKey);
    const normalized = normalizeAiError(error, {
      serviceName: registryEntry?.serviceName ?? 'ai-skills',
      skillKey: registryEntry?.skillKey ?? payload.skillKey,
      operation: 'scoring',
    });

    this.logger.warn(
      `AI scoring job ${payload.scoringJobId} failed as ${normalized.code}: ${normalized.developerMessage ?? normalized.message}`,
    );

    await this.scoringJobs.markFailed(payload.scoringJobId, normalized);

    this.eventEmitter.emit('notification.create', {
      userId: payload.playerId,
      title: 'Skill scoring failed',
      message: this.buildFailureNotificationMessage(
        registryEntry?.displayName ?? payload.skillKey,
        normalized,
      ),
      type: 'skill_score',
      referenceId: payload.scoringJobId,
    });

    return normalized;
  }

  private normalizeMediaInputs(
    registryEntry: SkillSupportEntry,
    rawMedia: Record<string, unknown>,
  ): Record<string, NormalizedSkillMediaInput> {
    if (!rawMedia || typeof rawMedia !== 'object' || Array.isArray(rawMedia)) {
      throw new BadRequestException('media must be an object keyed by drill');
    }

    const normalized: Record<string, NormalizedSkillMediaInput> = {};

    for (const slot of registryEntry.mediaSlots) {
      const raw = this.findRawMediaForSlot(rawMedia, slot.key, slot.aliases);
      if (!raw && slot.required) {
        throw new BadRequestException(`Missing required media: ${slot.key}`);
      }
      if (!raw) continue;

      const media = this.readMedia(raw);
      const mimeType = media.mimeType?.toLowerCase();
      if (mimeType && !mimeType.startsWith(`${slot.mediaType}/`)) {
        throw new BadRequestException(
          `${slot.key} must be a ${slot.mediaType} upload`,
        );
      }

      normalized[slot.key] = {
        ...media,
        slotKey: slot.key,
        mediaType: slot.mediaType,
      };
    }

    return normalized;
  }

  private findRawMediaForSlot(
    rawMedia: Record<string, unknown>,
    slotKey: string,
    aliases: string[] = [],
  ): unknown {
    const keys = [slotKey, ...aliases];
    for (const key of keys) {
      const exact = rawMedia[key];
      if (exact) return exact;
      const normalized = rawMedia[key.replace(/-/g, '_')];
      if (normalized) return normalized;
    }
    return undefined;
  }

  private readMedia(raw: unknown): SkillScoringMediaInput {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      throw new BadRequestException('Invalid media payload');
    }
    const record = raw as Record<string, unknown>;
    const url = typeof record.url === 'string' ? record.url.trim() : '';
    if (!url) {
      throw new BadRequestException('Media URL is required');
    }
    return {
      url,
      mimeType:
        typeof record.mimeType === 'string'
          ? record.mimeType
          : typeof record.mime_type === 'string'
            ? record.mime_type
            : undefined,
      fileName:
        typeof record.fileName === 'string'
          ? record.fileName
          : typeof record.file_name === 'string'
            ? record.file_name
            : undefined,
      sizeBytes: this.readSizeBytes(record.sizeBytes ?? record.size),
    };
  }

  private resolveHeightCm(
    registryEntry: SkillSupportEntry,
    requestedHeight: number | undefined,
    player: PlayerProfile,
  ): number | undefined {
    if (!registryEntry.requiresHeightCm) {
      return undefined;
    }
    const profileHeight =
      player.heightCm == null ? undefined : Number(player.heightCm);
    const heightCm = requestedHeight ?? profileHeight;
    if (!heightCm || !Number.isFinite(heightCm) || heightCm <= 0) {
      throw new BadRequestException(
        `${registryEntry.displayName} scoring requires heightCm`,
      );
    }
    return heightCm;
  }

  private async callSkillService(
    registryEntry: SkillSupportEntry,
    media: Record<string, SkillScoringMediaInput>,
    options: { heightCm?: number; skillKey: string },
  ): Promise<unknown> {
    const baseUrl = this.aiConfig.skillServiceUrl?.replace(/\/+$/, '');
    if (!baseUrl) {
      throw toAiServiceError(
        'AI_SERVICE_UNAVAILABLE',
        {
          serviceName: registryEntry.serviceName,
          skillKey: options.skillKey,
          operation: 'scoring',
        },
        { developerMessage: 'AI skill service URL is not set' },
      );
    }

    const formData = new FormData();
    for (const slot of registryEntry.mediaSlots) {
      const item = media[slot.key];
      if (!item) continue;
      const { blob, fileName } = await this.loadMediaBlob(item, slot.key);
      formData.append(slot.formField, blob, fileName);
    }

    if (registryEntry.skillKey === 'pace' && options.heightCm != null) {
      formData.append('user_height_cm', String(options.heightCm));
    }
    if (registryEntry.skillKey === 'physical' && options.heightCm != null) {
      formData.append('height_cm', String(options.heightCm));
    }

    const url = `${baseUrl}${registryEntry.endpoint}`;
    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        body: formData,
        headers: this.aiConfig.apiKey
          ? { Authorization: `Bearer ${this.aiConfig.apiKey}` }
          : undefined,
        signal: AbortSignal.timeout(this.aiConfig.timeoutMs),
      });
    } catch (error) {
      throw new AiServiceError(
        normalizeAiError(error, {
          serviceName: registryEntry.serviceName,
          skillKey: registryEntry.skillKey,
          operation: 'scoring',
        }),
      );
    }

    const body = await this.readAiResponseBody(response);

    if (!response.ok) {
      throw new AiServiceError(
        normalizeAiHttpError(response.status, body, {
          serviceName: registryEntry.serviceName,
          skillKey: registryEntry.skillKey,
          operation: 'scoring',
        }),
      );
    }

    return body;
  }

  private async loadMediaBlob(
    media: SkillScoringMediaInput,
    slotKey: string,
  ): Promise<{ blob: Blob; fileName: string }> {
    const localPath = this.resolveLocalUploadPath(media.url);
    const mimeType =
      media.mimeType || (slotKey === 'archetype' ? 'image/jpeg' : 'video/mp4');
    const filePathForName = localPath ?? this.getUrlPathname(media.url);
    const fileName =
      media.fileName || basename(filePathForName) || `${slotKey}`;

    if (localPath) {
      await this.assertLocalFileWithinLimit(localPath, slotKey);
      const file = await fs.readFile(localPath);
      return {
        blob: new Blob([file], { type: mimeType }),
        fileName,
      };
    }

    let response: Response;
    try {
      response = await fetch(media.url, {
        signal: AbortSignal.timeout(this.aiConfig.timeoutMs),
      });
    } catch (error) {
      throw new AiServiceError(
        normalizeAiError(error, {
          operation: 'media',
        }),
      );
    }
    if (!response.ok) {
      throw toAiServiceError(
        'AI_MEDIA_INVALID',
        { operation: 'media' },
        {
          developerMessage: `Unable to fetch scoring media: HTTP ${response.status}`,
          statusCode: response.status,
        },
      );
    }
    this.assertContentLengthWithinLimit(
      this.readContentLength(response.headers),
      slotKey,
    );
    return {
      blob: await response.blob(),
      fileName,
    };
  }

  private resolveLocalUploadPath(url: string): string | null {
    const uploadRoot = resolve(process.cwd(), this.uploadConfig.localUploadDir);
    const publicBase = this.uploadConfig.localPublicBaseUrl.replace(/\/+$/, '');
    let relativePath: string | null = null;

    if (url.startsWith('/uploads/')) {
      relativePath = url.slice('/uploads/'.length);
    } else if (/^uploads\//i.test(url)) {
      relativePath = url.replace(/^uploads\//i, '');
    } else if (url.startsWith(`${publicBase}/`)) {
      relativePath = url.slice(publicBase.length + 1);
    }

    if (!relativePath) return null;

    const resolvedPath = resolve(uploadRoot, relativePath);
    const pathInsideUploadRoot = relative(uploadRoot, resolvedPath);
    if (
      pathInsideUploadRoot === '..' ||
      pathInsideUploadRoot.startsWith(`..${sep}`) ||
      isAbsolute(pathInsideUploadRoot)
    ) {
      throw new BadRequestException('Invalid local media path');
    }
    return resolvedPath;
  }

  private getUrlPathname(url: string): string {
    try {
      return new URL(url).pathname;
    } catch {
      return url;
    }
  }

  private async readAiResponseBody(response: Response): Promise<unknown> {
    const text = await response.text();
    if (!text) return {};
    try {
      return JSON.parse(text) as unknown;
    } catch {
      if (response.ok) {
        throw toAiServiceError(
          'AI_RESULT_INVALID',
          { operation: 'scoring', serviceName: 'ai-skills' },
          { developerMessage: 'AI service returned non-JSON success response' },
        );
      }
      return { message: text };
    }
  }

  private async assertMediaWithinLimit(
    media: Record<string, SkillScoringMediaInput>,
  ): Promise<void> {
    for (const [slotKey, item] of Object.entries(media)) {
      if (item.sizeBytes != null) {
        this.assertSizeWithinLimit(item.sizeBytes, slotKey);
        continue;
      }

      const localPath = this.resolveLocalUploadPath(item.url);
      if (localPath) {
        await this.assertLocalFileWithinLimit(localPath, slotKey);
        continue;
      }

      const size = await this.fetchRemoteContentLength(item.url, slotKey);
      this.assertSizeWithinLimit(size, slotKey);
    }
  }

  private async assertLocalFileWithinLimit(
    filePath: string,
    slotKey: string,
  ): Promise<void> {
    let stats: Awaited<ReturnType<typeof fs.stat>>;
    try {
      stats = await fs.stat(filePath);
    } catch {
      throw new BadRequestException(
        aiErrorResponseBody(
          makeAiError('AI_MEDIA_INVALID', {
            serviceName: 'ai-skills',
            skillKey: slotKey,
            operation: 'media',
          }),
        ),
      );
    }
    this.assertSizeWithinLimit(stats.size, slotKey);
  }

  private async fetchRemoteContentLength(
    url: string,
    slotKey: string,
  ): Promise<number> {
    let response: Response;
    try {
      response = await fetch(url, {
        method: 'HEAD',
        signal: AbortSignal.timeout(this.aiConfig.timeoutMs),
      });
    } catch {
      throw new BadRequestException(
        aiErrorResponseBody(
          makeAiError('AI_MEDIA_INVALID', {
            serviceName: 'ai-skills',
            skillKey: slotKey,
            operation: 'media',
          }),
        ),
      );
    }
    if (!response.ok) {
      throw new BadRequestException(
        aiErrorResponseBody(
          makeAiError(
            'AI_MEDIA_INVALID',
            {
              serviceName: 'ai-skills',
              skillKey: slotKey,
              operation: 'media',
            },
            { statusCode: response.status },
          ),
        ),
      );
    }
    return this.assertContentLengthWithinLimit(
      this.readContentLength(response.headers),
      slotKey,
    );
  }

  private readContentLength(headers: Headers): number | null {
    const raw = headers.get('content-length');
    if (!raw) return null;
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
  }

  private assertContentLengthWithinLimit(
    sizeBytes: number | null,
    slotKey: string,
  ): number {
    if (sizeBytes == null) {
      throw new BadRequestException(
        aiErrorResponseBody(
          makeAiError('AI_MEDIA_INVALID', {
            serviceName: 'ai-skills',
            skillKey: slotKey,
            operation: 'media',
          }),
        ),
      );
    }
    this.assertSizeWithinLimit(sizeBytes, slotKey);
    return sizeBytes;
  }

  private assertSizeWithinLimit(sizeBytes: number, slotKey: string): void {
    const limit = this.aiConfig.maxScoringMediaBytes;
    if (sizeBytes > limit) {
      throw new BadRequestException(
        aiErrorResponseBody(
          makeAiError(
            'AI_MEDIA_TOO_LARGE',
            {
              serviceName: 'ai-skills',
              skillKey: slotKey,
              operation: 'media',
            },
            {
              details: { maxBytes: limit, actualBytes: sizeBytes },
              developerMessage: `${slotKey} media is too large for AI scoring. Maximum size is ${this.formatBytes(limit)}.`,
            },
          ),
        ),
      );
    }
  }

  private readSizeBytes(value: unknown): number | undefined {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0) {
      return undefined;
    }
    return Math.round(parsed);
  }

  private formatBytes(bytes: number): string {
    if (bytes >= 1024 * 1024) {
      return `${Math.floor(bytes / (1024 * 1024))} MiB`;
    }
    if (bytes >= 1024) {
      return `${Math.floor(bytes / 1024)} KiB`;
    }
    return `${bytes} bytes`;
  }

  private async updatePlayerSkillScore(
    playerId: string,
    profileSkillKey: string,
    score: number,
  ): Promise<void> {
    const profile = await this.playerProfiles.findByUserId(playerId);
    if (!profile) {
      throw new NotFoundException('Player profile not found');
    }

    const skillScores = {
      ...(profile.skillScores ?? {}),
      [profileSkillKey]: score,
    };
    const aiScore = this.calculateAiScore(skillScores);

    await this.playerProfiles.updateByUserId(playerId, {
      skillScores,
      aiScore,
    });
  }

  private calculateAiScore(skillScores: Record<string, number>): number {
    const values = Object.values(skillScores)
      .map(value => Number(value))
      .filter(value => Number.isFinite(value) && value >= 0);
    if (values.length === 0) return 0;
    return Math.max(
      0,
      Math.min(
        99,
        Math.round(
          (values.reduce((sum, value) => sum + value, 0) / values.length) * 100,
        ) / 100,
      ),
    );
  }

  private buildFailureNotificationMessage(
    displayName: string,
    failure: NormalizedAiError,
  ): string {
    if (failure.code === 'AI_VIDEO_NOT_FOOTBALL') {
      return failure.message;
    }
    if (failure.code === 'AI_SERVICE_UNAVAILABLE') {
      return failure.message;
    }
    return `AI scoring could not analyze your ${displayName} video. ${failure.message}`;
  }
}
