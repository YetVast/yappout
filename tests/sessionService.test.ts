// @vitest-environment node
// tests/sessionService.test.ts
// Unit and asymmetric cryptographic verification tests for sessionService

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  createSessionCookieHeader,
  createClearSessionCookieHeader,
  createTxCookieHeader,
  createClearTxCookieHeader,
  validateMutationOrigin,
  readVerifiedSession,
} from '@/auth/sessionService';
import {
  generateAssertionSigningKeyPair,
  signAsymmetricJwt,
  type JwksDocument,
} from '@yetvast/auth/server';

describe('YappOut Session Service', () => {
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

  it('creates host-bound session cookie header with HttpOnly and SameSite=Lax', () => {
    const header = createSessionCookieHeader('mock.token.value', Math.floor(Date.now() / 1000) + 3600);
    expect(header).toContain('yv_yappout_session=mock.token.value');
    expect(header).toContain('HttpOnly');
    expect(header).toContain('SameSite=Lax');
    expect(header).toContain('Path=/');
    // Critical security invariant: never sets wildcard or specific Domain
    expect(header).not.toContain('Domain=');
  });

  it('marks cookies Secure when application origin uses HTTPS', () => {
    process.env.YAPPOUT_ORIGIN = 'https://yappout.yetvast.com';
    const header = createSessionCookieHeader('secure.token', Math.floor(Date.now() / 1000) + 3600);
    expect(header).toContain('Secure');
  });

  it('creates clear session cookie header with Max-Age=0', () => {
    const clearHeader = createClearSessionCookieHeader();
    expect(clearHeader).toContain('yv_yappout_session=;');
    expect(clearHeader).toContain('Max-Age=0');
    expect(clearHeader).toContain('HttpOnly');
  });

  it('serializes and deserializes PKCE transaction cookie correctly', () => {
    const txHeader = createTxCookieHeader({ state: 'state123', codeVerifier: 'verifier456' });
    expect(txHeader).toContain('yv_yappout_tx=');
    expect(txHeader).toContain('Max-Age=600');

    const clearTx = createClearTxCookieHeader();
    expect(clearTx).toContain('yv_yappout_tx=;');
    expect(clearTx).toContain('Max-Age=0');
  });

  it('validates mutation origin correctly', () => {
    const validReq = new Request('http://localhost:3000/api/auth/logout', {
      method: 'POST',
      headers: {
        origin: 'http://localhost:3000',
      },
    });
    expect(() => validateMutationOrigin(validReq)).not.toThrow();

    const crossOriginReq = new Request('http://localhost:3000/api/auth/logout', {
      method: 'POST',
      headers: {
        origin: 'https://malicious-site.com',
      },
    });
    expect(() => validateMutationOrigin(crossOriginReq)).toThrowError(/Origin mismatch/);
  });

  it('verifies an asymmetrically signed JWT assertion using static JWKS document', async () => {
    const keyPair = generateAssertionSigningKeyPair({ alg: 'EdDSA' });
    const jwks: JwksDocument = { keys: [keyPair.publicJwk] };

    const now = Math.floor(Date.now() / 1000);
    const token = signAsymmetricJwt(
      {
        iss: 'http://localhost:3001',
        aud: 'yappout',
        sub: 'yv_test_alice',
        authKind: 'persistent',
        yvUserId: 'yv_test_alice',
        provider: 'google',
        providerSubjectId: 'google_123',
        displayName: 'Alice In Wonderland',
        email: 'alice@wonderland.com',
        emailVerified: true,
        authenticatedAt: new Date().toISOString(),
        jti: 'jti_test_1',
        iat: now,
        exp: now + 3600,
      },
      keyPair
    );

    const verified = await readVerifiedSession(token, { jwks });
    expect(verified).not.toBeNull();
    expect(verified?.sub).toBe('yv_test_alice');
    expect(verified?.displayName).toBe('Alice In Wonderland');
  });

  it('rejects an assertion with mismatched audience or issuer', async () => {
    const keyPair = generateAssertionSigningKeyPair({ alg: 'EdDSA' });
    const jwks: JwksDocument = { keys: [keyPair.publicJwk] };

    const now = Math.floor(Date.now() / 1000);
    // Wrong audience
    const invalidAudToken = signAsymmetricJwt(
      {
        iss: 'http://localhost:3001',
        aud: 'some-other-app',
        sub: 'yv_test_bob',
        authKind: 'persistent',
        yvUserId: 'yv_test_bob',
        provider: 'google',
        providerSubjectId: 'google_456',
        displayName: 'Bob',
        email: 'bob@example.com',
        emailVerified: true,
        authenticatedAt: new Date().toISOString(),
        jti: 'jti_test_2',
        iat: now,
        exp: now + 3600,
      },
      keyPair
    );

    const verified = await readVerifiedSession(invalidAudToken, { jwks });
    expect(verified).toBeNull();
  });

  it('rejects an expired assertion', async () => {
    const keyPair = generateAssertionSigningKeyPair({ alg: 'EdDSA' });
    const jwks: JwksDocument = { keys: [keyPair.publicJwk] };

    const now = Math.floor(Date.now() / 1000);
    const expiredToken = signAsymmetricJwt(
      {
        iss: 'http://localhost:3001',
        aud: 'yappout',
        sub: 'yv_test_charlie',
        authKind: 'persistent',
        yvUserId: 'yv_test_charlie',
        provider: 'google',
        providerSubjectId: 'google_789',
        displayName: 'Charlie',
        email: 'charlie@example.com',
        emailVerified: true,
        authenticatedAt: new Date(Date.now() - 7200000).toISOString(),
        jti: 'jti_test_3',
        iat: now - 3600,
        exp: now - 60, // expired 1 minute ago
      },
      keyPair
    );

    const verified = await readVerifiedSession(expiredToken, { jwks });
    expect(verified).toBeNull();
  });
});
