export interface EnvConfig {
  port: number;
  nodeEnv: string;
  databaseUrl: string;
  jwtAccessSecret: string;
  jwtRefreshSecret: string;
  accessTokenExpiry: string;
  refreshTokenExpiry: string;
  dataEncryptionKey: string;
  frontendUrl: string;
  rateLimitWindowMs: number;
  rateLimitMax: number;
}

// Load .env file in development
if (process.env.NODE_ENV !== 'production') {
  const dotenv = require('dotenv');
  dotenv.config();
}

function required(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function optional(key: string, defaultValue: string): string {
  return process.env[key] || defaultValue;
}

function optionalInt(key: string, defaultValue: number): number {
  return parseInt(process.env[key] || String(defaultValue), 10);
}

export function loadConfig(): EnvConfig {
  return {
    port: optionalInt('PORT', 3001),
    nodeEnv: optional('NODE_ENV', 'development'),
    databaseUrl: required('DATABASE_URL'),
    jwtAccessSecret: required('JWT_ACCESS_SECRET'),
    jwtRefreshSecret: required('JWT_REFRESH_SECRET'),
    accessTokenExpiry: optional('ACCESS_TOKEN_EXPIRY', '15m'),
    refreshTokenExpiry: optional('REFRESH_TOKEN_EXPIRY', '7d'),
    dataEncryptionKey: required('DATA_ENCRYPTION_KEY'),
    frontendUrl: optional('FRONTEND_URL', 'http://localhost:5173'),
    rateLimitWindowMs: optionalInt('RATE_LIMIT_WINDOW_MS', 900000),
    rateLimitMax: optionalInt('RATE_LIMIT_MAX', 100),
  };
}

export const config = loadConfig();
