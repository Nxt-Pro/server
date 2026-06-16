import { promises as fs } from 'fs';
import { extname, join } from 'path';

import { BadRequestException, Injectable } from '@nestjs/common';
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
    if (rawExt) return rawExt;

    if (mimeType.includes('jpeg') || mimeType.includes('jpg')) return 'jpg';
    if (mimeType.includes('png')) return 'png';
    if (mimeType.includes('webp')) return 'webp';
    if (mimeType.includes('gif')) return 'gif';
    if (mimeType.includes('heic')) return 'heic';
    if (mimeType.includes('heif')) return 'heif';
    if (mimeType.includes('mov') || mimeType.includes('quicktime'))
      return 'mov';
    if (mimeType.includes('webm')) return 'webm';
    if (mimeType.includes('avi')) return 'avi';
    if (mimeType.includes('mkv') || mimeType.includes('matroska')) return 'mkv';

    return detectedType === 'video' ? 'mp4' : 'jpg';
  }
}
