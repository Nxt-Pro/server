import { Injectable, Logger, NotFoundException } from '@nestjs/common';

import {
  JobProgress,
  SkillAnalysisJobPayload,
  VideoUploadJobPayload,
} from '@/common/types';
import { VideoSkillAnalysis } from '@/database/entities';
import {
  VideoRepository,
  VideoSkillAnalysisRepository,
} from '@/database/repositories';
import { SkillAnalysisProducer, VideoUploadProducer } from '@/queues/producers';

@Injectable()
export class VideoAnalysisService {
  private readonly logger = new Logger(VideoAnalysisService.name);

  private readonly videoUploadProducer: VideoUploadProducer;
  private readonly skillAnalysisProducer: SkillAnalysisProducer;
  private readonly videoRepository: VideoRepository;
  private readonly analysisRepository: VideoSkillAnalysisRepository;

  constructor(
    videoUploadProducer: VideoUploadProducer,
    skillAnalysisProducer: SkillAnalysisProducer,
    videoRepository: VideoRepository,
    analysisRepository: VideoSkillAnalysisRepository,
  ) {
    this.videoUploadProducer = videoUploadProducer;
    this.skillAnalysisProducer = skillAnalysisProducer;
    this.videoRepository = videoRepository;
    this.analysisRepository = analysisRepository;
  }

  /**
   * Queue video upload for processing
   */
  async queueVideoUpload(payload: VideoUploadJobPayload) {
    this.logger.log(`Queueing video upload for user ${payload.userId}`);

    const video = await this.videoRepository.findById(payload.videoId);
    if (!video) {
      throw new NotFoundException(`Video with ID ${payload.videoId} not found`);
    }

    // Queue the upload job
    const result = await this.videoUploadProducer.queueVideoUpload(payload);

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

    await this.analysisRepository.save({
      videoId: payload.videoId,
      status: 'queued',
    });

    // Queue the analysis job
    const result = await this.skillAnalysisProducer.queueSkillAnalysis({
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
    const status = await this.videoUploadProducer.getJobStatus(jobId, userId);

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
    const status = await this.skillAnalysisProducer.getJobStatus(jobId, userId);

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
    return await this.skillAnalysisProducer.getUserActiveJobs(userId);
  }

  /**
   * Cancel a job
   */
  async cancelJob(jobId: string, userId: string): Promise<boolean> {
    let cancelled = await this.videoUploadProducer.cancelJob(jobId, userId);

    if (!cancelled) {
      cancelled = await this.skillAnalysisProducer.cancelJob(jobId, userId);
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
}
