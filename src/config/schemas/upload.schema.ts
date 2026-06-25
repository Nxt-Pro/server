import * as Yup from 'yup';

import { yupUrl } from '@/common/validators/url.validator';

const optionalUrl = (message: string) =>
  yupUrl(
    Yup.string()
      .trim()
      .transform(
        (_value: unknown, originalValue: unknown): string | undefined => {
          if (typeof originalValue !== 'string') return undefined;
          const trimmed = originalValue.trim();
          return trimmed === '' ? undefined : trimmed;
        },
      ),
    message,
  );

export const uploadSchema = Yup.object({
  UPLOAD_STORAGE_PROVIDER: Yup.string()
    .oneOf(
      ['local', 'cloud'],
      'UPLOAD_STORAGE_PROVIDER must be either local or cloud',
    )
    .default('local'),

  UPLOAD_LOCAL_DIR: Yup.string().default('uploads'),

  UPLOAD_PUBLIC_BASE_URL: yupUrl(
    Yup.string(),
    'UPLOAD_PUBLIC_BASE_URL must be a valid URL',
  ).default('http://localhost:3000/uploads'),

  CDN_BASE_URL: optionalUrl('CDN_BASE_URL must be a valid URL'),

  MAX_VIDEO_SIZE_MB: Yup.number()
    .transform((_, orig) =>
      orig === undefined || orig === '' ? undefined : Number(orig),
    )
    .min(1, 'MAX_VIDEO_SIZE_MB must be at least 1MB')
    .max(5000, 'MAX_VIDEO_SIZE_MB cannot exceed 5000MB (5GB)')
    .default(500),

  MAX_AUDIO_SIZE_MB: Yup.number()
    .transform((_, orig) =>
      orig === undefined || orig === '' ? undefined : Number(orig),
    )
    .min(1, 'MAX_AUDIO_SIZE_MB must be at least 1MB')
    .max(500, 'MAX_AUDIO_SIZE_MB cannot exceed 500MB')
    .default(50),

  ALLOWED_VIDEO_FORMATS: Yup.string()
    .default('mp4,mov,m4v,avi,webm,mkv,3gp')
    .test(
      'valid-formats',
      'ALLOWED_VIDEO_FORMATS must be a comma-separated list of video formats (e.g., mp4,mov,avi,webm)',
      value => {
        if (!value) return false;
        const formats = value.split(',').map(f => f.trim().toLowerCase());
        const validFormats = [
          'mp4',
          'mov',
          'm4v',
          'avi',
          'webm',
          'mkv',
          '3gp',
          '3gpp',
          'flv',
          'wmv',
        ];
        return formats.every(format => validFormats.includes(format));
      },
    ),

  ALLOWED_AUDIO_FORMATS: Yup.string()
    .default('mp3,m4a,aac,wav,ogg,oga,flac,webm')
    .test(
      'valid-audio-formats',
      'ALLOWED_AUDIO_FORMATS must be a comma-separated list of audio formats (e.g., mp3,m4a,wav)',
      value => {
        if (!value) return false;
        const formats = value.split(',').map(f => f.trim().toLowerCase());
        const validFormats = [
          'mp3',
          'm4a',
          'aac',
          'wav',
          'wave',
          'ogg',
          'oga',
          'flac',
          'webm',
        ];
        return formats.every(format => validFormats.includes(format));
      },
    ),
});
