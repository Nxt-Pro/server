export interface UploadConfig {
  storageProvider: 'local' | 'cloud';
  localUploadDir: string;
  localPublicBaseUrl: string;
  cdnBaseUrl: string;
  maxVideoSizeMB: number;
  maxVideoSizeBytes: number;
  allowedVideoFormats: string[];
  allowedImageMimeTypes: string[];
  allowedMimeTypes: string[];
}

export const uploadConfig = (): UploadConfig => {
  const port = process.env.PORT || '3000';
  const maxSizeMB = parseInt(process.env.MAX_VIDEO_SIZE_MB || '500', 10);
  const formats = (process.env.ALLOWED_VIDEO_FORMATS || 'mp4,mov,avi,webm')
    .split(',')
    .map(f => f.trim().toLowerCase());

  const formatToMime: Record<string, string> = {
    mp4: 'video/mp4',
    mov: 'video/quicktime',
    avi: 'video/x-msvideo',
    webm: 'video/webm',
    mkv: 'video/x-matroska',
    flv: 'video/x-flv',
    wmv: 'video/x-ms-wmv',
  };

  const allowedImageMimeTypes = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/heic',
    'image/heif',
  ];

  const allowedVideoMimeTypes = formats
    .map(format => formatToMime[format])
    .filter(Boolean);

  return {
    storageProvider:
      (process.env.UPLOAD_STORAGE_PROVIDER as 'local' | 'cloud') || 'local',
    localUploadDir: process.env.UPLOAD_LOCAL_DIR || 'uploads',
    localPublicBaseUrl:
      process.env.UPLOAD_PUBLIC_BASE_URL || `http://localhost:${port}/uploads`,
    cdnBaseUrl: process.env.CDN_BASE_URL || 'https://cdn.nxtpro.com',
    maxVideoSizeMB: maxSizeMB,
    maxVideoSizeBytes: maxSizeMB * 1024 * 1024,
    allowedVideoFormats: formats,
    allowedImageMimeTypes,
    allowedMimeTypes: [...allowedVideoMimeTypes, ...allowedImageMimeTypes],
  };
};
