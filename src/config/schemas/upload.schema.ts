import * as Yup from 'yup';

const optionalUrl = (message: string) =>
  Yup.string()
    .trim()
    .transform(
      (_value: unknown, originalValue: unknown): string | undefined => {
        if (typeof originalValue !== 'string') return undefined;
        const trimmed = originalValue.trim();
        return trimmed === '' ? undefined : trimmed;
      },
    )
    .url(message);

export const uploadSchema = Yup.object({
  UPLOAD_STORAGE_PROVIDER: Yup.string()
    .oneOf(
      ['local', 'cloud'],
      'UPLOAD_STORAGE_PROVIDER must be either local or cloud',
    )
    .default('local'),

  UPLOAD_LOCAL_DIR: Yup.string().default('uploads'),

  UPLOAD_PUBLIC_BASE_URL: Yup.string()
    .url('UPLOAD_PUBLIC_BASE_URL must be a valid URL')
    .default('http://localhost:3000/uploads'),

  CDN_BASE_URL: optionalUrl('CDN_BASE_URL must be a valid URL'),

  MAX_VIDEO_SIZE_MB: Yup.number()
    .transform((_, orig) =>
      orig === undefined || orig === '' ? undefined : Number(orig),
    )
    .min(1, 'MAX_VIDEO_SIZE_MB must be at least 1MB')
    .max(5000, 'MAX_VIDEO_SIZE_MB cannot exceed 5000MB (5GB)')
    .default(500),

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
});
