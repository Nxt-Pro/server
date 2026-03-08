import {
  Injectable,
  Logger,
  NotFoundException,
  Optional,
  ServiceUnavailableException,
} from '@nestjs/common';

import { AnalysisType } from '@/common/enums';
import {
  JobProgress,
  SkillAnalysisJobPayload,
  VideoUploadJobPayload,
} from '@/common/types';
import { VideoSkillAnalysis } from '@/database/entities';
import {
  PlayerProfileRepository,
  VideoRepository,
  VideoSkillAnalysisRepository,
} from '@/database/repositories';
import { SkillAnalysisProducer, VideoUploadProducer } from '@/queues/producers';

@Injectable()
export class VideoAnalysisService {
  private readonly logger = new Logger(VideoAnalysisService.name);

  private readonly videoUploadProducer?: VideoUploadProducer;
  private readonly skillAnalysisProducer?: SkillAnalysisProducer;
  private readonly videoRepository: VideoRepository;
  private readonly analysisRepository: VideoSkillAnalysisRepository;
  private readonly playerProfileRepository: PlayerProfileRepository;

  constructor(
    @Optional() videoUploadProducer: VideoUploadProducer | undefined,
    @Optional() skillAnalysisProducer: SkillAnalysisProducer | undefined,
    videoRepository: VideoRepository,
    analysisRepository: VideoSkillAnalysisRepository,
    playerProfileRepository: PlayerProfileRepository,
  ) {
    this.videoUploadProducer = videoUploadProducer;
    this.skillAnalysisProducer = skillAnalysisProducer;
    this.videoRepository = videoRepository;
    this.analysisRepository = analysisRepository;
    this.playerProfileRepository = playerProfileRepository;
  }

  /**
   * Queue video upload for processing
   */
  async queueVideoUpload(payload: VideoUploadJobPayload) {
    this.ensureQueueAvailable();
    this.logger.log(`Queueing video upload for user ${payload.userId}`);

    const video = await this.videoRepository.findById(payload.videoId);
    if (!video) {
      throw new NotFoundException(`Video with ID ${payload.videoId} not found`);
    }

    // Queue the upload job
    const result = await this.videoUploadProducer!.queueVideoUpload(payload);

    return {
      jobId: result.jobId,
      videoId: payload.videoId,
      status: 'queued',
    };
  }

  /**
   * Queue skill analysis for a video
   */
  async queueSkillAnalysis(
    payload: Omit<SkillAnalysisJobPayload, 'playerId' | 'videoUrl'>,
  ) {
    this.ensureQueueAvailable();
    this.logger.log(`Queueing skill analysis for video ${payload.videoId}`);

    const video = await this.videoRepository.findOne({
      where: { id: payload.videoId },
      relations: [
        'attachment',
        'attachment.post',
        'attachment.post.user',
        'attachment.post.user.playerProfile',
      ],
    });

    if (!video) {
      throw new NotFoundException(`Video with ID ${payload.videoId} not found`);
    }

    const videoUrl = video.attachment?.url;
    if (!videoUrl) {
      throw new NotFoundException(
        `Video has not been uploaded yet. Please upload the video first.`,
      );
    }

    const playerId = video.attachment?.post?.userId;
    if (!playerId) {
      throw new NotFoundException(`Player profile not found for this video`);
    }

    const existingAnalysis = await this.analysisRepository.findByVideoId(
      payload.videoId,
      'completed',
    );

    if (existingAnalysis) {
      return {
        jobId: null,
        videoId: payload.videoId,
        status: 'completed',
        result: existingAnalysis,
      };
    }

    await this.analysisRepository.upsert(
      {
        videoId: payload.videoId,
        status: 'queued',
      },
      ['videoId'],
    );

    // Queue the analysis job
    const result = await this.skillAnalysisProducer!.queueSkillAnalysis({
      ...payload,
      playerId,
      videoUrl,
    });

    return {
      jobId: result.jobId,
      videoId: payload.videoId,
      status: 'queued',
    };
  }

  /**
   * Get upload status
   * Note: Since we no longer use custom job IDs, you need to track the jobId
   * returned from queueVideoUpload and pass it here, or retrieve it from the video entity
   */
  async getUploadStatus(jobId: string, userId: string) {
    this.ensureQueueAvailable();
    const status = await this.videoUploadProducer!.getJobStatus(jobId, userId);

    if (!status) {
      throw new NotFoundException(`Upload job ${jobId} not found`);
    }

    return {
      jobId: status.id,
      state: status.state,
      progress: status.progress,
      result: status.returnvalue,
      error: status.failedReason,
    };
  }

