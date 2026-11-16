'use client';
// src/components/auth/AuthButton.tsx
// Compact account action component rendered in the header

import React, { useState } from 'react';
import { LogIn, AlertCircle, ChevronDown, Shield, GitBranch } from 'lucide-react';
import { useAuth } from './AuthProvider';
import { AccountMenu } from './AccountMenu';
import styles from './auth.module.css';

export function AuthButton() {
  const { status, user, error, isLoading, signIn, signOut, clearError } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  if (isLoading) {
    return (
      <div className={styles.authContainer}>
        <div className={styles.signInBtn} style={{ cursor: 'default', opacity: 0.7 }}>
          <span className={styles.loadingSpinner} aria-hidden="true" />
          <span>Connecting...</span>
        </div>
      </div>
    );
  }

  if (status === 'AUTHENTICATED' && user) {
    const initial = (user.displayName || user.yvUserId || 'U').charAt(0).toUpperCase();
    const label = user.displayName || user.yvUserId || 'User';

    return (
      <div className={styles.authContainer}>
        <button
          type="button"
          className={styles.userBtn}
          onClick={() => setIsMenuOpen((prev) => !prev)}
          aria-haspopup="menu"
          aria-expanded={isMenuOpen}
          aria-label={`Account menu for ${label}`}
          title={`Signed in as ${label} (${user.isPersistent ? 'Persistent' : 'Ephemeral'})`}
        >
          <span className={styles.avatarBadge} aria-hidden="true">
            {initial}
          </span>
          <span className={styles.userLabel}>{label}</span>
          {user.isPersistent ? (
            <span className={styles.authBadgePersistent} title="Persistent Yet Vast Identity">
              <Shield size={10} style={{ display: 'inline' }} />
            </span>
          ) : (
            <span className={styles.authBadgeEphemeral} title="Ephemeral GitHub Access">
              <GitBranch size={10} style={{ display: 'inline' }} />
            </span>
          )}
          <ChevronDown size={14} style={{ color: 'var(--text-muted)' }} />
        </button>

        <AccountMenu
          user={user}
          isOpen={isMenuOpen}
          onClose={() => setIsMenuOpen(false)}
          onSignOut={signOut}
        />
      </div>
    );
  }

  if (status === 'SESSION_EXPIRED') {
    return (
      <div className={styles.authContainer}>
        <button
          type="button"
          className={styles.sessionExpiredBtn}
          onClick={() => signIn()}
          title="Session expired. Click to sign in again."
        >
          <AlertCircle size={14} />
          <span>Session Expired — Sign in</span>
        </button>
      </div>
    );
  }

  // ANONYMOUS or AUTH_ERROR
  return (
    <div className={styles.authContainer}>
      {error && (
        <div className={styles.errorBanner} style={{ position: 'absolute', right: 0, top: '100%', marginTop: '0.5rem', width: 280, zIndex: 150 }}>
          <span>{error}</span>
          <button type="button" className={styles.dismissErrorBtn} onClick={clearError} aria-label="Dismiss error">
            &times;
          </button>
        </div>
      )}
      <button
        type="button"
        className={styles.signInBtn}
        onClick={() => signIn()}
        aria-label="Sign in with Yet Vast Auth"
        title="Sign in with Yet Vast Auth (optional)"
      >
        <LogIn size={14} />
        <span>Sign in</span>
      </button>
    </div>
  );
}
