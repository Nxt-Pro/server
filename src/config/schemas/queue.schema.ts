import * as Yup from 'yup';

export const queueSchema = Yup.object({
  REDIS_PROVIDER: Yup.string()
    .oneOf(['local', 'upstash'], 'REDIS_PROVIDER must be local or upstash')
    .default('local'),
  REDIS_URL: Yup.string().test(
    'redis-url-protocol',
    'REDIS_URL must be a valid redis:// or rediss:// URL',
    value => {
      if (!value) return true;
      if (!value.startsWith('redis://') && !value.startsWith('rediss://')) {
        return false;
      }

      try {
        new URL(value);
        return true;
      } catch {
        return false;
      }
    },
  ),
  REDIS_HOST: Yup.string().default('localhost'),
  REDIS_PORT: Yup.number()
    .transform((_, orig) =>
      orig === undefined || orig === '' ? undefined : Number(orig),
    )
    .default(6379),
  REDIS_PASSWORD: Yup.string(),
  REDIS_TLS: Yup.string()
    .oneOf(['true', 'false'], 'REDIS_TLS must be true or false')
    .default('false'),
  REDIS_DB_QUEUE: Yup.number()
    .transform((_, orig) =>
      orig === undefined || orig === '' ? undefined : Number(orig),
    )
    .min(0)
    .default(0),
  QUEUE_CONCURRENCY: Yup.number()
    .transform((_, orig) =>
      orig === undefined || orig === '' ? undefined : Number(orig),
    )
    .min(1)
    .default(5),
  QUEUE_MAX_RETRIES: Yup.number()
    .transform((_, orig) =>
      orig === undefined || orig === '' ? undefined : Number(orig),
    )
    .min(0)
    .default(3),
  QUEUE_LIMITER_MAX: Yup.number()
    .transform((_, orig) =>
      orig === undefined || orig === '' ? undefined : Number(orig),
    )
    .min(1)
    .default(10),
  QUEUE_LIMITER_DURATION: Yup.number()
    .transform((_, orig) =>
      orig === undefined || orig === '' ? undefined : Number(orig),
    )
    .min(1)
    .default(1000),
});
