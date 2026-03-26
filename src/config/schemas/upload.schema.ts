import * as Yup from 'yup';

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
    .required('UPLOAD_PUBLIC_BASE_URL is required'),

  CDN_BASE_URL: Yup.string()
    .url('CDN_BASE_URL must be a valid URL')
    .required('CDN_BASE_URL is required'),

  MAX_VIDEO_SIZE_MB: Yup.number()
    .transform((_, orig) => Number(orig))
    .min(1, 'MAX_VIDEO_SIZE_MB must be at least 1MB')
    .max(5000, 'MAX_VIDEO_SIZE_MB cannot exceed 5000MB (5GB)')
    .required('MAX_VIDEO_SIZE_MB is required'),

  ALLOWED_VIDEO_FORMATS: Yup.string()
    .required('ALLOWED_VIDEO_FORMATS is required')
    .test(
      'valid-formats',
      'ALLOWED_VIDEO_FORMATS must be a comma-separated list of video formats (e.g., mp4,mov,avi,webm)',
      value => {
        if (!value) return false;
        const formats = value.split(',').map(f => f.trim().toLowerCase());
        const validFormats = ['mp4', 'mov', 'avi', 'webm', 'mkv', 'flv', 'wmv'];
        return formats.every(format => validFormats.includes(format));
      },
    ),
});
