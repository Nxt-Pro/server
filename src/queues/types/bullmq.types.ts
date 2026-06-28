/** Minimal job shape used by consumers and event handlers */
export interface BullJob<TData = unknown> {
  id?: string;
  name: string;
  data: TData;
  attemptsMade?: number;
  opts?: {
    attempts?: number;
  };
  updateProgress?(_progress: unknown): Promise<void>;
}

/** Job shape used by producers (includes lifecycle methods) */
export interface BullJobFull {
  id?: string;
  name: string;
  data: unknown;
  getState(): Promise<string>;
  remove(): Promise<void>;
  retry?(): Promise<void>;
  failedReason?: string;
  returnvalue?: unknown;
  timestamp?: number;
  processedOn?: number;
  finishedOn?: number;
}

/** Queue shape used by producers */
export interface BullQueue {
  add(
    _name: string,
    _data: unknown,
    _opts?: { jobId?: string; priority?: number; [key: string]: unknown },
  ): Promise<BullJobFull>;
  getJob(_jobId: string): Promise<BullJobFull | undefined>;
}

/** Job shape expected by processors (just updateProgress) */
export interface ProcessorJob {
  updateProgress(_progress: number): Promise<void>;
}

/** Return type for job status queries */
export interface JobStatusResult {
  id: string | undefined;
  name: string;
  data: unknown;
  state: string;
  progress: unknown;
  failedReason: string | undefined;
  returnvalue: unknown;
  timestamp: number | undefined;
  processedOn: number | undefined;
  finishedOn: number | undefined;
}
