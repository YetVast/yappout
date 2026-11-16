// src/auth/sessionService.ts
// Server-side session management, JWKS assertion verification, and cookie lifecycle

import {
  assertServerRuntime,
  buildClearSessionCookieHeader,
  buildSessionCookieHeader,
  parseCookieHeader,
  verifyApplicationAssertionJwt,
  verifyCsrfAndOrigin,
  type JwksDocument,
} from '@yetvast/auth/server';
import type { ApplicationIdentityAssertion } from '@yetvast/auth';
import { getYappoutAuthConfig, YAPPOUT_SESSION_COOKIE, YAPPOUT_TX_COOKIE } from './config';
import { assertionToYappoutUser } from './identityService';
import type { YappoutUser } from './types';

assertServerRuntime();

export interface VerifySessionOptions {
  jwks?: JwksDocument;
  jwksUrl?: string;
  nowSeconds?: number;
  fetchImpl?: typeof fetch;
}

/**
 * Verifies a host-bound YappOut session assertion JWT against the central
 * authority's asymmetric JWKS endpoint (`EdDSA` / `RS256`), expected audience, and issuer.
 */
export async function readVerifiedSession(
  rawCookieToken: string | undefined,
  options: VerifySessionOptions = {}
): Promise<ApplicationIdentityAssertion | null> {
  if (!rawCookieToken) {
    return null;
  }

  let env;
  try {
    env = getYappoutAuthConfig();
  } catch {
    return null;
  }

  try {
    return await verifyApplicationAssertionJwt(rawCookieToken, {
      ...(options.jwks !== undefined
        ? { jwks: options.jwks }
        : { jwksUrl: options.jwksUrl ?? env.jwksUrl }),
      ...(options.nowSeconds !== undefined ? { nowSeconds: options.nowSeconds } : {}),
      ...(options.fetchImpl !== undefined ? { fetchImpl: options.fetchImpl } : {}),
      expectedIssuer: env.authServerIssuer,
      expectedAudience: env.applicationId,
    });
  } catch {
    return null;
  }
}

/**
 * Reads and verifies the current session from a Request cookie header, returning
 * the projected YappoutUser if valid.
 */
export async function getVerifiedUserFromRequest(
  request: Request,
  options: VerifySessionOptions = {}
): Promise<YappoutUser | null> {
  const cookies = parseCookieHeader(request.headers.get('cookie'));
  const rawToken = cookies[YAPPOUT_SESSION_COOKIE];
  const assertion = await readVerifiedSession(rawToken, options);
  if (!assertion) {
    return null;
  }
  return assertionToYappoutUser(assertion);
}

/**
 * Creates the host-bound Set-Cookie header for an authenticated session.
 * Never sets Domain (keeps session strictly host-bound, preventing wildcard leak).
 */
export function createSessionCookieHeader(
  assertionToken: string,
  expSeconds: number
): string {
  const env = getYappoutAuthConfig();
  const maxAgeSeconds = Math.max(60, expSeconds - Math.floor(Date.now() / 1000));
  return buildSessionCookieHeader({
    name: YAPPOUT_SESSION_COOKIE,
    value: assertionToken,
    maxAgeSeconds,
    secure: env.isHttps,
    sameSite: 'lax',
    path: '/',
  });
}

/**
 * Creates the Set-Cookie header that expires the local session cookie.
 */
export function createClearSessionCookieHeader(): string {
  const env = getYappoutAuthConfig();
  return buildClearSessionCookieHeader(YAPPOUT_SESSION_COOKIE, {
    secure: env.isHttps,
    sameSite: 'lax',
    path: '/',
  });
}

/**
 * Creates the short-lived host-bound Set-Cookie header for PKCE state and verifier.
 */
export function createTxCookieHeader(payload: { state: string; codeVerifier: string }): string {
  const env = getYappoutAuthConfig();
  return buildSessionCookieHeader({
    name: YAPPOUT_TX_COOKIE,
    value: JSON.stringify(payload),
    maxAgeSeconds: 600, // 10 minutes
    secure: env.isHttps,
    sameSite: 'lax',
    path: '/',
  });
}

/**
 * Creates the Set-Cookie header that clears the PKCE transaction cookie.
 */
export function createClearTxCookieHeader(): string {
  const env = getYappoutAuthConfig();
  return buildClearSessionCookieHeader(YAPPOUT_TX_COOKIE, {
    secure: env.isHttps,
    sameSite: 'lax',
    path: '/',
  });
}

/**
 * Validates request Origin and Referer on mutating endpoints (e.g. POST /api/auth/logout).
 */
export function validateMutationOrigin(request: Request): void {
  const env = getYappoutAuthConfig();
  verifyCsrfAndOrigin({
    requestOriginHeader: request.headers.get('origin'),
    requestRefererHeader: request.headers.get('referer'),
    expectedOrigin: env.appOrigin,
    requireCsrfToken: false,
  });
}
