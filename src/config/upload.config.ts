export interface UploadConfig {
  storageProvider: 'local' | 'cloud';
  localUploadDir: string;
  localPublicBaseUrl: string;
  cdnBaseUrl?: string;
  maxVideoSizeMB: number;
  maxVideoSizeBytes: number;
  maxAudioSizeMB: number;
  maxAudioSizeBytes: number;
  allowedVideoFormats: string[];
  allowedAudioFormats: string[];
  allowedImageMimeTypes: string[];
  allowedAudioMimeTypes: string[];
  allowedMimeTypes: string[];
}

export const uploadConfig = (): UploadConfig => {
  const port = process.env.PORT || '3000';
  const maxSizeMB = parseInt(process.env.MAX_VIDEO_SIZE_MB || '500', 10);
  const maxAudioSizeMB = parseInt(process.env.MAX_AUDIO_SIZE_MB || '50', 10);
  const videoFormats = (
    process.env.ALLOWED_VIDEO_FORMATS || 'mp4,mov,m4v,avi,webm,mkv,3gp'
  )
    .split(',')
    .map(f => f.trim().toLowerCase());
  const audioFormats = (
    process.env.ALLOWED_AUDIO_FORMATS || 'mp3,m4a,aac,wav,ogg,oga,flac,webm'
  )
    .split(',')
    .map(f => f.trim().toLowerCase());

  const formatToMime: Record<string, string> = {
    mp4: 'video/mp4',
    mov: 'video/quicktime',
    m4v: 'video/x-m4v',
    avi: 'video/x-msvideo',
    webm: 'video/webm',
    mkv: 'video/x-matroska',
    '3gp': 'video/3gpp',
    '3gpp': 'video/3gpp',
    flv: 'video/x-flv',
    wmv: 'video/x-ms-wmv',
  };
  const audioFormatToMime: Record<string, string> = {
    mp3: 'audio/mpeg',
    m4a: 'audio/mp4',
    aac: 'audio/aac',
    wav: 'audio/wav',
    wave: 'audio/wav',
    ogg: 'audio/ogg',
    oga: 'audio/ogg',
    flac: 'audio/flac',
    webm: 'audio/webm',
  };

  const allowedImageMimeTypes = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/heic',
    'image/heif',
  ];

  const allowedVideoMimeTypes = videoFormats
    .map(format => formatToMime[format])
    .filter(Boolean);
  const allowedAudioMimeTypes = audioFormats
    .map(format => audioFormatToMime[format])
    .filter(Boolean);

  return {
    storageProvider:
      (process.env.UPLOAD_STORAGE_PROVIDER as 'local' | 'cloud') || 'local',
    localUploadDir: process.env.UPLOAD_LOCAL_DIR || 'uploads',
    localPublicBaseUrl:
      process.env.UPLOAD_PUBLIC_BASE_URL || `http://localhost:${port}/uploads`,
    cdnBaseUrl: process.env.CDN_BASE_URL?.trim() || undefined,
    maxVideoSizeMB: maxSizeMB,
    maxVideoSizeBytes: maxSizeMB * 1024 * 1024,
    maxAudioSizeMB,
    maxAudioSizeBytes: maxAudioSizeMB * 1024 * 1024,
    allowedVideoFormats: videoFormats,
    allowedAudioFormats: audioFormats,
    allowedImageMimeTypes,
    allowedAudioMimeTypes,
    allowedMimeTypes: [
      ...allowedVideoMimeTypes,
      ...allowedImageMimeTypes,
      ...allowedAudioMimeTypes,
    ],
  };
};
