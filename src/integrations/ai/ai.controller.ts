import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Request,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request as ExpressRequest } from 'express';
import { AnalyzeVideoDto, RecalculatePlayerDto, VideoUploadDto } from './dto';
import { VideoAnalysisService } from './video-analysis.service';

import { JobProgress } from '@/common/types';
import { VideoSkillAnalysis } from '@/database/entities';

// import { JwtAuthGuard } from '@/common/guards';

// Request with authenticated user
interface RequestWithUser extends ExpressRequest {
  user?: { id: string };
}

@Controller('ai')
//@UseGuards(JwtAuthGuard)
export class AiController {
  private readonly videoAnalysisService: VideoAnalysisService;
  private readonly configService: ConfigService;

  constructor(
    videoAnalysisService: VideoAnalysisService,
    configService: ConfigService,
  ) {
    this.videoAnalysisService = videoAnalysisService;
    this.configService = configService;
  }

  /**
   * Queue video upload and moderation.
   * POST (/api/ai/video/upload)
   */
  @Post('video/upload')
  @HttpCode(HttpStatus.ACCEPTED)
  async uploadVideo(
    @Request() req: RequestWithUser,
    @Body() dto: VideoUploadDto,
  ): Promise<{ jobId: string; videoId: string; status: string }> {
    const userId = this.getUserId(req);

    return await this.videoAnalysisService.queueVideoUpload({
      videoId: dto.videoId,
      userId,
      attachmentId: dto.attachmentId,
      filePath: dto.filePath,
      originalFileName: dto.originalFileName,
      fileSize: dto.fileSize,
      mimeType: dto.mimeType,
    });
  }

  /**
   * Request skill analysis for a video.
   * POST (/api/ai/video/analyze)
   */
  @Post('video/analyze')
  @HttpCode(HttpStatus.ACCEPTED)
  async analyzeVideo(
    @Request() req: RequestWithUser,
    @Body() dto: AnalyzeVideoDto,
  ): Promise<{
    jobId: string | null;
    videoId: string;
    status: string;
    result?: unknown;
  }> {
    const userId = this.getUserId(req);

    return await this.videoAnalysisService.queueSkillAnalysis({
      videoId: dto.videoId,
      analysisType: dto.analysisType,
      requestedBy: userId,
    });
  }

  /**
   * Get video upload/moderation status.
   * GET (/api/ai/job/:jobId/upload-status)
   */
  @Get('job/:jobId/upload-status')
  async getUploadStatus(
    @Param('jobId') jobId: string,
    @Request() req: RequestWithUser,
  ): Promise<{
    jobId: string | undefined;
    state: string;
    progress: unknown;
    result: unknown;
    error: string | undefined;
  }> {
    return await this.videoAnalysisService.getUploadStatus(
      jobId,
      this.getUserId(req),
    );
  }

  /**
   * Get skill analysis status and progress.
   * GET (/api/ai/job/:jobId/analysis-status)
   */
  @Get('job/:jobId/analysis-status')
  async getAnalysisStatus(
    @Param('jobId') jobId: string,
    @Request() req: RequestWithUser,
  ): Promise<{
    jobId: string | undefined;
    state: string;
    progress: unknown;
    result: unknown;
    error: string | undefined;
  }> {
    return await this.videoAnalysisService.getAnalysisStatus(
      jobId,
      this.getUserId(req),
    );
  }

  /**
   * Get all active jobs for current user.
   * GET (/api/ai/user/active-jobs)
   */
  @Get('user/active-jobs')
  async getUserActiveJobs(
    @Request() req: RequestWithUser,
  ): Promise<JobProgress[]> {
    return await this.videoAnalysisService.getUserActiveJobs(
      this.getUserId(req),
    );
  }

  /**
   * Cancel a job.
   * POST (/api/ai/job/:jobId/cancel)
   */
  @Post('job/:jobId/cancel')
  @HttpCode(HttpStatus.NO_CONTENT)
  async cancelJob(
    @Param('jobId') jobId: string,
    @Request() req: RequestWithUser,
  ): Promise<void> {
    await this.videoAnalysisService.cancelJob(jobId, this.getUserId(req));
  }

  /**
   * Get analysis result.
   * GET (/api/ai/video/:videoId/result)
   */
  @Get('video/:videoId/result')
  async getAnalysisResult(
    @Param('videoId') videoId: string,
  ): Promise<VideoSkillAnalysis> {
    return await this.videoAnalysisService.getAnalysisResult(videoId);
  }

  /**
   * Get video analysis status by videoId.
   * GET (/api/ai/video/:id/status)
   */
  @Get('video/:id/status')
  async getVideoStatus(@Param('id') id: string) {
    return await this.videoAnalysisService.getVideoStatus(id);
  }

  /**
   * Recalculate a player's AI score.
   * POST (/api/ai/player/recalculate)
   *
   * Triggered by cron / admin / queue. Not directly by clients.
   */
  @Post('player/recalculate')
  @HttpCode(HttpStatus.ACCEPTED)
  async recalculatePlayerScore(@Body() dto: RecalculatePlayerDto) {
    return await this.videoAnalysisService.recalculatePlayerScore(
      dto.playerId,
      dto.analysisType,
    );
  }

  private getUserId(req: RequestWithUser): string {
    // Dev-mode fallback — remove once JwtAuthGuard is wired
    const isDev = this.configService.get<string>('nodeEnv') !== 'production';
    const id = req.user?.id || (isDev ? 'test-user-123' : undefined);

    if (!id) {
      throw new UnauthorizedException('Authentication required');
    }
    return id;
  }
}
