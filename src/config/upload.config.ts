export interface UploadConfig {
  cdnBaseUrl: string;
  maxVideoSizeMB: number;
  maxVideoSizeBytes: number;
  allowedVideoFormats: string[];
  allowedMimeTypes: string[];
}

export const uploadConfig = (): UploadConfig => {
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

  return {
    cdnBaseUrl: process.env.CDN_BASE_URL || 'https://cdn.nxtpro.com',
    maxVideoSizeMB: maxSizeMB,
    maxVideoSizeBytes: maxSizeMB * 1024 * 1024,
    allowedVideoFormats: formats,
    allowedMimeTypes: formats
      .map(format => formatToMime[format])
      .filter(Boolean),
  };
};
