'use client';
// src/components/player/YappOutSpeed.tsx
// Playback speed cycle control button

import styles from './PlayerControls.module.css';

interface YappOutSpeedProps {
  speedLabel: string;
  onCycle: () => void;
  disabled?: boolean;
}

export function YappOutSpeed({
  speedLabel,
  onCycle,
  disabled = false,
}: YappOutSpeedProps) {
  return (
    <button
      type="button"
      className={styles.speedButton}
      onClick={onCycle}
      disabled={disabled}
      aria-label={`Playback speed: ${speedLabel}. Click to cycle.`}
      title={`Playback speed: ${speedLabel}. Click to cycle (1× → 1.5× → 2× → 0.5× → 0.75×).`}
    >
      <span>{speedLabel}</span>
    </button>
  );
}
