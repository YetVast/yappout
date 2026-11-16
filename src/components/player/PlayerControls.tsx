'use client';
// src/components/player/PlayerControls.tsx
// Unified playback controls toolbar

import { PlaybackState } from '@/types';
import { YappOutButton } from './YappOutButton';
import { YappOutSpeed } from './YappOutSpeed';
import styles from './PlayerControls.module.css';

interface PlayerControlsProps {
  playbackState: PlaybackState;
  currentSegmentIndex: number;
  totalSegments: number;
  speedLabel: string;
  hasContent: boolean;
  onPlay: () => void;
  onStop: () => void;
  onCycleSpeed: () => void;
}

export function PlayerControls({
  playbackState,
  currentSegmentIndex,
  totalSegments,
  speedLabel,
  hasContent,
  onPlay,
  onStop,
  onCycleSpeed,
}: PlayerControlsProps) {
  const isPlaying = playbackState === 'playing';
  const progressPercent = totalSegments > 0
    ? Math.min(100, Math.round(((currentSegmentIndex + 1) / totalSegments) * 100))
    : 0;

  return (
    <div className={styles.controlsBar}>
      <div className={styles.leftGroup}>
        <YappOutButton
          playbackState={playbackState}
          disabled={!hasContent}
          onPlay={onPlay}
          onStop={onStop}
        />
        <YappOutSpeed
          speedLabel={speedLabel}
          onCycle={onCycleSpeed}
          disabled={!hasContent}
        />
      </div>

      <div className={styles.rightGroup}>
        {hasContent && totalSegments > 0 && (
          <div className={styles.statusInfo}>
            <span className={styles.segmentBadge}>
              {isPlaying || playbackState === 'stopped'
                ? `Segment ${Math.min(currentSegmentIndex + 1, totalSegments)} / ${totalSegments}`
                : `${totalSegments} ${totalSegments === 1 ? 'segment' : 'segments'}`}
            </span>

            <div
              className={styles.progressTrack}
              role="progressbar"
              aria-valuenow={progressPercent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Reading progress"
            >
              <div
                className={styles.progressBar}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
