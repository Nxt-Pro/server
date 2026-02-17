import { Inject, Logger } from '@nestjs/common';
import { QueryDeepPartialEntity } from 'typeorm';

import { AnalysisType, GoalkeeperSkill, OutfieldSkill } from '@/common/enums';
import {
  SkillAnalysisJobPayload,
  SkillAnalysisResult,
  SkillScores,
} from '@/common/types';
import { VideoSkillAnalysis } from '@/database/entities';
import {
  PlayerProfileRepository,
  VideoSkillAnalysisRepository,
} from '@/database/repositories';
import type { IAiModelService } from '@/integrations/ai/services';
import { AI_MODEL_SERVICE } from '@/integrations/ai/services';
import { ProgressTrackerService } from '@/queues/services';

/**
 * Base processor for skill analysis (both outfield and goalkeeper)
 */
export abstract class BaseSkillAnalysisProcessor<
  TSkill extends OutfieldSkill | GoalkeeperSkill,
  TScores extends SkillScores,
> {
  protected abstract readonly logger: Logger;
  protected readonly ANALYSIS_VERSION = '1.0.0';

  protected readonly aiModel: IAiModelService;
  protected readonly progressTracker: ProgressTrackerService;
  protected readonly analysisRepository: VideoSkillAnalysisRepository;
  protected readonly playerRepository: PlayerProfileRepository;

  constructor(
    @Inject(AI_MODEL_SERVICE)
    aiModel: IAiModelService,
    progressTracker: ProgressTrackerService,
    analysisRepository: VideoSkillAnalysisRepository,
    playerRepository: PlayerProfileRepository,
  ) {
    this.aiModel = aiModel;
    this.progressTracker = progressTracker;
    this.analysisRepository = analysisRepository;
    this.playerRepository = playerRepository;
  }

  /**
   * Template method - defines the algorithm structure
   * Subclasses provide specific implementations for abstract methods
   */
  async analyzeSkills(
    payload: SkillAnalysisJobPayload,
    jobId: string,
  ): Promise<SkillAnalysisResult> {
    this.logger.log(
      `Analyzing ${this.getAnalysisType()} skills for video ${payload.videoId}`,
    );

    const skills: Partial<TScores> = {};
    const breakdown: Record<string, unknown> = {};
    let currentStep = 2; // Start at 2 because consumer already did step 1

    const skillsToAnalyze = this.getSkillList();

    for (const skill of skillsToAnalyze) {
      await this.progressTracker.updateProgress(jobId, payload.requestedBy, {
        currentStep: `Analyzing ${skill}...`,
        currentStepIndex: currentStep,
      });

      const { score, details } = await this.analyzeSkill(
        skill,
        payload.videoUrl,
      );

      (skills as Record<string, number>)[skill] = score;
      breakdown[skill] = details;

      const confidence =
        typeof details === 'object' &&
        details !== null &&
        'confidence' in details
          ? (details as { confidence: number }).confidence
          : 0;

      this.logger.log(
        `${skill} analysis complete: ${score}/99 (${confidence * 100}% confidence)`,
      );

      currentStep++;
    }

    const overall = this.calculateOverallScore(skills as TScores);
    (skills as TScores).overall = overall;

    const result: SkillAnalysisResult = {
      videoId: payload.videoId,
      playerId: payload.playerId,
      analysisType: this.getAnalysisType(),
      scores: skills as TScores,
      confidence: this.calculateOverallConfidence(breakdown),
      analysisVersion: this.ANALYSIS_VERSION,
      processedAt: new Date(),
      breakdown,
    };

    await this.saveAnalysisResult(result);
    await this.updatePlayerAiScore(payload.playerId, overall);

    return result;
  }

  /**
   * Analyze individual skill using AI model
   */
  protected async analyzeSkill(
    skill: TSkill,
    videoUrl: string,
  ): Promise<{ score: number; details: unknown }> {
    this.logger.log(`Analyzing skill: ${skill}`);

    const result = await this.aiModel.analyzeSkill({
      videoUrl,
      analysisType: this.getAnalysisType(),
      skill,
    });

    return {
      score: result.score,
      details: result,
    };
  }

  /**
   * Calculate overall confidence from all skill analyses
   */
  protected calculateOverallConfidence(
    breakdown: Record<string, unknown>,
  ): number {
    const confidences = Object.values(breakdown).map(
      skill => (skill as { confidence?: unknown }).confidence as number,
    );
    return confidences.reduce((sum, c) => sum + c, 0) / confidences.length;
  }

  /**
   * Save analysis result to database
   */
  protected async saveAnalysisResult(
    result: SkillAnalysisResult,
  ): Promise<void> {
    this.logger.log(`Saving analysis result for video ${result.videoId}`);

    const payload: QueryDeepPartialEntity<VideoSkillAnalysis> = {
      videoId: result.videoId,
      status: 'completed',
      aiScore: { ...result.scores },
      analysisVersion: result.analysisVersion,
      processedAt: result.processedAt,
      failureReason: undefined,
    };
    await this.analysisRepository.upsert(payload, ['videoId']);

    this.logger.log('Analysis result saved successfully');
  }

  /**
   * Update player's AI score
   */
  protected async updatePlayerAiScore(
    playerId: string,
    aiScore: number,
  ): Promise<void> {
    this.logger.log(`Updating AI score for player ${playerId} to ${aiScore}`);
    await this.playerRepository.updateByUserId(playerId, { aiScore });
    this.logger.log('Player AI score updated successfully');
  }

  // Abstract methods

  /**
   * Get the list of skills to analyze
   */
  protected abstract getSkillList(): TSkill[];

  /**
   * Get the analysis type (outfield or goalkeeper)
   */
  protected abstract getAnalysisType(): AnalysisType;

  /**
   * Calculate overall score using skill-specific weights
   */
  protected abstract calculateOverallScore(_scores: TScores): number;
}
