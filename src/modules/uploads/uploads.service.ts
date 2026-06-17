import { promises as fs } from 'fs';
import { extname, join } from 'path';

import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ulid } from 'ulid';

import { UploadConfig } from '@/config';

interface UploadResult {
  url: string;
  fileName: string;
  contentType: 'image' | 'video';
  mimeType: string;
  size: number;
}

interface UploadableFile {
  originalname?: string;
  mimetype?: string;
  size?: number;
  buffer?: Buffer;
  path?: string;
}

const MIME_EXTENSION_MAP: Record<string, string[]> = {
  'image/jpeg': ['jpg', 'jpeg'],
  'image/png': ['png'],
  'image/webp': ['webp'],
  'image/gif': ['gif'],
  'image/heic': ['heic'],
  'image/heif': ['heif'],
  'video/mp4': ['mp4'],
  'video/quicktime': ['mov'],
  'video/x-m4v': ['m4v'],
  'video/x-msvideo': ['avi'],
  'video/webm': ['webm'],
  'video/x-matroska': ['mkv'],
  'video/3gpp': ['3gp', '3gpp'],
  'video/x-flv': ['flv'],
  'video/x-ms-wmv': ['wmv'],
};

@Injectable()
export class UploadsService {
  private readonly uploadConfig: UploadConfig;

  constructor(private readonly configService: ConfigService) {
    this.uploadConfig = this.configService.getOrThrow<UploadConfig>('upload');
  }

  async storeUploadedFile(
    file: unknown,
    resourceType?: 'image' | 'video',
    publicBaseUrl?: string,
  ): Promise<UploadResult> {
    const normalizedFile = this.toUploadableFile(file);

    try {
      const mimeType = (normalizedFile.mimetype ?? '').toLowerCase();
      if (!mimeType) {
        throw new BadRequestException('Uploaded file has no MIME type.');
      }

      if (!this.uploadConfig.allowedMimeTypes.includes(mimeType)) {
        throw new BadRequestException(`Unsupported file type: ${mimeType}`);
      }

      const size = normalizedFile.size ?? 0;
      if (size <= 0) {
        throw new BadRequestException('Uploaded file is empty.');
      }

      if (size > this.uploadConfig.maxVideoSizeBytes) {
        throw new BadRequestException(
          `File is too large. Max allowed size is ${this.uploadConfig.maxVideoSizeMB}MB.`,
        );
      }

      if (this.uploadConfig.storageProvider !== 'local') {
        throw new ServiceUnavailableException(
          'Cloud upload storage is configured, but no cloud storage adapter is implemented.',
        );
      }

      const detectedType: 'image' | 'video' = mimeType.startsWith('video/')
        ? 'video'
        : 'image';

      if (resourceType && resourceType !== detectedType) {
        throw new BadRequestException(
          `Resource type mismatch. Expected ${resourceType}, got ${detectedType}.`,
        );
      }

      const extension = this.resolveExtension(
        normalizedFile.originalname ?? '',
        mimeType,
        detectedType,
      );
      const fileName = `${ulid()}.${extension}`;
      const folder = detectedType === 'video' ? 'videos' : 'images';

      const relativePath = `${folder}/${fileName}`;
      const targetDir = join(
        process.cwd(),
        this.uploadConfig.localUploadDir,
        folder,
      );
      const targetPath = join(targetDir, fileName);

      await fs.mkdir(targetDir, { recursive: true });

      if (normalizedFile.buffer && normalizedFile.buffer.length > 0) {
        await fs.writeFile(targetPath, normalizedFile.buffer);
      } else if (normalizedFile.path) {
        await fs.copyFile(normalizedFile.path, targetPath);
        await fs.unlink(normalizedFile.path).catch(() => undefined);
      } else {
        throw new BadRequestException('Unable to read uploaded file contents.');
      }

      const publicBase = (
        publicBaseUrl || this.uploadConfig.localPublicBaseUrl
      ).replace(/\/+$/, '');

      return {
        url: `${publicBase}/${relativePath.replace(/\\/g, '/')}`,
        fileName,
        contentType: detectedType,
        mimeType,
        size,
      };
    } catch (error) {
      await this.cleanupTemporaryFile(normalizedFile);
      throw error;
    }
  }

  private toUploadableFile(file: unknown): UploadableFile {
    if (!file || typeof file !== 'object') {
      throw new BadRequestException('No file provided.');
    }

    return file as UploadableFile;
  }

  private resolveExtension(
    originalName: string,
    mimeType: string,
    detectedType: 'image' | 'video',
  ): string {
    const rawExt = extname(originalName).replace('.', '').trim().toLowerCase();
    const allowedExtensions = MIME_EXTENSION_MAP[mimeType] ?? [];

    if (rawExt && allowedExtensions.includes(rawExt)) {
      return rawExt;
    }

    if (allowedExtensions.length > 0) {
      return allowedExtensions[0];
    }

    return detectedType === 'video' ? 'mp4' : 'jpg';
  }

  private async cleanupTemporaryFile(file: UploadableFile): Promise<void> {
    if (!file.path) return;
    await fs.unlink(file.path).catch(() => undefined);
  }
}
