export type RuntimeEnvironment = 'development' | 'test' | 'production';

export interface EnvironmentVariables {
  NODE_ENV: RuntimeEnvironment;
  API_PORT: number;
  WEB_ORIGIN: string;
  MONGODB_URI: string;
  FILE_STORAGE_ROOT: string;
  MAX_UPLOAD_SIZE_MB: number;
  JSON_BODY_LIMIT: string;
  URLENCODED_PARAMETER_LIMIT: number;
  ENABLE_SWAGGER: boolean;
  THROTTLE_TTL_MS: number;
  THROTTLE_LIMIT: number;
  TRUST_PROXY_HOPS: number;
  JWT_ACCESS_SECRET: string;
  ACCESS_TOKEN_TTL_SECONDS: number;
  REFRESH_TOKEN_TTL_DAYS: number;
  AUTH_COOKIE_SECURE: boolean;
  SEED_ADMIN_EMAIL?: string;
  SEED_ADMIN_PASSWORD?: string;
  SEED_ADMIN_DISPLAY_NAME: string;
}

function readString(
  environment: Record<string, unknown>,
  key: string,
  fallback?: string,
): string {
  const rawValue = environment[key];
  const value = typeof rawValue === 'string' ? rawValue.trim() : '';
  const resolvedValue = value || fallback;

  if (!resolvedValue) {
    throw new Error(`${key} is required`);
  }

  return resolvedValue;
}

function readInteger(
  environment: Record<string, unknown>,
  key: string,
  fallback: number,
  minimum: number,
  maximum: number,
): number {
  const rawValue = environment[key];
  const value =
    rawValue === undefined || rawValue === '' ? fallback : Number(rawValue);

  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw new Error(
      `${key} must be an integer between ${minimum} and ${maximum}`,
    );
  }

  return value;
}

function readBoolean(
  environment: Record<string, unknown>,
  key: string,
  fallback: boolean,
): boolean {
  const rawValue = environment[key];
  if (rawValue === undefined || rawValue === '') return fallback;
  if (rawValue === true || rawValue === 'true') return true;
  if (rawValue === false || rawValue === 'false') return false;
  throw new Error(`${key} must be true or false`);
}

function readOptionalString(
  environment: Record<string, unknown>,
  key: string,
): string | undefined {
  const rawValue = environment[key];
  if (typeof rawValue !== 'string') return undefined;
  return rawValue.trim() || undefined;
}

function readRuntimeEnvironment(
  environment: Record<string, unknown>,
): RuntimeEnvironment {
  const value = readString(environment, 'NODE_ENV', 'development');
  if (value === 'development' || value === 'test' || value === 'production') {
    return value;
  }
  throw new Error('NODE_ENV must be development, test, or production');
}

function validateMongoUri(uri: string): void {
  try {
    const parsedUri = new URL(uri);
    if (
      parsedUri.protocol !== 'mongodb:' &&
      parsedUri.protocol !== 'mongodb+srv:'
    ) {
      throw new Error('unsupported protocol');
    }
  } catch {
    throw new Error('MONGODB_URI must be a valid MongoDB connection URI');
  }
}

export function validateEnvironment(
  environment: Record<string, unknown>,
): EnvironmentVariables {
  const nodeEnvironment = readRuntimeEnvironment(environment);
  const mongoUri = readString(environment, 'MONGODB_URI');
  validateMongoUri(mongoUri);

  const configuredWebOrigin = readString(
    environment,
    'WEB_ORIGIN',
    nodeEnvironment === 'production' ? undefined : 'http://localhost:4200',
  );
  const allowedOrigins = configuredWebOrigin
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  if (allowedOrigins.length === 0 || allowedOrigins.includes('*')) {
    throw new Error(
      'WEB_ORIGIN must contain explicit origins and cannot use *',
    );
  }

  const jsonBodyLimit = readString(environment, 'JSON_BODY_LIMIT', '100kb');
  if (!/^\d+(?:kb|mb)$/i.test(jsonBodyLimit)) {
    throw new Error('JSON_BODY_LIMIT must use a value such as 100kb or 2mb');
  }

  const jwtAccessSecret = readString(environment, 'JWT_ACCESS_SECRET');
  if (jwtAccessSecret.length < 32) {
    throw new Error('JWT_ACCESS_SECRET must contain at least 32 characters');
  }
  const seedAdminEmail = readOptionalString(environment, 'SEED_ADMIN_EMAIL');
  const seedAdminPassword = readOptionalString(
    environment,
    'SEED_ADMIN_PASSWORD',
  );
  if (Boolean(seedAdminEmail) !== Boolean(seedAdminPassword)) {
    throw new Error(
      'SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD must be configured together',
    );
  }
  if (seedAdminPassword && seedAdminPassword.length < 12) {
    throw new Error('SEED_ADMIN_PASSWORD must contain at least 12 characters');
  }

  return {
    NODE_ENV: nodeEnvironment,
    API_PORT: readInteger(environment, 'API_PORT', 3000, 1, 65_535),
    WEB_ORIGIN: allowedOrigins.join(','),
    MONGODB_URI: mongoUri,
    FILE_STORAGE_ROOT: readString(
      environment,
      'FILE_STORAGE_ROOT',
      './storage/uploads',
    ),
    MAX_UPLOAD_SIZE_MB: readInteger(
      environment,
      'MAX_UPLOAD_SIZE_MB',
      20,
      1,
      100,
    ),
    JSON_BODY_LIMIT: jsonBodyLimit.toLowerCase(),
    URLENCODED_PARAMETER_LIMIT: readInteger(
      environment,
      'URLENCODED_PARAMETER_LIMIT',
      100,
      1,
      1_000,
    ),
    ENABLE_SWAGGER: readBoolean(
      environment,
      'ENABLE_SWAGGER',
      nodeEnvironment !== 'production',
    ),
    THROTTLE_TTL_MS: readInteger(
      environment,
      'THROTTLE_TTL_MS',
      60_000,
      1_000,
      3_600_000,
    ),
    THROTTLE_LIMIT: readInteger(environment, 'THROTTLE_LIMIT', 120, 1, 10_000),
    TRUST_PROXY_HOPS: readInteger(environment, 'TRUST_PROXY_HOPS', 0, 0, 10),
    JWT_ACCESS_SECRET: jwtAccessSecret,
    ACCESS_TOKEN_TTL_SECONDS: readInteger(
      environment,
      'ACCESS_TOKEN_TTL_SECONDS',
      900,
      60,
      3_600,
    ),
    REFRESH_TOKEN_TTL_DAYS: readInteger(
      environment,
      'REFRESH_TOKEN_TTL_DAYS',
      30,
      1,
      90,
    ),
    AUTH_COOKIE_SECURE: readBoolean(
      environment,
      'AUTH_COOKIE_SECURE',
      nodeEnvironment === 'production',
    ),
    ...(seedAdminEmail
      ? { SEED_ADMIN_EMAIL: seedAdminEmail.toLowerCase() }
      : {}),
    ...(seedAdminPassword ? { SEED_ADMIN_PASSWORD: seedAdminPassword } : {}),
    SEED_ADMIN_DISPLAY_NAME: readString(
      environment,
      'SEED_ADMIN_DISPLAY_NAME',
      'System Administrator',
    ),
  };
}
