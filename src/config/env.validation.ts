import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  // App
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().default(3000),
  WS_PORT: Joi.number().default(3001),

  // Database
  DATABASE_URL: Joi.string().uri().required(),

  // JWT
  JWT_ACCESS_SECRET: Joi.string().min(32).required(),
  JWT_REFRESH_SECRET: Joi.string().min(32).required(),
  JWT_ACCESS_TTL: Joi.string().default('15m'),
  JWT_REFRESH_TTL: Joi.string().default('7d'),

  // OTP
  OTP_TTL_MINUTES: Joi.number().default(10),

  // Mail
  MAIL_PROVIDER: Joi.string().valid('smtp', 'firebase', 'console', 'auto').default('smtp'),
  SMTP_HOST: Joi.string().when('MAIL_PROVIDER', { is: 'smtp', then: Joi.required() }),
  SMTP_PORT: Joi.number().default(587),
  SMTP_USER: Joi.string().when('MAIL_PROVIDER', { is: 'smtp', then: Joi.required() }),
  SMTP_PASS: Joi.string().when('MAIL_PROVIDER', { is: 'smtp', then: Joi.required() }),
  MAIL_FROM: Joi.string().email().default('Alanya <no-reply@alanya.app>'),

  // Firebase
  FIREBASE_SERVICE_ACCOUNT_BASE64: Joi.string().allow(''),
  FIREBASE_PROJECT_ID: Joi.string().allow(''),
  FIREBASE_MAIL_COLLECTION: Joi.string().default('mail'),

  // Gemini
  GEMINI_API_KEY: Joi.string().allow(''),
  GEMINI_MODEL: Joi.string().default('gemini-2.5-flash'),

  // Media
  MEDIA_STORAGE_DIR: Joi.string().default('./storage/media'),
  MEDIA_MAX_SIZE_MB: Joi.number().default(50),
  MEDIA_STORAGE_PROVIDER: Joi.string().valid('local', 'b2').default('local'),
  B2_ENDPOINT: Joi.string().allow(''),
  B2_REGION: Joi.string().allow(''),
  B2_BUCKET: Joi.string().allow(''),
  B2_KEY_ID: Joi.string().allow(''),
  B2_APPLICATION_KEY: Joi.string().allow(''),
  B2_KEY_PREFIX: Joi.string().default('media/'),
  B2_PRESIGN_EXPIRES_IN_SEC: Joi.number().default(3600),

  // WebRTC
  STUN_URLS: Joi.string().default('stun:stun.l.google.com:19302,stun:stun1.l.google.com:19302,stun:stun.cloudflare.com:3478'),
  METERED_API_KEY: Joi.string().allow(''),
  METERED_DOMAIN: Joi.string().allow(''),
  TURN_URL: Joi.string().allow(''),
  TURN_USERNAME: Joi.string().allow(''),
  TURN_CREDENTIAL: Joi.string().allow(''),

  // Push
  PUSH_ENABLED: Joi.boolean().default(true),
}).unknown(true);