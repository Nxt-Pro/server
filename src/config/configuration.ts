import {
  aiConfig,
  cacheConfig,
  databaseConfig,
  queueConfig,
  uploadConfig,
} from '.';

export default () => {
  const googleClientIdsFromCsv = (process.env.GOOGLE_OAUTH_CLIENT_IDS ?? '')
    .split(',')
    .map(value => value.trim())
    .filter(Boolean);

  const googleClientIds = Array.from(
    new Set(
      [
        ...googleClientIdsFromCsv,
        process.env.GOOGLE_OAUTH_WEB_CLIENT_ID,
        process.env.GOOGLE_OAUTH_ANDROID_CLIENT_ID,
        process.env.GOOGLE_OAUTH_IOS_CLIENT_ID,
        process.env.GOOGLE_OAUTH_EXPO_CLIENT_ID,
      ].filter((value): value is string => Boolean(value)),
    ),
  );

  return {
    nodeEnv: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || '3000', 10),
    corsOrigin: process.env.CORS_ORIGIN || '*',

    jwt: {
      secret: process.env.JWT_SECRET,
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
      refreshSecret: process.env.JWT_REFRESH_SECRET,
      refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
    },

    app: {
      frontendBaseUrl: process.env.FRONTEND_BASE_URL,
    },

    mail: {
      host: process.env.MAIL_HOST,
      port: process.env.MAIL_PORT
        ? parseInt(process.env.MAIL_PORT, 10)
        : undefined,
      user: process.env.MAIL_USER,
      password: process.env.MAIL_PASSWORD,
      secure: process.env.MAIL_SECURE === 'true',
      from: process.env.MAIL_FROM,
    },

    oauth: {
      google: {
        clientIds: googleClientIds,
      },
      facebook: {
        appId: process.env.FACEBOOK_APP_ID,
        appSecret: process.env.FACEBOOK_APP_SECRET,
      },
    },

    // Sub-configs
    database: databaseConfig(),
    queue: queueConfig(),
    cache: cacheConfig(),
    ai: aiConfig(),
    upload: uploadConfig(),
  };
};
