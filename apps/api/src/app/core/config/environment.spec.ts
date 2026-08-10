import { validateEnvironment } from './environment';

describe('validateEnvironment', () => {
  const validEnvironment = {
    NODE_ENV: 'development',
    MONGODB_URI:
      'mongodb://localhost:27017/project_ql?replicaSet=rs0&directConnection=true',
  };

  it('normalizes defaults into typed runtime values', () => {
    expect(validateEnvironment(validEnvironment)).toEqual(
      expect.objectContaining({
        NODE_ENV: 'development',
        API_PORT: 3000,
        WEB_ORIGIN: 'http://localhost:4200',
        MAX_UPLOAD_SIZE_MB: 20,
        JSON_BODY_LIMIT: '100kb',
        ENABLE_SWAGGER: true,
        THROTTLE_TTL_MS: 60_000,
        THROTTLE_LIMIT: 120,
      }),
    );
  });

  it('rejects a malformed MongoDB URI', () => {
    expect(() =>
      validateEnvironment({ ...validEnvironment, MONGODB_URI: 'not-a-uri' }),
    ).toThrow('MONGODB_URI');
  });

  it('rejects wildcard CORS origins when credentials are enabled', () => {
    expect(() =>
      validateEnvironment({ ...validEnvironment, WEB_ORIGIN: '*' }),
    ).toThrow('WEB_ORIGIN');
  });

  it('requires an explicit web origin in production', () => {
    expect(() =>
      validateEnvironment({ ...validEnvironment, NODE_ENV: 'production' }),
    ).toThrow('WEB_ORIGIN');
  });

  it('rejects invalid numeric limits', () => {
    expect(() =>
      validateEnvironment({ ...validEnvironment, THROTTLE_LIMIT: '0' }),
    ).toThrow('THROTTLE_LIMIT');
  });
});
