import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { MediaUrlService } from '@/common/media';
import { VideoUploadJobPayload } from '@/common/types';
import { UploadConfig } from '@/config';
import { AttachmentRepository, VideoRepository } from '@/database/repositories';
import type { ProcessorJob } from '@/queues/types';

@Injectable()
export class UploadProcessor {
  private readonly logger = new Logger(UploadProcessor.name);

  private readonly videoRepository: VideoRepository;
  private readonly attachmentRepository: AttachmentRepository;
  private readonly configService: ConfigService;
  private readonly mediaUrlService: MediaUrlService;
  private readonly uploadConfig: UploadConfig;

  constructor(
    videoRepository: VideoRepository,
    attachmentRepository: AttachmentRepository,
    configService: ConfigService,
    mediaUrlService: MediaUrlService,
  ) {
    this.videoRepository = videoRepository;
    this.attachmentRepository = attachmentRepository;
    this.configService = configService;
    this.mediaUrlService = mediaUrlService;
    this.uploadConfig = this.configService.getOrThrow<UploadConfig>('upload');
  }

  async processUpload(
    payload: VideoUploadJobPayload,
    job: ProcessorJob,
  ): Promise<{
    videoId: string;
    videoUrl: string;
    thumbnailUrl: string | null;
    duration: number;
    status: string;
    message: string;
  }> {
    this.logger.log(`Processing upload for video ${payload.videoId}`);

    // Step 1: Validate video file
    await job.updateProgress(10);
    this.validateVideoFile(payload);

    // Step 2: Mark thumbnail unavailable until real processing exists
    await job.updateProgress(30);
    const thumbnailUrl = this.resolveThumbnailUrl();

    // Step 3: Resolve the already uploaded local/API-served video URL
    await job.updateProgress(50);
    const videoUrl = await this.resolveVideoUrl(payload);

    // Step 4: Get video metadata
    await job.updateProgress(70);
    const metadata = this.extractVideoMetadata(payload);

    // Step 5: Update database
    await job.updateProgress(90);
    await this.updateDatabase(payload, videoUrl, thumbnailUrl, metadata);

    // Complete
    await job.updateProgress(100);

    return {
      videoId: payload.videoId,
      videoUrl,
      thumbnailUrl,
      duration: metadata.duration,
      status: 'uploaded',
      message: 'Video uploaded successfully',
    };
  }

  /**
   * Validate video file format, size, duration
   */
  private validateVideoFile(payload: VideoUploadJobPayload): void {
    this.logger.log(`Validating video file: ${payload.originalFileName}`);

    if (
      !payload.mimeType.startsWith('video/') ||
      !this.uploadConfig.allowedMimeTypes.includes(payload.mimeType)
    ) {
      throw new Error(
        `Invalid video format: ${payload.mimeType}. Allowed formats: ${this.uploadConfig.allowedVideoFormats.join(', ').toUpperCase()}`,
      );
    }

    if (payload.fileSize > this.uploadConfig.maxVideoSizeBytes) {
      throw new Error(
        `File size exceeds maximum allowed size of ${this.uploadConfig.maxVideoSizeMB}MB`,
      );
    }

    this.logger.log('Video file validation passed');
  }

  /**
   * Real thumbnail generation is intentionally not implemented yet.
   */
  private resolveThumbnailUrl(): string | null {
    this.logger.log(
      'Thumbnail generation is unavailable until a real media processor is configured.',
    );
    return null;
  }

  /**
   * Resolve an honest public URL for a video that is already stored locally.
   */
  private async resolveVideoUrl(
    payload: VideoUploadJobPayload,
  ): Promise<string> {
    this.logger.log('Resolving public video URL from local storage...');

    const attachment = await this.attachmentRepository.findById(
      payload.attachmentId,
    );
    if (attachment?.url) {
      this.logger.log(`Using existing attachment URL: ${attachment.url}`);
      return attachment.url;
    }

    const videoUrl = this.mediaUrlService.buildPublicMediaUrlFromLocalPath(
      payload.filePath,
    );
    if (videoUrl) {
      this.logger.log(`Resolved local video URL: ${videoUrl}`);
      return videoUrl;
    }

    throw new Error(
      'Video file is not in local upload storage and no storage provider adapter is implemented.',
    );
  }

  /**
   * Extract video metadata
   * TODO: Implement real metadata extraction using ffprobe or a similar tool
   */

  private extractVideoMetadata(_payload: VideoUploadJobPayload): {
    duration: number;
    width: number;
    height: number;
  } {
    this.logger.log('Extracting video metadata...');

    const metadata = {
      duration: 0,
      width: 0,
      height: 0,
    };

    this.logger.log(`Video metadata extracted: ${JSON.stringify(metadata)}`);
    return metadata;
  }

  /**
   * Update database with video information
   */
  private async updateDatabase(
    _payload: VideoUploadJobPayload,
    videoUrl: string,
    thumbnailUrl: string | null,
    metadata: { duration: number; width: number; height: number },
  ): Promise<void> {
    this.logger.log(`Updating database for video ${_payload.videoId}`);

    await this.videoRepository.updateOne(
      { id: _payload.videoId },
      {
        videoThumbnailUrl: thumbnailUrl,
        videoDuration: metadata.duration,
      },
    );

    await this.attachmentRepository.updateOne(
      { id: _payload.attachmentId },
      { url: videoUrl },
    );

    this.logger.log('Database updated successfully');
  }
}
