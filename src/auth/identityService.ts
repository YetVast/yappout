// src/auth/identityService.ts
// Identity resolution and assertion mapping for YappOut local sessions

import type { ApplicationIdentityAssertion } from '@yetvast/auth';
import type { YappoutUser } from './types';

/**
 * Projects a verified central Auth identity assertion into the YappOut user model.
 *
 * Invariants:
 * 1. Persistent identity requires a non-null `yvUserId`.
 * 2. Ephemeral GitHub access has `authKind === "ephemeral_github"`, `yvUserId === null`,
 *    and subject formatted as `ephemeral:github:<providerSubjectId>`.
 * 3. Never fabricates identities or merges accounts locally.
 */
export function assertionToYappoutUser(assertion: ApplicationIdentityAssertion): YappoutUser {
  const isPersistent = assertion.authKind === 'persistent' && Boolean(assertion.yvUserId);
  const id = isPersistent && assertion.yvUserId ? assertion.yvUserId : assertion.sub;

  const fallbackDisplayName = isPersistent && assertion.yvUserId
    ? assertion.yvUserId
    : assertion.provider === 'github'
      ? `GitHub User (${assertion.providerSubjectId})`
      : 'User';

  return {
    id,
    displayName: assertion.displayName || fallbackDisplayName,
    email: assertion.email,
    authKind: assertion.authKind,
    provider: assertion.provider,
    yvUserId: assertion.yvUserId,
    isPersistent,
    authenticatedAt: assertion.authenticatedAt,
    expiresAt: assertion.exp,
  };
}
