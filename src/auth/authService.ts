// src/auth/authService.ts
// High-level OAuth Authorization Code flow with PKCE S256 for YappOut

import { AuthError, isSafeRedirectUri, toPublicAuthError, type AuthErrorCode } from '@yetvast/auth';
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

export interface InitiateLoginInput {
  provider?: string;
  returnTo?: string;
  appOrigin?: string;
}

export interface InitiateLoginResult {
  authorizeUrl: string;
  state: string;
  codeVerifier: string;
  txCookieHeader: string;
  returnTo?: string;
}

export interface HandleCallbackInput {
  code: string | null;
  state: string | null;
  rawTxCookie: string | null | undefined;
  error?: string | null;
  errorDesc?: string | null;
  fetchImpl?: typeof fetch;
  jwks?: JwksDocument;
  appOrigin?: string;
}

export interface HandleCallbackResult {
  assertionToken: string;
  user: YappoutUser;
  sessionCookieHeader: string;
  clearTxCookieHeader: string;
  returnTo?: string;
}

/**
 * Normalizes central Yet Vast Auth error codes into typed, secure, user-friendly messages.
 */
export function normalizeCentralAuthError(
  rawError: string,
  rawDesc?: string | null
): { code: AuthErrorCode; message: string; safeMessage: string } {
  const normalized = rawError.trim().toUpperCase().replace(/-/g, '_');

  switch (normalized) {
    case 'APPLICATION_NOT_REGISTERED':
      return {
        code: 'APPLICATION_NOT_REGISTERED',
        message: rawDesc ?? 'YappOut is not registered in the central application registry.',
        safeMessage:
          rawDesc ?? 'YappOut is not registered in the central Yet Vast Auth application registry.',
      };
    case 'APPLICATION_PENDING':
    case 'APPLICATION_PENDING_APPROVAL':
      return {
        code: 'APPLICATION_PENDING_APPROVAL',
        message: rawDesc ?? 'YappOut application registration is pending review by central administrators.',
        safeMessage:
          rawDesc ?? 'YappOut registration is currently pending review by central administrators.',
      };
    case 'APPLICATION_REJECTED':
      return {
        code: 'APPLICATION_REJECTED',
        message: rawDesc ?? 'YappOut application registration was rejected by central administrators.',
        safeMessage:
          rawDesc ?? 'YappOut registration was rejected by central administrators.',
      };
    case 'APPLICATION_SUSPENDED':
      return {
        code: 'APPLICATION_SUSPENDED',
        message: rawDesc ?? 'YappOut application authentication has been suspended by central administrators.',
        safeMessage:
          rawDesc ?? 'Authentication for YappOut has been temporarily suspended by central administrators.',
      };
    case 'INVALID_REDIRECT_URI':
    case 'REDIRECT_URI_MISMATCH':
      return {
        code: 'INVALID_REDIRECT_URI',
        message: rawDesc ?? 'The requested callback URL does not match central YappOut registration.',
        safeMessage:
          rawDesc ?? 'The callback URL does not match central registration.',
      };
    case 'PROVIDER_NOT_ALLOWED':
    case 'PROVIDER_DISABLED':
      return {
        code: 'PROVIDER_DISABLED',
        message: rawDesc ?? 'The requested sign-in provider is not enabled.',
        safeMessage: 'The requested sign-in provider is not enabled.',
      };
    case 'ACCESS_DENIED':
      return {
        code: 'FORBIDDEN',
        message: rawDesc ?? 'Sign-in was cancelled or declined at central authority.',
        safeMessage: rawDesc ?? 'Sign-in was cancelled or declined at central authority.',
      };
    case 'UNAUTHORIZED_CLIENT':
      return {
        code: 'UNAUTHORIZED',
        message: rawDesc ?? 'YappOut client is not authorized for this action.',
        safeMessage: 'Client application is not authorized.',
      };
    default:
      return {
        code: 'PROVIDER_PROTOCOL_ERROR',
        message: rawDesc ?? rawError,
        safeMessage: rawDesc ?? 'Authentication failed at central authority.',
      };
  }
}

/**
 * Initiates the OAuth PKCE authorization code flow against Yet Vast Auth.
 */
export function initiateLogin(options?: string | InitiateLoginInput): InitiateLoginResult {
  const env = getYappoutAuthConfig();
  const provider = typeof options === 'string' ? options : options?.provider;
  const rawReturnTo = typeof options === 'object' ? options?.returnTo : undefined;
  const effectiveAppOrigin =
    (typeof options === 'object' && options?.appOrigin) || env.appOrigin;

  const returnTo =
    rawReturnTo && isSafeRedirectUri(rawReturnTo, { fallbackOrigin: effectiveAppOrigin })
      ? rawReturnTo
      : undefined;

  const redirectUri = `${effectiveAppOrigin}/api/auth/callback`;

  const auth = createAppAuthorizeRedirect({
    authServerOrigin: env.authServerOrigin,
    applicationId: env.applicationId,
    redirectUri,
    ...(provider ? { provider } : {}),
  });

  const txCookieHeader = createTxCookieHeader({
    state: auth.state,
    codeVerifier: auth.codeVerifier,
    ...(returnTo ? { returnTo } : {}),
  });

  return {
    authorizeUrl: auth.authorizeUrl,
    state: auth.state,
    codeVerifier: auth.codeVerifier,
    txCookieHeader,
    ...(returnTo ? { returnTo } : {}),
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
    const normalized = normalizeCentralAuthError(input.error, input.errorDesc);
    throw new AuthError({
      code: normalized.code,
      message: normalized.message,
      safeMessage: normalized.safeMessage,
    });
  }

  if (!input.rawTxCookie || !input.code || !input.state) {
    throw new AuthError({
      code: 'INVALID_STATE',
      message: 'Missing OAuth callback code, state, or transaction cookie.',
      safeMessage: 'Sign-in state expired or was invalid. Please try again.',
    });
  }

  let parsedTx: { state?: string; codeVerifier?: string; returnTo?: string };
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

  const effectiveAppOrigin = input.appOrigin || env.appOrigin;

  const { assertionToken, assertion } = await exchangeCodeForAssertion({
    authServerOrigin: env.authServerOrigin,
    applicationId: env.applicationId,
    code: input.code,
    redirectUri: `${effectiveAppOrigin}/api/auth/callback`,
    codeVerifier: parsedTx.codeVerifier,
    ...(env.clientSecret ? { clientSecret: env.clientSecret } : {}),
    ...(input.jwks ? { jwks: input.jwks } : { jwksUrl: env.jwksUrl }),
    expectedIssuer: env.authServerIssuer,
    expectedAudience: env.applicationId,
    ...(input.fetchImpl ? { fetchImpl: input.fetchImpl } : {}),
  });

  const returnTo =
    parsedTx.returnTo && isSafeRedirectUri(parsedTx.returnTo, { fallbackOrigin: effectiveAppOrigin })
      ? parsedTx.returnTo
      : undefined;

  const user = assertionToYappoutUser(assertion);
  const sessionCookieHeader = createSessionCookieHeader(assertionToken, assertion.exp);
  const clearTxCookieHeader = createClearTxCookieHeader();

  return {
    assertionToken,
    user,
    sessionCookieHeader,
    clearTxCookieHeader,
    ...(returnTo ? { returnTo } : {}),
  };
}

export { toPublicAuthError };
