import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';

import {
  BadRequestException,
  Body,
  Controller,
  Post,
  Req,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { AnyFilesInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';

import { UploadsService } from './uploads.service';

const uploadTmpDir = join(
  process.cwd(),
  process.env.UPLOAD_LOCAL_DIR || 'uploads',
  '.tmp',
);

if (!existsSync(uploadTmpDir)) {
  mkdirSync(uploadTmpDir, { recursive: true });
}

@Controller('upload')
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post()
  @UseInterceptors(
    AnyFilesInterceptor({
      dest: uploadTmpDir,
      limits: {
        fileSize: 550 * 1024 * 1024,
      },
    }),
  )
  async uploadSingle(
    @UploadedFiles() files: unknown[],
    @Req()
    req: Request & {
      file?: unknown;
      files?: unknown[] | Record<string, unknown>;
    },
    @Body('resourceType') resourceType?: 'image' | 'video',
  ) {
    const requestFiles = req?.files;
    const fallbackFiles = Array.isArray(requestFiles)
      ? requestFiles
      : requestFiles && typeof requestFiles === 'object'
        ? Object.values(requestFiles).flat()
        : [];

    const file =
      (Array.isArray(files) && files[0]) ||
      (fallbackFiles.length > 0 ? fallbackFiles[0] : undefined) ||
      req?.file;

    if (!file) {
      throw new BadRequestException('No file provided.');
    }

    const uploaded = await this.uploadsService.storeUploadedFile(
      file,
      resourceType,
      this.resolvePublicUploadBaseUrl(req),
    );

    return {
      url: uploaded.url,
      contentType: uploaded.contentType,
      mimeType: uploaded.mimeType,
      fileName: uploaded.fileName,
      size: uploaded.size,
    };
  }

  private resolvePublicUploadBaseUrl(req: Request): string {
    const configuredBase = process.env.UPLOAD_PUBLIC_BASE_URL?.trim();
    if (configuredBase) {
      return configuredBase.replace(/\/+$/, '');
    }

    const forwardedProto = this.firstHeader(req.headers['x-forwarded-proto']);
    const forwardedHost = this.firstHeader(req.headers['x-forwarded-host']);
    const proto = forwardedProto || req.protocol || 'http';
    const host = forwardedHost || req.get('host');

    if (!host) {
      return '/uploads';
    }

    return `${proto}://${host}/uploads`;
  }

  private firstHeader(
    value: string | string[] | undefined,
  ): string | undefined {
    const raw = Array.isArray(value) ? value[0] : value;
    return raw?.split(',')[0]?.trim();
  }
}
