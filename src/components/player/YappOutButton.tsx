'use client';
// src/components/player/YappOutButton.tsx
// Primary YappOut play/stop action button

import { Volume2, Square } from 'lucide-react';
import { PlaybackState } from '@/types';
import styles from './PlayerControls.module.css';

interface YappOutButtonProps {
  playbackState: PlaybackState;
  disabled?: boolean;
  onPlay: () => void;
  onStop: () => void;
  compact?: boolean;
}

export function YappOutButton({
  playbackState,
  disabled = false,
  onPlay,
  onStop,
  compact = false,
}: YappOutButtonProps) {
  const isPlaying = playbackState === 'playing';

  const handleClick = () => {
    if (disabled) return;
    if (isPlaying) {
      onStop();
    } else {
      onPlay();
    }
  };

  const buttonClasses = [
    styles.yappoutButton,
    isPlaying ? styles.playing : '',
  ].filter(Boolean).join(' ');

  return (
    <button
      type="button"
      className={buttonClasses}
      onClick={handleClick}
      disabled={disabled}
      aria-label={isPlaying ? 'Stop narration' : 'Start YappOut narration'}
      title={isPlaying ? 'Stop narration' : 'Start YappOut narration'}
    >
      {isPlaying ? (
        <>
          <Square size={16} fill="currentColor" />
          {!compact && <span>Stop</span>}
        </>
      ) : (
        <>
          <Volume2 size={18} />
          {!compact && <span>YappOut</span>}
        </>
      )}
    </button>
  );
}
