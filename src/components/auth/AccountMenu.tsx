'use client';
// src/components/auth/AccountMenu.tsx
// Compact account dropdown displaying verified identity and sign-out action

import React, { useEffect, useRef, useState } from 'react';
import { LogOut, Shield, GitBranch } from 'lucide-react';
import type { YappoutUser } from '@/auth/types';
import styles from './auth.module.css';

interface AccountMenuProps {
  user: YappoutUser;
  isOpen: boolean;
  onClose: () => void;
  onSignOut: () => Promise<void>;
}

export function AccountMenu({ user, isOpen, onClose, onSignOut }: AccountMenuProps) {
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const handleOutsideClick = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const initial = (user.displayName || user.yvUserId || 'U').charAt(0).toUpperCase();

  const handleSignOutClick = async () => {
    setIsSigningOut(true);
    try {
      await onSignOut();
      onClose();
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <div
      ref={menuRef}
      className={styles.dropdownMenu}
      role="menu"
      aria-label="Account details and settings"
    >
      <div className={styles.dropdownHeader}>
        <div className={styles.largeAvatar} aria-hidden="true">
          {initial}
        </div>
        <div className={styles.profileDetails}>
          <div className={styles.profileName} title={user.displayName ?? undefined}>
            {user.displayName ?? 'Yet Vast User'}
          </div>
          {user.email && (
            <div className={styles.profileEmail} title={user.email}>
              {user.email}
            </div>
          )}
        </div>
      </div>

      <div className={styles.identityMeta}>
        <div className={styles.metaRow}>
          <span className={styles.metaKey}>Authority</span>
          <span className={styles.metaVal}>Yet Vast Auth</span>
        </div>
        <div className={styles.metaRow}>
          <span className={styles.metaKey}>Account Type</span>
          {user.isPersistent ? (
            <span className={styles.authBadgePersistent}>
              <Shield size={10} style={{ display: 'inline', marginRight: 2 }} />
              Persistent
            </span>
          ) : (
            <span className={styles.authBadgeEphemeral}>
              <GitBranch size={10} style={{ display: 'inline', marginRight: 2 }} />
              Ephemeral
            </span>
          )}
        </div>
        {user.yvUserId && (
          <div className={styles.metaRow}>
            <span className={styles.metaKey}>Yet Vast ID</span>
            <span className={styles.metaVal}>{user.yvUserId}</span>
          </div>
        )}
        <div className={styles.metaRow}>
          <span className={styles.metaKey}>Provider</span>
          <span className={styles.metaVal} style={{ textTransform: 'capitalize' }}>
            {user.provider}
          </span>
        </div>
      </div>

      <p className={styles.privacyNotice}>
        Content privacy: All reading text and audio synthesis remain strictly on this device and are never sent to Yet Vast servers.
      </p>

      <button
        type="button"
        className={styles.signOutBtn}
        onClick={handleSignOutClick}
        disabled={isSigningOut}
        role="menuitem"
      >
        <LogOut size={14} />
        {isSigningOut ? 'Signing out...' : 'Sign out'}
      </button>
    </div>
  );
}
