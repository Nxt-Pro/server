import * as Yup from 'yup';

export const environmentSchema = Yup.object({
  NODE_ENV: Yup.string()
    .required('NODE_ENV is required')
    .oneOf(['development', 'production', 'test']),
  PORT: Yup.number()
    .transform((_, original) => Number(original))
    .required('PORT is required')
    .min(1024)
    .max(65535),
});
