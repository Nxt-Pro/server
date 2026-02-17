export interface QueueJobOptions {
  attempts?: number;
  backoff?: {
    type: 'exponential' | 'fixed';
    delay: number;
  };
  removeOnComplete?: boolean | number;
  removeOnFail?: boolean | number;
  priority?: number;
}

export const DEFAULT_JOB_OPTIONS: QueueJobOptions = {
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 5000,
  },
  removeOnComplete: 100, // Keep last 100 completed jobs
  removeOnFail: 200, // Keep last 200 failed jobs for debugging
};

export const PRIORITY_JOB_OPTIONS: QueueJobOptions = {
  ...DEFAULT_JOB_OPTIONS,
  priority: 1,
};
