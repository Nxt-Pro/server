import * as Yup from 'yup';

export const jwtSchema = Yup.object({
  JWT_SECRET: Yup.string()
    .required('JWT_SECRET is required')
    .min(32)
    .notOneOf(
      ['your_jwt_secret', 'secret', 'password'],
      'JWT_SECRET is too weak',
    ),
  JWT_EXPIRES_IN: Yup.string().default('7d'),
  JWT_REFRESH_SECRET: Yup.string()
    .required('JWT_REFRESH_SECRET is required')
    .min(32),
  JWT_REFRESH_EXPIRES_IN: Yup.string().default('30d'),
});
