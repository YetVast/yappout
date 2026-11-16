'use client';
// src/components/layout/Header.tsx
// Top application header with brand identity, compact v0 control, and theme switch

import { useState, useEffect } from 'react';
import { Sun, Moon, Volume2 } from 'lucide-react';
import styles from './Header.module.css';

interface HeaderProps {
  onLoadSample?: () => void;
}

export function Header({ onLoadSample }: HeaderProps) {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    // Check initial document or system theme
    let saved: 'light' | 'dark' | null = null;
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        saved = window.localStorage.getItem('yappout_theme') as 'light' | 'dark' | null;
      }
    } catch {
      // storage unavailable
    }
    const prefersDark = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initial = saved || (prefersDark ? 'dark' : 'light');
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', initial);
    }

    const timer = setTimeout(() => {
      setTheme(initial);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', next);
    }
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem('yappout_theme', next);
      }
    } catch {
      // storage unavailable
    }
  };

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <div className={styles.brand}>
          <div className={styles.logoBadge} aria-hidden="true">
            <Volume2 size={18} strokeWidth={2.5} />
          </div>
          <div className={styles.brandText}>
            <div className={styles.titleRow}>
              <span className={styles.title}>YappOut</span>
              <button
                type="button"
                className={styles.v0Badge}
                onClick={onLoadSample}
                aria-label="YappOut V0 — Click to load sample content"
                title="YappOut V0 — Click to load sample content"
              >
                v0
              </button>
            </div>
          </div>
        </div>

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.themeToggle}
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
            title={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
          >
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>
        </div>
      </div>
    </header>
  );
}
