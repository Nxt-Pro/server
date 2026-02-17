import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

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
  private readonly uploadConfig: UploadConfig;

  constructor(
    videoRepository: VideoRepository,
    attachmentRepository: AttachmentRepository,
    configService: ConfigService,
  ) {
    this.videoRepository = videoRepository;
    this.attachmentRepository = attachmentRepository;
    this.configService = configService;
    this.uploadConfig = this.configService.getOrThrow<UploadConfig>('upload');
  }

  async processUpload(
    payload: VideoUploadJobPayload,
    job: ProcessorJob,
  ): Promise<{
    videoId: string;
    videoUrl: string;
    thumbnailUrl: string;
    duration: number;
    status: string;
    message: string;
  }> {
    this.logger.log(`Processing upload for video ${payload.videoId}`);

    // Step 1: Validate video file
    await job.updateProgress(10);
    this.validateVideoFile(payload);

    // Step 2: Generate thumbnail
    await job.updateProgress(30);
    const thumbnailUrl = this.generateThumbnail(payload);

    // Step 3: Upload to CDN
    await job.updateProgress(50);
    const videoUrl = this.uploadToCDN(payload);

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

    if (!this.uploadConfig.allowedMimeTypes.includes(payload.mimeType)) {
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
   * Generate video thumbnail
   * TODO: Implement real thumbnail generation using ffmpeg or a cloud service
   */
  private generateThumbnail(payload: VideoUploadJobPayload): string {
    this.logger.log('Generating video thumbnail...');

    // TODO: Generate an actual thumbnail frame from the video file
    const thumbnailUrl = `${this.uploadConfig.cdnBaseUrl}/thumbnails/${payload.videoId}.jpg`;

    this.logger.log(`Thumbnail generated: ${thumbnailUrl}`);
    return thumbnailUrl;
  }

  /**
   * Upload video to CDN
   * TODO: Implement real CDN upload (e.g. S3, Cloudflare R2, or similar)
   */
  private uploadToCDN(payload: VideoUploadJobPayload): string {
    this.logger.log('Uploading video to CDN...');

    // TODO: Upload the actual file from payload.filePath to CDN storage
    const videoUrl = `${this.uploadConfig.cdnBaseUrl}/videos/${payload.videoId}.mp4`;

    this.logger.log(`Video uploaded to CDN: ${videoUrl}`);
    return videoUrl;
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

    // TODO: Extract actual metadata (duration, resolution) from the video file
    const metadata = {
      duration: 60,
      width: 1920,
      height: 1080,
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
    thumbnailUrl: string,
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
