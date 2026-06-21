import { resolve, relative } from 'path';

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { UploadConfig } from '@/config';

const ABSOLUTE_URL_RE = /^[a-z][a-z\d+\-.]*:/i;

@Injectable()
export class MediaUrlService {
  private readonly uploadConfig: UploadConfig;

  constructor(private readonly configService: ConfigService) {
    this.uploadConfig = this.configService.getOrThrow<UploadConfig>('upload');
  }

  buildPublicMediaUrl(storedRelativePath: string): string {
    const normalizedPath = this.normalizeStoredPath(storedRelativePath);
    const publicBaseUrl = this.getPublicMediaBaseUrl();

    return `${publicBaseUrl}/${normalizedPath}`;
  }

  buildPublicMediaUrlFromLocalPath(localPath: string): string | null {
    const uploadRoot = resolve(process.cwd(), this.uploadConfig.localUploadDir);
    const absoluteLocalPath = resolve(localPath);
    const relativePath = relative(uploadRoot, absoluteLocalPath);

    if (
      !relativePath ||
      relativePath.startsWith('..') ||
      resolve(uploadRoot, relativePath) !== absoluteLocalPath
    ) {
      return null;
    }

    return this.buildPublicMediaUrl(relativePath);
  }

  getPublicMediaBaseUrl(): string {
    const baseUrl =
      this.uploadConfig.cdnBaseUrl || this.uploadConfig.localPublicBaseUrl;

    return baseUrl.replace(/\/+$/, '');
  }

  private normalizeStoredPath(storedRelativePath: string): string {
    const raw = storedRelativePath.trim().replace(/\\/g, '/');

    if (!raw) {
      throw new Error('Media path is required.');
    }

    if (ABSOLUTE_URL_RE.test(raw)) {
      throw new Error('Media path must be relative, not an absolute URL.');
    }

    return raw.replace(/^\/+/, '').replace(/^uploads\/+/i, '');
  }
}
