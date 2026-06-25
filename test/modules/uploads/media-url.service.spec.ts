import { join } from 'path';

import { ConfigService } from '@nestjs/config';

import { MediaUrlService } from '@/common/media';
import { UploadConfig } from '@/config';

const baseUploadConfig: UploadConfig = {
  storageProvider: 'local',
  localUploadDir: 'uploads',
  localPublicBaseUrl: 'http://api.example.com/uploads',
  cdnBaseUrl: undefined,
  maxVideoSizeMB: 500,
  maxVideoSizeBytes: 500 * 1024 * 1024,
  maxAudioSizeMB: 50,
  maxAudioSizeBytes: 50 * 1024 * 1024,
  allowedVideoFormats: ['mp4'],
  allowedAudioFormats: ['mp3'],
  allowedImageMimeTypes: ['image/jpeg'],
  allowedAudioMimeTypes: ['audio/mpeg'],
  allowedMimeTypes: ['video/mp4', 'image/jpeg', 'audio/mpeg'],
};

const createService = (overrides: Partial<UploadConfig> = {}) =>
  new MediaUrlService({
    getOrThrow: jest.fn().mockReturnValue({
      ...baseUploadConfig,
      ...overrides,
    }),
  } as unknown as ConfigService);

describe('MediaUrlService', () => {
  it('builds local public URLs from stored relative paths', () => {
    const service = createService();

    expect(service.buildPublicMediaUrl('/uploads/videos/video.mp4')).toBe(
      'http://api.example.com/uploads/videos/video.mp4',
    );
    expect(service.buildPublicMediaUrl('images\\image.jpg')).toBe(
      'http://api.example.com/uploads/images/image.jpg',
    );
  });

  it('keeps local storage URLs on the configured public upload base', () => {
    const service = createService({
      cdnBaseUrl: 'https://cdn.example.com/uploads/',
    });

    expect(service.buildPublicMediaUrl('videos/video.mp4')).toBe(
      'http://api.example.com/uploads/videos/video.mp4',
    );
  });

  it('uses CDN base only for non-local storage provider URLs', () => {
    const service = createService({
      storageProvider: 'cloud',
      cdnBaseUrl: 'https://cdn.example.com/uploads/',
    });

    expect(service.buildPublicMediaUrl('videos/video.mp4')).toBe(
      'https://cdn.example.com/uploads/videos/video.mp4',
    );
  });

  it('derives public URLs only for files under local upload storage', () => {
    const service = createService();

    const uploadPath = join(process.cwd(), 'uploads', 'videos', 'video.mp4');
    const outsidePath = join(process.cwd(), 'other', 'video.mp4');

    expect(service.buildPublicMediaUrlFromLocalPath(uploadPath)).toBe(
      'http://api.example.com/uploads/videos/video.mp4',
    );
    expect(service.buildPublicMediaUrlFromLocalPath(outsidePath)).toBeNull();
  });

  it('rejects absolute URL inputs as stored media paths', () => {
    const service = createService();

    expect(() =>
      service.buildPublicMediaUrl('https://cdn.example.com/videos/video.mp4'),
    ).toThrow('Media path must be relative');
  });

  it('resolves response media values without rewriting fetchable absolute URLs', () => {
    const service = createService();

    expect(service.resolvePublicMediaUrl('images/image.jpg')).toBe(
      'http://api.example.com/uploads/images/image.jpg',
    );
    expect(
      service.resolvePublicMediaUrl('https://media.example.com/video.mp4'),
    ).toBe('https://media.example.com/video.mp4');
    expect(service.resolvePublicMediaUrl('file:///tmp/video.mp4')).toBeNull();
  });
});
