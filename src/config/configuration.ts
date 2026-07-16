import { registerAs } from '@nestjs/config';

export interface JwtConfig {
  accessSecret: string;
  refreshSecret: string;
  accessTtl: string;
  refreshTtl: string;
}

export interface OtpConfig {
  ttlMinutes: number;
}

export interface MailConfig {
  provider: 'smtp' | 'firebase' | 'console' | 'auto';
  host?: string;
  port: number;
  user?: string;
  pass?: string;
  from: string;
}

export interface PushConfig {
  enabled: boolean;
}

export interface FirebaseConfig {
  serviceAccountBase64?: string;
  projectId?: string;
  mailCollection: string;
  isConfigured: boolean;
}

export interface GeminiConfig {
  apiKey?: string;
  model: string;
}

export interface MediaConfig {
  storageDir: string;
  maxSizeMb: number;
  provider: 'local' | 'b2';
  b2: {
    endpoint: string;
    region: string;
    bucket: string;
    keyId?: string;
    applicationKey?: string;
    keyPrefix: string;
    presignExpiresInSec: number;
    isConfigured: boolean;
  };
}

export interface WebRtcConfig {
  iceServers: Array<{ urls: string | string[]; username?: string; credential?: string }>;
}

export interface AppConfig {
  nodeEnv: string;
  isProd: boolean;
  port: number;
  wsPort: number;
  databaseUrl: () => string;
  jwt: JwtConfig;
  otp: OtpConfig;
  mail: MailConfig;
  push: PushConfig;
  firebase: FirebaseConfig;
  gemini: GeminiConfig;
  media: MediaConfig;
  webrtc: WebRtcConfig;
}

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Variable d'environnement manquante : ${name}`);
  }
  return value;
}

function optional(name: string, fallback = ''): string {
  return process.env[name] ?? fallback;
}

export default registerAs('app', (): AppConfig => {
  const nodeEnv = optional('NODE_ENV', 'development');
  const isProd = nodeEnv === 'production';

  return {
    nodeEnv,
    isProd,
    port: parseInt(optional('PORT', '3000'), 10),
    wsPort: parseInt(optional('WS_PORT', '3001'), 10),
    databaseUrl: () => required('DATABASE_URL'),

    jwt: {
      accessSecret: required('JWT_ACCESS_SECRET'),
      refreshSecret: required('JWT_REFRESH_SECRET'),
      accessTtl: optional('JWT_ACCESS_TTL', '15m'),
      refreshTtl: optional('JWT_REFRESH_TTL', '7d'),
    },

    otp: {
      ttlMinutes: Number(optional('OTP_TTL_MINUTES', '10')),
    },

    mail: {
      provider: optional('MAIL_PROVIDER', 'smtp').toLowerCase() as MailConfig['provider'],
      host: optional('SMTP_HOST'),
      port: Number(optional('SMTP_PORT', '587')),
      user: optional('SMTP_USER'),
      pass: optional('SMTP_PASS'),
      from: optional('MAIL_FROM', 'Alanya <no-reply@alanya.app>'),
    },

    push: {
      enabled: (() => {
        const flag = optional('PUSH_ENABLED', 'true').toLowerCase();
        if (flag === '0' || flag === 'false') return false;
        return Boolean(optional('FIREBASE_SERVICE_ACCOUNT_BASE64'));
      })(),
    },

    firebase: {
      serviceAccountBase64: optional('FIREBASE_SERVICE_ACCOUNT_BASE64') || undefined,
      projectId: optional('FIREBASE_PROJECT_ID') || undefined,
      mailCollection: optional('FIREBASE_MAIL_COLLECTION', 'mail'),
      isConfigured: Boolean(optional('FIREBASE_SERVICE_ACCOUNT_BASE64')),
    },

    gemini: {
      apiKey: optional('GEMINI_API_KEY') || undefined,
      model: optional('GEMINI_MODEL', 'gemini-2.5-flash'),
    },

    media: {
      storageDir: optional('MEDIA_STORAGE_DIR', './storage/media'),
      maxSizeMb: Number(optional('MEDIA_MAX_SIZE_MB', '50')),
      provider: optional('MEDIA_STORAGE_PROVIDER', 'local').toLowerCase() as 'local' | 'b2',
      b2: {
        endpoint: optional('B2_ENDPOINT', 's3.us-west-004.backblazeb2.com'),
        region: optional('B2_REGION', 'us-west-004'),
        bucket: optional('B2_BUCKET', 'alanya'),
        keyId: optional('B2_KEY_ID') || undefined,
        applicationKey: optional('B2_APPLICATION_KEY') || undefined,
        keyPrefix: optional('B2_KEY_PREFIX', 'media/'),
        presignExpiresInSec: Number(optional('B2_PRESIGN_EXPIRES_IN_SEC', '3600')),
        isConfigured: Boolean(
          optional('B2_BUCKET') && optional('B2_KEY_ID') && optional('B2_APPLICATION_KEY'),
        ),
      },
    },

    webrtc: {
      iceServers: (() => {
        const servers: Array<{ urls: string | string[]; username?: string; credential?: string }> = [];

        const stunRaw = optional(
          'STUN_URLS',
          'stun:stun.l.google.com:19302,stun:stun1.l.google.com:19302,stun:stun.cloudflare.com:3478',
        );
        for (const url of stunRaw.split(',').map((s) => s.trim()).filter(Boolean)) {
          servers.push({ urls: url });
        }

        const meteredKey = optional('METERED_API_KEY');
        const meteredDomainRaw = optional('METERED_DOMAIN');
        if (meteredKey && meteredDomainRaw) {
          const meteredDomain = meteredDomainRaw.replace(/^https?:\/\//, '');
          servers.push({
            urls: [`turn:${meteredDomain}:3478`, `turns:${meteredDomain}:443`],
            username: meteredKey,
            credential: meteredKey,
          });
        }

        const turnUrl = optional('TURN_URL');
        if (turnUrl) {
          const entry: { urls: string; username?: string; credential?: string } = { urls: turnUrl };
          const user = optional('TURN_USERNAME');
          const cred = optional('TURN_CREDENTIAL');
          if (user) entry.username = user;
          if (cred) entry.credential = cred;
          servers.push(entry);
        }

        return servers;
      })(),
    },
  };
});