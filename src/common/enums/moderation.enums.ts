/* eslint-disable no-unused-vars */
export enum ModerationStatus {
  QUEUED = 'queued',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export enum ModerationResult {
  APPROVED = 'approved',
  FLAGGED = 'flagged',
  REJECTED = 'rejected',
}
