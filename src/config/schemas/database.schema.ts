import * as Yup from 'yup';

export const databaseSchema = Yup.object({
  DB_HOST: Yup.string().required('DB_HOST is required'),
  DB_PORT: Yup.number()
    .transform((_, original) => Number(original))
    .required('DB_PORT is required'),
  DB_USERNAME: Yup.string().required('DB_USERNAME is required'),
  DB_PASSWORD: Yup.string().required('DB_PASSWORD is required'),
  DB_NAME: Yup.string().required('DB_NAME is required'),
  DB_SSL: Yup.string()
    .oneOf(['true', 'false'], 'DB_SSL must be true or false')
    .default('false'),
  DB_SSL_REJECT_UNAUTHORIZED: Yup.string()
    .oneOf(
      ['true', 'false'],
      'DB_SSL_REJECT_UNAUTHORIZED must be true or false',
    )
    .default('false'),
  DB_MIGRATIONS_RUN: Yup.string()
    .oneOf(['true', 'false'], 'DB_MIGRATIONS_RUN must be true or false')
    .default('false'),
  DB_POOL_SIZE: Yup.number()
    .transform((_, original) =>
      original === undefined || original === '' ? undefined : Number(original),
    )
    .min(1)
    .default(20),
  DB_QUERY_TIMEOUT: Yup.number()
    .transform((_, original) =>
      original === undefined || original === '' ? undefined : Number(original),
    )
    .min(1)
    .default(5000),
});
