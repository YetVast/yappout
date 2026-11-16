// tests/identityService.test.ts
// Unit tests for identity mapping and view model projection

import { describe, it, expect } from 'vitest';
import { assertionToYappoutUser } from '@/auth/identityService';
import type { ApplicationIdentityAssertion, YvUserId, ProviderSubjectId, IsoTimestamp } from '@yetvast/auth';

describe('YappOut Identity Service', () => {
  it('maps a persistent Google assertion to an authoritative YappoutUser', () => {
    const assertion: ApplicationIdentityAssertion = {
      iss: 'https://auth.yetvast.com',
      aud: 'yappout',
      sub: 'yv_user_123',
      authKind: 'persistent',
      yvUserId: 'yv_user_123' as unknown as YvUserId,
      provider: 'google',
      providerSubjectId: 'google_sub_999' as unknown as ProviderSubjectId,
      displayName: 'Alice Developer',
      email: 'alice@example.com',
      emailVerified: true,
      authenticatedAt: '2026-11-16T10:00:00.000Z' as unknown as IsoTimestamp,
      jti: 'jti_abc',
      iat: 1700000000,
      exp: 1700003600,
    };

    const user = assertionToYappoutUser(assertion);
    expect(user.id).toBe('yv_user_123');
    expect(user.displayName).toBe('Alice Developer');
    expect(user.email).toBe('alice@example.com');
    expect(user.authKind).toBe('persistent');
    expect(user.isPersistent).toBe(true);
    expect(user.yvUserId).toBe('yv_user_123');
    expect(user.provider).toBe('google');
    expect(user.expiresAt).toBe(1700003600);
  });

  it('maps an ephemeral GitHub assertion to an ephemeral YappoutUser with yvUserId=null', () => {
    const assertion: ApplicationIdentityAssertion = {
      iss: 'https://auth.yetvast.com',
      aud: 'yappout',
      sub: 'ephemeral:github:octocat',
      authKind: 'ephemeral_github',
      yvUserId: null,
      provider: 'github',
      providerSubjectId: 'octocat' as unknown as ProviderSubjectId,
      displayName: 'Octocat Reader',
      email: 'octocat@github.com',
      emailVerified: true,
      authenticatedAt: '2026-11-16T10:00:00.000Z' as unknown as IsoTimestamp,
      jti: 'jti_def',
      iat: 1700000000,
      exp: 1700003600,
    };

    const user = assertionToYappoutUser(assertion);
    expect(user.id).toBe('ephemeral:github:octocat');
    expect(user.displayName).toBe('Octocat Reader');
    expect(user.email).toBe('octocat@github.com');
    expect(user.authKind).toBe('ephemeral_github');
    expect(user.isPersistent).toBe(false);
    expect(user.yvUserId).toBeNull();
    expect(user.provider).toBe('github');
  });

  it('provides safe fallback display names when displayName claim is null', () => {
    const assertion: ApplicationIdentityAssertion = {
      iss: 'https://auth.yetvast.com',
      aud: 'yappout',
      sub: 'ephemeral:github:ghost',
      authKind: 'ephemeral_github',
      yvUserId: null,
      provider: 'github',
      providerSubjectId: 'ghost_99' as unknown as ProviderSubjectId,
      displayName: null,
      email: null,
      emailVerified: false,
      authenticatedAt: '2026-11-16T10:00:00.000Z' as unknown as IsoTimestamp,
      jti: 'jti_ghi',
      iat: 1700000000,
      exp: 1700003600,
    };

    const user = assertionToYappoutUser(assertion);
    expect(user.displayName).toBe('GitHub User (ghost_99)');
    expect(user.email).toBeNull();
  });
});
