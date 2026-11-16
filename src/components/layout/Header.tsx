'use client';
// src/components/layout/Header.tsx
// Top application header with brand identity and theme switch

import { useState, useEffect } from 'react';
import { Sun, Moon, Volume2 } from 'lucide-react';
import styles from './Header.module.css';

export function Header() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    // Check initial document or system theme
    const saved = localStorage.getItem('yappout_theme') as 'light' | 'dark' | null;
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initial = saved || (prefersDark ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', initial);

    const timer = setTimeout(() => {
      setTheme(initial);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
    try {
      localStorage.setItem('yappout_theme', next);
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
            <span className={styles.title}>YappOut</span>
            <span className={styles.tagline}>Audio-first Synchronized Reader</span>
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