  /**
   * Get analysis status and progress
   * Note: Since we no longer use custom job IDs, you need to track the jobId
   * returned from queueSkillAnalysis and pass it here
   */
  async getAnalysisStatus(jobId: string, userId: string) {
    this.ensureQueueAvailable();
    const status = await this.skillAnalysisProducer!.getJobStatus(
      jobId,
      userId,
    );

    if (!status) {
      throw new NotFoundException(`Analysis job ${jobId} not found`);
    }

    return {
      jobId: status.id,
      state: status.state,
      progress: status.progress,
      result: status.returnvalue,
      error: status.failedReason,
    };
  }

  /**
   * Get all active jobs for a user
   */
  async getUserActiveJobs(userId: string): Promise<JobProgress[]> {
    this.ensureQueueAvailable();
    return await this.skillAnalysisProducer!.getUserActiveJobs(userId);
  }

  /**
   * Cancel a job
   */
  async cancelJob(jobId: string, userId: string): Promise<boolean> {
    this.ensureQueueAvailable();
    let cancelled = await this.videoUploadProducer!.cancelJob(jobId, userId);

    if (!cancelled) {
      cancelled = await this.skillAnalysisProducer!.cancelJob(jobId, userId);
    }

    if (!cancelled) {
      throw new NotFoundException(
        `Job ${jobId} not found or already completed`,
      );
    }

    return cancelled;
  }

  /**
   * Get analysis result from database
   */
  async getAnalysisResult(videoId: string): Promise<VideoSkillAnalysis> {
    const result = await this.analysisRepository.findByVideoId(
      videoId,
      'completed',
    );

    if (!result) {
      throw new NotFoundException(
        `Analysis result not found for video ${videoId}. Analysis may still be in progress.`,
      );
    }

    return result;
  }

  /**
   * Get video analysis status by videoId (convenience endpoint)
   * GET /api/ai/video/:id/status
   */
  async getVideoStatus(videoId: string): Promise<{
    videoId: string;
    status: string;
    aiScore: Record<string, unknown> | null;
    processedAt: Date | null;
    failureReason: string | null;
  }> {
    const analysis = await this.analysisRepository.findOne({
      where: { videoId },
    });

    if (!analysis) {
      throw new NotFoundException(`No analysis found for video ${videoId}`);
    }

    return {
      videoId: analysis.videoId,
      status: analysis.status,
      aiScore: analysis.status === 'completed' ? analysis.aiScore : null,
      processedAt: analysis.processedAt ?? null,
      failureReason: analysis.failureReason ?? null,
    };
  }

  /**
   * Recalculate a player's AI score by re-analyzing their latest videos
   * POST /api/ai/player/recalculate
   *
   * Intended to be triggered by cron / admin / queue — not directly by clients.
   */
  async recalculatePlayerScore(
    playerId: string,
    analysisType?: AnalysisType,
  ): Promise<{ jobIds: string[]; message: string }> {
    this.ensureQueueAvailable();
    this.logger.log(`Recalculating AI score for player ${playerId}`);

    const player = await this.playerProfileRepository.findByUserId(playerId);

    if (!player) {
      throw new NotFoundException(`Player ${playerId} not found`);
    }

    // Find all completed analyses for this player's videos
    // We re-queue analysis for videos that already have results
    const videos = await this.videoRepository.find({
      where: {},
      relations: [
        'attachment',
        'attachment.post',
        'attachment.post.user',
        'attachment.post.user.playerProfile',
        'skillAnalysis',
      ],
    });

    // Filter to this player's videos that have valid URLs
    const playerVideos = videos.filter(
      v => v.attachment?.post?.userId === playerId && v.attachment?.url,
    );

    if (playerVideos.length === 0) {
      throw new NotFoundException(
        `No uploaded videos found for player ${playerId}`,
      );
    }

    const detectedType =
      analysisType ??
      (player.position?.toLowerCase() === 'goalkeeper'
        ? AnalysisType.GOALKEEPER
        : AnalysisType.OUTFIELD);

    const payloads: SkillAnalysisJobPayload[] = playerVideos.map(v => ({
      videoId: v.id,
      playerId,
      videoUrl: v.attachment.url,
      analysisType: detectedType,
      requestedBy: playerId,
    }));

    // Reset existing analyses to 'queued'
    for (const payload of payloads) {
      await this.analysisRepository.upsert(
        { videoId: payload.videoId, status: 'queued' },
        ['videoId'],
      );
    }

    const result =
      await this.skillAnalysisProducer!.queueBatchAnalysis(payloads);

    this.logger.log(
      `Queued ${result.jobIds.length} recalculation jobs for player ${playerId}`,
    );

    return {
      jobIds: result.jobIds,
      message: `Queued ${result.jobIds.length} video(s) for re-analysis`,
    };
  }

  private ensureQueueAvailable() {
    if (!this.videoUploadProducer || !this.skillAnalysisProducer) {
      throw new ServiceUnavailableException(
        'Queue service is unavailable. Start Redis and enable queue workers to use AI queue operations.',
      );
    }
  }
}
