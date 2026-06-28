import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Request,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { Request as ExpressRequest } from 'express';
import {
  AnalyzeVideoDto,
  RecalculatePlayerDto,
  SubmitSkillScoringDto,
  VideoUploadDto,
} from './dto';
import { AiRecommendationService } from './ai-recommendation.service';
import { SkillScoringService } from './skill-scoring.service';
import { VideoAnalysisService } from './video-analysis.service';

import { CurrentUser } from '@/common/decorators';
import { JwtAuthGuard } from '@/common/guards';
import type { JwtPayload } from '@/common/interfaces/jwt-payload.interface';
import { JobProgress } from '@/common/types';
import { VideoSkillAnalysis } from '@/database/entities';

// Request with authenticated user
interface RequestWithUser extends ExpressRequest {
  user?: { sub: string };
}

@Controller('ai')
@UseGuards(JwtAuthGuard)
export class AiController {
  private readonly videoAnalysisService: VideoAnalysisService;
  private readonly skillScoringService: SkillScoringService;
  private readonly recommendationService: AiRecommendationService;

  constructor(
    videoAnalysisService: VideoAnalysisService,
    skillScoringService: SkillScoringService,
    recommendationService: AiRecommendationService,
  ) {
    this.videoAnalysisService = videoAnalysisService;
    this.skillScoringService = skillScoringService;
    this.recommendationService = recommendationService;
  }

  @Get('skills/support')
  getSupportedSkills() {
    return {
      supportedSkills: this.skillScoringService.getSupportedSkills(),
    };
  }

  @Post('skills/score')
  submitSkillScoring(
    @CurrentUser() user: JwtPayload,
    @Body() dto: SubmitSkillScoringDto,
  ) {
    return this.skillScoringService.submitSkillScoring(user.sub, dto);
  }

  @Get('skills/jobs')
  listSkillScoringJobs(
    @CurrentUser() user: JwtPayload,
    @Query('limit') limit?: string,
  ) {
    return this.skillScoringService.listJobsForUser(
      user.sub,
      limit == null ? undefined : Number(limit),
    );
  }

  @Get('skills/jobs/:jobId')
  getSkillScoringJob(
    @CurrentUser() user: JwtPayload,
    @Param('jobId') jobId: string,
  ) {
    return this.skillScoringService.getJobForUser(jobId, user.sub);
  }

  @Get('recommendations')
  getRecommendations(@CurrentUser() user: JwtPayload, @Query('k') k?: string) {
    if (user.role !== 'scout') {
      throw new UnauthorizedException('Only scouts can fetch recommendations');
    }
    return this.recommendationService.getScoutRecommendations(
      user.sub,
      k == null ? 10 : Number(k),
    );
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
    const id = req.user?.sub;
    if (!id) {
      throw new UnauthorizedException('Authentication required');
    }
    return id;
  }
}
