// src/auth/authService.ts
// High-level OAuth Authorization Code flow with PKCE S256 for YappOut

import { AuthError, toPublicAuthError } from '@yetvast/auth';
import {
  assertServerRuntime,
  createAppAuthorizeRedirect,
  exchangeCodeForAssertion,
  timingSafeEqualStrings,
  type JwksDocument,
} from '@yetvast/auth/server';
import { getYappoutAuthConfig } from './config';
import { assertionToYappoutUser } from './identityService';
import {
  createClearTxCookieHeader,
  createSessionCookieHeader,
  createTxCookieHeader,
} from './sessionService';
import type { YappoutUser } from './types';

assertServerRuntime();

export interface InitiateLoginResult {
  authorizeUrl: string;
  state: string;
  codeVerifier: string;
  txCookieHeader: string;
}

export interface HandleCallbackInput {
  code: string | null;
  state: string | null;
  rawTxCookie: string | null | undefined;
  error?: string | null;
  errorDesc?: string | null;
  fetchImpl?: typeof fetch;
  jwks?: JwksDocument;
}

export interface HandleCallbackResult {
  assertionToken: string;
  user: YappoutUser;
  sessionCookieHeader: string;
  clearTxCookieHeader: string;
}

/**
 * Initiates the OAuth PKCE authorization code flow against Yet Vast Auth.
 */
export function initiateLogin(provider?: string): InitiateLoginResult {
  const env = getYappoutAuthConfig();
  const redirectUri = `${env.appOrigin}/api/auth/callback`;

  const auth = createAppAuthorizeRedirect({
    authServerOrigin: env.authServerOrigin,
    applicationId: env.applicationId,
    redirectUri,
    ...(provider ? { provider } : {}),
  });

  const txCookieHeader = createTxCookieHeader({
    state: auth.state,
    codeVerifier: auth.codeVerifier,
  });

  return {
    authorizeUrl: auth.authorizeUrl,
    state: auth.state,
    codeVerifier: auth.codeVerifier,
    txCookieHeader,
  };
}

/**
 * Handles the OAuth callback: verifies transaction state, exchanges code
 * server-to-server for a signed identity assertion, verifies against JWKS,
 * and produces host-bound session cookies.
 */
export async function handleCallback(input: HandleCallbackInput): Promise<HandleCallbackResult> {
  const env = getYappoutAuthConfig();

  if (input.error) {
    throw new AuthError({
      code: 'PROVIDER_PROTOCOL_ERROR',
      message: input.errorDesc ?? input.error,
      safeMessage: input.errorDesc ?? 'Authentication failed at central authority.',
    });
  }

  if (!input.rawTxCookie || !input.code || !input.state) {
    throw new AuthError({
      code: 'INVALID_STATE',
      message: 'Missing OAuth callback code, state, or transaction cookie.',
      safeMessage: 'Sign-in state expired or was invalid. Please try again.',
    });
  }

  let parsedTx: { state?: string; codeVerifier?: string };
  try {
    parsedTx = JSON.parse(input.rawTxCookie);
  } catch {
    throw new AuthError({
      code: 'INVALID_STATE',
      message: 'Invalid transaction cookie JSON payload.',
      safeMessage: 'Authentication state could not be read.',
    });
  }

  if (
    !parsedTx.state ||
    !parsedTx.codeVerifier ||
    !timingSafeEqualStrings(input.state, parsedTx.state)
  ) {
    throw new AuthError({
      code: 'INVALID_STATE',
      message: 'State mismatch on YappOut OAuth callback.',
      safeMessage: 'Sign-in state validation failed. Please try again.',
    });
  }

  const { assertionToken, assertion } = await exchangeCodeForAssertion({
    authServerOrigin: env.authServerOrigin,
    applicationId: env.applicationId,
    code: input.code,
    redirectUri: `${env.appOrigin}/api/auth/callback`,
    codeVerifier: parsedTx.codeVerifier,
    ...(env.clientSecret ? { clientSecret: env.clientSecret } : {}),
    ...(input.jwks ? { jwks: input.jwks } : { jwksUrl: env.jwksUrl }),
    expectedIssuer: env.authServerIssuer,
    expectedAudience: env.applicationId,
    ...(input.fetchImpl ? { fetchImpl: input.fetchImpl } : {}),
  });

  const user = assertionToYappoutUser(assertion);
  const sessionCookieHeader = createSessionCookieHeader(assertionToken, assertion.exp);
  const clearTxCookieHeader = createClearTxCookieHeader();

  return {
    assertionToken,
    user,
    sessionCookieHeader,
    clearTxCookieHeader,
  };
}

export { toPublicAuthError };
