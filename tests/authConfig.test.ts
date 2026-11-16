// @vitest-environment node
// tests/authConfig.test.ts
// Unit tests for YappOut authentication configuration validation

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  getYappoutAuthConfig,
  YAPPOUT_DEFAULT_APP_ID,
  DEFAULT_AUTH_SERVER_ORIGIN,
  YAPPOUT_CANONICAL_ORIGIN,
} from '@/auth/config';

describe('YappOut Auth Configuration', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.YAPPOUT_ORIGIN;
    delete process.env.YETVAST_AUTH_ORIGIN;
    delete process.env.YETVAST_AUTH_ISSUER;
    delete process.env.YETVAST_AUTH_JWKS_URL;
    delete process.env.YAPPOUT_APP_ID;
    delete process.env.YAPPOUT_CLIENT_SECRET;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('uses development fallback values when in development mode', () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = 'development';
    const config = getYappoutAuthConfig();

    expect(DEFAULT_AUTH_SERVER_ORIGIN).toBe('https://auth.yetvast.com');
    expect(config.appOrigin).toBe('http://localhost:3000');
    expect(config.authServerOrigin).toBe('http://localhost:3001');
    expect(config.authServerIssuer).toBe('http://localhost:3001');
    expect(config.jwksUrl).toBe('http://localhost:3001/.well-known/jwks.json');
    expect(config.applicationId).toBe(YAPPOUT_DEFAULT_APP_ID);
    expect(config.isHttps).toBe(false);
  });

  it('normalizes trailing slashes on origins and issuers', () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = 'development';
    process.env.YAPPOUT_ORIGIN = 'http://localhost:3000///';
    process.env.YETVAST_AUTH_ORIGIN = 'http://localhost:3001//';
    process.env.YETVAST_AUTH_ISSUER = 'http://localhost:3001///';

    const config = getYappoutAuthConfig();
    expect(config.appOrigin).toBe('http://localhost:3000');
    expect(config.authServerOrigin).toBe('http://localhost:3001');
    expect(config.authServerIssuer).toBe('http://localhost:3001');
  });

  it('respects explicitly configured production environment variables', () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = 'production';
    process.env.YAPPOUT_ORIGIN = 'https://yappout.yetvast.com';
    process.env.YETVAST_AUTH_ORIGIN = 'https://auth.yetvast.com';
    process.env.YAPPOUT_APP_ID = 'yappout-prod';

    const config = getYappoutAuthConfig();
    expect(config.appOrigin).toBe('https://yappout.yetvast.com');
    expect(config.authServerOrigin).toBe('https://auth.yetvast.com');
    expect(config.authServerIssuer).toBe('https://auth.yetvast.com');
    expect(config.jwksUrl).toBe('https://auth.yetvast.com/.well-known/jwks.json');
    expect(config.applicationId).toBe('yappout-prod');
    expect(config.isHttps).toBe(true);
  });

  it('throws AuthError when YAPPOUT_ORIGIN is missing in production', () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = 'production';
    delete process.env.YETVAST_ALLOW_TEST_MODE;

    expect(() => getYappoutAuthConfig()).toThrowError(/YAPPOUT_ORIGIN is required in production/);
  });

  it('canonicalizes vercel.app domains to YAPPOUT_CANONICAL_ORIGIN in production', () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = 'production';
    delete process.env.YETVAST_ALLOW_TEST_MODE;
    process.env.YAPPOUT_ORIGIN = 'https://yappout.vercel.app';
    process.env.YETVAST_AUTH_ORIGIN = 'https://auth.yetvast.com';

    const config = getYappoutAuthConfig();
    expect(config.appOrigin).toBe(YAPPOUT_CANONICAL_ORIGIN);
    expect(config.appOrigin).toBe('https://yappout.yetvast.com');
  });

  it('rejects insecure HTTP for non-localhost origins in production', () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = 'production';
    process.env.YAPPOUT_ORIGIN = 'http://insecure-yappout.com';

    expect(() => getYappoutAuthConfig()).toThrowError(/must use HTTPS in production/);
  });
});
