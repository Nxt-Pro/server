import * as Yup from 'yup';

export const databaseSchema = Yup.object({
  DB_HOST: Yup.string().required('DB_HOST is required'),
  DB_PORT: Yup.number()
    .transform((_, original) => Number(original))
    .required('DB_PORT is required'),
  DB_USERNAME: Yup.string().required('DB_USERNAME is required'),
  DB_PASSWORD: Yup.string().required('DB_PASSWORD is required'),
  DB_NAME: Yup.string().required('DB_NAME is required'),
});
