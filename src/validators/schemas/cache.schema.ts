import * as Yup from 'yup';

export const cacheSchema = Yup.object({
  REDIS_DB_CACHE: Yup.number()
    .transform((_, orig) => Number(orig))
    .required(),
  CACHE_TTL: Yup.number()
    .transform((_, orig) => Number(orig))
    .min(1)
    .required(),
});
