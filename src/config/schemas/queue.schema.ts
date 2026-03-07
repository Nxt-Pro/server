import * as Yup from 'yup';

export const queueSchema = Yup.object({
  REDIS_HOST: Yup.string().required('REDIS_HOST for queue is required'),
  REDIS_PORT: Yup.number()
    .transform((_, orig) => Number(orig))
    .required('REDIS_PORT for queue is required'),
  REDIS_PASSWORD: Yup.string(),
  REDIS_DB_QUEUE: Yup.number()
    .transform((_, orig) => Number(orig))
    .required(),
  QUEUE_CONCURRENCY: Yup.number()
    .transform((_, orig) => Number(orig))
    .min(1)
    .required(),
  QUEUE_MAX_RETRIES: Yup.number()
    .transform((_, orig) => Number(orig))
    .min(0)
    .required(),
  QUEUE_LIMITER_MAX: Yup.number()
    .transform((_, orig) => Number(orig))
    .min(1)
    .required(),
  QUEUE_LIMITER_DURATION: Yup.number()
    .transform((_, orig) => Number(orig))
    .min(1)
    .required(),
});
