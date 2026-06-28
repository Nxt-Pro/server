export enum QueueName {
  VIDEO_UPLOAD = 'video-upload',
  SKILL_ANALYSIS = 'skill-analysis',
  NOTIFICATION = 'notification',
}

export enum JobType {
  VIDEO_UPLOAD = 'video-upload',
  VIDEO_MODERATION = 'video-moderation',
  SKILL_SCORING = 'skill-scoring',
  SKILL_ANALYSIS_OUTFIELD = 'skill-analysis-outfield',
  SKILL_ANALYSIS_GOALKEEPER = 'skill-analysis-goalkeeper',
  PUSH_NOTIFICATION = 'push-notification',
}

export enum JobStatus {
  QUEUED = 'queued',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export enum AnalysisType {
  OUTFIELD = 'outfield',
  GOALKEEPER = 'goalkeeper',
}

export enum OutfieldSkill {
  PACE = 'pace',
  DRIBBLING = 'dribbling',
  SHOOTING = 'shooting',
  DEFENDING = 'defending',
  PASSING = 'passing',
  PHYSICAL = 'physical',
}

export enum GoalkeeperSkill {
  DIVING = 'diving',
  REFLEXES = 'reflexes',
  HANDLING = 'handling',
  SPEED = 'speed',
  KICKING = 'kicking',
  POSITIONING = 'positioning',
}
