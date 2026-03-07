import { Injectable, Logger } from '@nestjs/common';

import { IAiModelService, SkillAnalysisInput, SkillAnalysisOutput } from '.';

import {
  GoalkeeperSkill,
  ModerationResult,
  OutfieldSkill,
} from '@/common/enums';
import type { ModerationAnalysis } from '@/common/types';

@Injectable()
export class MockAiModelService implements IAiModelService {
  private readonly logger = new Logger(MockAiModelService.name);

  async analyzeSkill(input: SkillAnalysisInput): Promise<SkillAnalysisOutput> {
    this.logger.log(
      `[MOCK] Analyzing skill: ${input.skill} for video ${input.videoUrl}`,
    );

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 100));

    const mockScore = Math.floor(Math.random() * 30) + 70; // 70-99

    return {
      score: mockScore,
      confidence: 0.85,
      keyMoments: [
        {
          timestamp: 5.2,
          action: `${input.skill} demonstration`,
          score: mockScore,
        },
      ],
      attributes: this.getMockAttributes(input.skill, mockScore),
    };
  }

  async moderateVideo(videoUrl: string): Promise<ModerationAnalysis> {
    this.logger.log(`[MOCK] Moderating video: ${videoUrl}`);

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 100));

    return {
      verdict: ModerationResult.APPROVED,
      confidence: 0.95,
      isFootballRelated: true,
      inappropriateContent: false,
      flags: [],
      details: {
        violence: 0.05,
        adult: 0.02,
        offensive: 0.03,
        spam: 0.01,
      },
    };
  }

  private getMockAttributes(
    skill: OutfieldSkill | GoalkeeperSkill,
    score: number,
  ): Record<string, number> {
    const randOffset = () => Math.floor(Math.random() * 10 - 5);
    const clamp = (v: number) => Math.min(99, Math.max(0, v));

    // Outfield skills
    if (Object.values(OutfieldSkill).includes(skill as OutfieldSkill)) {
      switch (skill as OutfieldSkill) {
        case OutfieldSkill.PACE:
          return {
            acceleration: clamp(score + randOffset()),
            sprintSpeed: clamp(score + randOffset()),
          };
        case OutfieldSkill.DRIBBLING:
          return {
            ballControl: clamp(score + randOffset()),
            technique: clamp(score + randOffset()),
            agility: clamp(score + randOffset()),
            balance: clamp(score + randOffset()),
          };
        case OutfieldSkill.SHOOTING:
          return {
            shotPower: clamp(score + randOffset()),
            finishing: clamp(score + randOffset()),
            longShots: clamp(score + randOffset()),
            volleys: clamp(score + randOffset()),
          };
        case OutfieldSkill.DEFENDING:
          return {
            interceptions: clamp(score + randOffset()),
            headingAccuracy: clamp(score + randOffset()),
            marking: clamp(score + randOffset()),
            standingTackle: clamp(score + randOffset()),
            slidingTackle: clamp(score + randOffset()),
          };
        case OutfieldSkill.PASSING:
          return {
            shortPassing: clamp(score + randOffset()),
            vision: clamp(score + randOffset()),
            crossing: clamp(score + randOffset()),
            longPassing: clamp(score + randOffset()),
          };
        case OutfieldSkill.PHYSICAL:
          return {
            strength: clamp(score + randOffset()),
            stamina: clamp(score + randOffset()),
            aggression: clamp(score + randOffset()),
            jumping: clamp(score + randOffset()),
          };
      }
    }

    // Goalkeeper skills
    if (Object.values(GoalkeeperSkill).includes(skill as GoalkeeperSkill)) {
      switch (skill as GoalkeeperSkill) {
        case GoalkeeperSkill.DIVING:
          return {
            reach: clamp(score + randOffset()),
            reactions: clamp(score + randOffset()),
            agility: clamp(score + randOffset()),
          };
        case GoalkeeperSkill.REFLEXES:
          return {
            reactionTime: clamp(score + randOffset()),
            shotStopping: clamp(score + randOffset()),
            oneonOneAbility: clamp(score + randOffset()),
          };
        case GoalkeeperSkill.HANDLING:
          return {
            catching: clamp(score + randOffset()),
            ballControl: clamp(score + randOffset()),
            throwingAccuracy: clamp(score + randOffset()),
          };
        case GoalkeeperSkill.SPEED:
          return {
            acceleration: clamp(score + randOffset()),
            sprintSpeed: clamp(score + randOffset()),
          };
        case GoalkeeperSkill.KICKING:
          return {
            kickingPower: clamp(score + randOffset()),
            kickingAccuracy: clamp(score + randOffset()),
            goalKicks: clamp(score + randOffset()),
            distribution: clamp(score + randOffset()),
          };
        case GoalkeeperSkill.POSITIONING:
          return {
            awareness: clamp(score + randOffset()),
            anticipation: clamp(score + randOffset()),
            decision: clamp(score + randOffset()),
            command: clamp(score + randOffset()),
          };
      }
    }

    return {};
  }
}
