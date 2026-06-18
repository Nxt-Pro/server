import * as Yup from 'yup';

export const cacheSchema = Yup.object({
  REDIS_DB_CACHE: Yup.number()
    .transform((_, orig) =>
      orig === undefined || orig === '' ? undefined : Number(orig),
    )
    .min(0)
    .default(1),
  CACHE_TTL: Yup.number()
    .transform((_, orig) =>
      orig === undefined || orig === '' ? undefined : Number(orig),
    )
    .min(1)
    .default(300),
});
