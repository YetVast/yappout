// src/auth/types.ts
// Core domain types and contracts for YappOut V1 optional authentication

import type { AuthKind as CentralAuthKind } from '@yetvast/auth';

export type AuthKind = CentralAuthKind;

export type AuthStatus =
  | 'ANONYMOUS'
  | 'AUTHENTICATING'
  | 'AUTHENTICATED'
  | 'SESSION_EXPIRED'
  | 'AUTH_ERROR';

export interface YappoutUser {
  /**
   * Authoritative identifier:
   * - Stable immutable Yet Vast User ID (`yvUserId`) for persistent accounts
   * - Ephemeral subject (`ephemeral:github:<id>`) for ephemeral GitHub access
   */
  readonly id: string;
  readonly displayName: string | null;
  readonly email: string | null;
  readonly authKind: AuthKind;
  readonly provider: string;
  readonly yvUserId: string | null;
  readonly isPersistent: boolean;
  readonly authenticatedAt: string;
  readonly expiresAt: number;
}

export interface SessionApiResponse {
  authenticated: boolean;
  status: AuthStatus;
  user: YappoutUser | null;
  error?: string | null;
}

export interface AuthContextValue {
  status: AuthStatus;
  user: YappoutUser | null;
  error: string | null;
  isLoading: boolean;
  signIn: (provider?: string) => void;
  signOut: () => Promise<void>;
  clearError: () => void;
  refreshSession: () => Promise<void>;
}
