import { AnalysisType, JobStatus } from '@/common/enums';

export interface VideoUploadJobPayload {
  videoId: string;
  userId: string;
  attachmentId: string;
  filePath: string;
  originalFileName: string;
  fileSize: number;
  mimeType: string;
}

export interface VideoModerationJobPayload {
  videoId: string;
  userId: string;
  attachmentId: string;
  videoUrl: string;
}

export interface SkillAnalysisJobPayload {
  videoId: string;
  playerId: string;
  analysisType: AnalysisType;
  videoUrl: string;
  requestedBy: string;
}

export interface NotificationJobPayload {
  userId: string;
  title: string;
  message: string;
  type: string;
  referenceId?: string;
  data?: Record<string, unknown>;
}

export interface JobProgress {
  jobId: string;
  type: 'upload' | 'analysis';
  status: JobStatus;
  progress: number;
  currentStep: string;
  currentStepIndex: number;
  totalSteps: number;
  startedAt: Date;
  completedAt?: Date;
  result?: unknown;
  error?: string;
}
