// src/auth/config.ts
// Configuration loader and environment validator for Yet Vast Auth integration

import { asApplicationId, AuthError, type ApplicationId } from '@yetvast/auth';
import { assertServerRuntime } from '@yetvast/auth/server';

export const YAPPOUT_SESSION_COOKIE = 'yv_yappout_session';
export const YAPPOUT_TX_COOKIE = 'yv_yappout_tx';
export const YAPPOUT_DEFAULT_APP_ID = 'yappout';
export const DEFAULT_AUTH_SERVER_ORIGIN = 'https://auth.yetvast.com';
export const YAPPOUT_CANONICAL_ORIGIN = 'https://yappout.yetvast.com';

export interface YappoutAuthConfig {
  appOrigin: string;
  authServerOrigin: string;
  authServerIssuer: string;
  jwksUrl: string;
  applicationId: ApplicationId;
  clientSecret?: string;
  isHttps: boolean;
  isTestMode: boolean;
}

function normalizeOrigin(raw: string, varName: string): string {
  const trimmed = raw.trim().replace(/\/+$/, '');
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new AuthError({
      code: 'CONFIGURATION_INVALID',
      message: `${varName} ("${raw}") is not a valid URL.`,
      safeMessage: 'Authentication origin configuration is invalid.',
    });
  }

  const isLocalhost =
    parsed.hostname === 'localhost' ||
    parsed.hostname === '127.0.0.1' ||
    parsed.hostname === '[::1]';

  if (process.env.NODE_ENV === 'production' && !isLocalhost && parsed.protocol !== 'https:') {
    throw new AuthError({
      code: 'CONFIGURATION_INVALID',
      message: `${varName} must use HTTPS in production.`,
      safeMessage: 'Authentication origin must use HTTPS in production.',
    });
  }

  return parsed.origin;
}

/**
 * Returns validated server-side authentication configuration.
 * Strictly asserts server runtime to prevent secrets or internal origins
 * from leaking to client bundles.
 */
export function getYappoutAuthConfig(): YappoutAuthConfig {
  assertServerRuntime();

  const isTestMode = process.env.YETVAST_ALLOW_TEST_MODE === '1';
  const allowDevDefaults = isTestMode || process.env.NODE_ENV !== 'production';

  let rawAppOrigin =
    process.env.YAPPOUT_ORIGIN?.trim() ||
    (allowDevDefaults ? 'http://localhost:3000' : '');

  if (!rawAppOrigin) {
    throw new AuthError({
      code: 'CONFIGURATION_INVALID',
      message: 'YAPPOUT_ORIGIN is required in production (e.g. https://yappout.yetvast.com).',
      safeMessage: 'Application origin is not configured.',
    });
  }

  // Canonicalize Vercel default/preview deployment domains to registered production domain.
  // Yet Vast Auth application registration strictly validates redirect URIs against https://yappout.yetvast.com.
  if (
    !isTestMode &&
    process.env.NODE_ENV === 'production' &&
    (rawAppOrigin.includes('.vercel.app') || rawAppOrigin === 'https://yappout.vercel.app')
  ) {
    rawAppOrigin = YAPPOUT_CANONICAL_ORIGIN;
  }

  const appOrigin = normalizeOrigin(rawAppOrigin, 'YAPPOUT_ORIGIN');

  const rawAuthOrigin =
    process.env.YETVAST_AUTH_ORIGIN?.trim() ||
    (allowDevDefaults ? 'http://localhost:3001' : DEFAULT_AUTH_SERVER_ORIGIN);
  const authServerOrigin = normalizeOrigin(rawAuthOrigin, 'YETVAST_AUTH_ORIGIN');

  const rawIssuer = process.env.YETVAST_AUTH_ISSUER?.trim() || authServerOrigin;
  const authServerIssuer = normalizeOrigin(rawIssuer, 'YETVAST_AUTH_ISSUER');

  const jwksUrl =
    process.env.YETVAST_AUTH_JWKS_URL?.trim() || `${authServerOrigin}/.well-known/jwks.json`;

  const applicationId = asApplicationId(
    process.env.YAPPOUT_APP_ID?.trim() || YAPPOUT_DEFAULT_APP_ID
  );

  const clientSecret = process.env.YAPPOUT_CLIENT_SECRET?.trim() || undefined;

  return {
    appOrigin,
    authServerOrigin,
    authServerIssuer,
    jwksUrl,
    applicationId,
    ...(clientSecret ? { clientSecret } : {}),
    isHttps: appOrigin.startsWith('https://'),
    isTestMode,
  };
}
