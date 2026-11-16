'use client';
// src/components/auth/AuthModal.tsx
// Dialog explaining persistent Google identity vs ephemeral GitHub access options

import React, { useEffect } from 'react';
import { X, LogIn, ShieldCheck, GitBranch } from 'lucide-react';
import styles from './auth.module.css';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSignIn: (provider?: string) => void;
}

export function AuthModal({ isOpen, onClose, onSignIn }: AuthModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className={styles.modalBackdrop}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <div>
            <h2 id="auth-modal-title" className={styles.modalTitle}>
              Connect Yet Vast Account
            </h2>
            <p className={styles.modalSubtitle}>
              YappOut is completely free and client-side. Sign in to connect your Yet Vast ecosystem identity.
            </p>
          </div>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
        </div>

        <div className={styles.providerList}>
          {/* Google Option: Persistent Yet Vast Identity */}
          <div className={styles.providerOption}>
            <div className={styles.providerOptionHeader}>
              <span className={styles.providerOptionTitle}>Google</span>
              <span className={styles.authBadgePersistent}>Persistent Identity</span>
            </div>
            <p className={styles.providerOptionDescription}>
              Creates or resolves your persistent Yet Vast identity. Provides stable user identification across Yet Vast Solutions products.
            </p>
            <button
              type="button"
              className={`${styles.providerActionBtn} ${styles.primaryProviderBtn}`}
              onClick={() => onSignIn('google')}
            >
              <ShieldCheck size={16} />
              Continue with Google
            </button>
          </div>

          {/* GitHub Option: Ephemeral Service Access */}
          <div className={styles.providerOption}>
            <div className={styles.providerOptionHeader}>
              <span className={styles.providerOptionTitle}>GitHub</span>
              <span className={styles.authBadgeEphemeral}>Ephemeral Access</span>
            </div>
            <p className={styles.providerOptionDescription}>
              Sign in using GitHub. Ephemeral access without creating a persistent Yet Vast identity, unless previously linked in central Auth.
            </p>
            <button
              type="button"
              className={`${styles.providerActionBtn} ${styles.secondaryProviderBtn}`}
              onClick={() => onSignIn('github')}
            >
              <GitBranch size={16} />
              Continue with GitHub
            </button>
          </div>

          {/* Direct Auth Portal Login */}
          <button
            type="button"
            className={`${styles.providerActionBtn} ${styles.secondaryProviderBtn}`}
            onClick={() => onSignIn()}
          >
            <LogIn size={16} />
            Choose on Yet Vast Auth Portal
          </button>
        </div>

        <div className={styles.modalFooter}>
          Privacy Guarantee: Your text, reading progress, and narration remain strictly on your device and are never sent to a server.
        </div>
      </div>
    </div>
  );
}
