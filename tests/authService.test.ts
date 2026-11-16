// @vitest-environment node
// tests/authService.test.ts
// Unit tests for OAuth PKCE initiation, callback validation, and code exchange

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { initiateLogin, handleCallback } from '@/auth/authService';
import {
  generateAssertionSigningKeyPair,
  signAsymmetricJwt,
  type JwksDocument,
} from '@yetvast/auth/server';

describe('YappOut Auth Service', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    (process.env as Record<string, string | undefined>).NODE_ENV = 'development';
    process.env.YAPPOUT_ORIGIN = 'http://localhost:3000';
    process.env.YETVAST_AUTH_ORIGIN = 'http://localhost:3001';
    process.env.YAPPOUT_APP_ID = 'yappout';
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('generates an OAuth PKCE authorize redirect URL with S256 challenge', () => {
    const result = initiateLogin('google');

    const url = new URL(result.authorizeUrl);
    expect(url.origin).toBe('http://localhost:3001');
    expect(url.pathname).toBe('/authorize');
    expect(url.searchParams.get('app_id')).toBe('yappout');
    expect(url.searchParams.get('redirect_uri')).toBe('http://localhost:3000/api/auth/callback');
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
    expect(url.searchParams.get('code_challenge')).toBeTruthy();
    expect(url.searchParams.get('state')).toBe(result.state);
    expect(url.searchParams.get('provider')).toBe('google');

    expect(result.txCookieHeader).toContain('yv_yappout_tx=');
    expect(result.txCookieHeader).toContain(encodeURIComponent(result.state));
  });

  it('respects explicit custom appOrigin override in initiateLogin', () => {
    const result = initiateLogin({
      provider: 'github',
      appOrigin: 'https://yappout.yetvast.com',
    });

    const url = new URL(result.authorizeUrl);
    expect(url.searchParams.get('redirect_uri')).toBe(
      'https://yappout.yetvast.com/api/auth/callback'
    );
  });

  it('rejects callback when central auth reports an error parameter', async () => {
    await expect(
      handleCallback({
        code: null,
        state: 'some_state',
        rawTxCookie: JSON.stringify({ state: 'some_state', codeVerifier: 'cv' }),
        error: 'ACCESS_DENIED',
        errorDesc: 'User declined authorization',
      })
    ).rejects.toThrowError(/User declined authorization/);
  });

  it('rejects callback when code or transaction cookie is missing', async () => {
    await expect(
      handleCallback({
        code: null,
        state: 'some_state',
        rawTxCookie: undefined,
      })
    ).rejects.toThrowError(/Missing OAuth callback code, state, or transaction cookie/);
  });

  it('rejects callback on state mismatch (CSRF protection)', async () => {
    const rawTxCookie = JSON.stringify({ state: 'expected_state', codeVerifier: 'verifier123' });

    await expect(
      handleCallback({
        code: 'auth_code_123',
        state: 'tampered_state',
        rawTxCookie,
      })
    ).rejects.toThrowError(/State mismatch on YappOut OAuth callback/);
  });

  it('successfully exchanges code for assertion and returns session cookies', async () => {
    const keyPair = generateAssertionSigningKeyPair({ alg: 'EdDSA' });
    const jwks: JwksDocument = { keys: [keyPair.publicJwk] };

    const state = 'valid_state_123';
    const codeVerifier = 'valid_verifier_456';
    const rawTxCookie = JSON.stringify({ state, codeVerifier });

    const now = Math.floor(Date.now() / 1000);
    const mockAssertionJwt = signAsymmetricJwt(
      {
        iss: 'http://localhost:3001',
        aud: 'yappout',
        sub: 'yv_test_dan',
        authKind: 'persistent',
        yvUserId: 'yv_test_dan',
        provider: 'google',
        providerSubjectId: 'google_dan_1',
        displayName: 'Dan Reader',
        email: 'dan@example.com',
        emailVerified: true,
        authenticatedAt: new Date().toISOString(),
        jti: 'jti_dan',
        iat: now,
        exp: now + 3600,
      },
      keyPair
    );

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        assertion_token: mockAssertionJwt,
      }),
    });

    const result = await handleCallback({
      code: 'code_dan_999',
      state,
      rawTxCookie,
      fetchImpl: mockFetch as unknown as typeof fetch,
      jwks,
    });

    expect(result.user.id).toBe('yv_test_dan');
    expect(result.user.displayName).toBe('Dan Reader');
    expect(result.user.isPersistent).toBe(true);
    expect(result.sessionCookieHeader).toContain('yv_yappout_session=');
    expect(result.clearTxCookieHeader).toContain('Max-Age=0');

    // Verify token endpoint was invoked with code_verifier and authorization_code
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [callUrl, callOptions] = mockFetch.mock.calls[0];
    expect(callUrl.toString()).toBe('http://localhost:3001/api/token');
    const sentBody = JSON.parse(callOptions.body);
    expect(sentBody.grant_type).toBe('authorization_code');
    expect(sentBody.code).toBe('code_dan_999');
    expect(sentBody.code_verifier).toBe(codeVerifier);
    expect(sentBody.app_id).toBe('yappout');
  });
});
