'use client';
// src/components/player/PlayerControls.tsx
// Unified playback toolbar: Left info group (words, duration, segments) and Right controls group (highlight, speed, yappout)

import { Type, Clock, MousePointerClick } from 'lucide-react';
import { PlaybackState, HighlightMode } from '@/types';
import { YappOutButton } from './YappOutButton';
import { YappOutSpeed } from './YappOutSpeed';
import { HighlightModeSelector } from './HighlightModeSelector';
import styles from './PlayerControls.module.css';

interface PlayerControlsProps {
  playbackState: PlaybackState;
  currentSegmentIndex: number;
  totalSegments: number;
  speedLabel: string;
  highlightMode: HighlightMode;
  wordCount: number;
  readingTime: string;
  hasContent: boolean;
  onPlay: () => void;
  onStop: () => void;
  onCycleSpeed: () => void;
  onCycleHighlightMode: () => void;
}

export function PlayerControls({
  playbackState,
  currentSegmentIndex,
  totalSegments,
  speedLabel,
  highlightMode,
  wordCount,
  readingTime,
  hasContent,
  onPlay,
  onStop,
  onCycleSpeed,
  onCycleHighlightMode,
}: PlayerControlsProps) {
  const isPlaying = playbackState === 'playing';
  const progressPercent =
    totalSegments > 0
      ? Math.min(100, Math.round(((currentSegmentIndex + 1) / totalSegments) * 100))
      : 0;

  return (
    <div className={styles.controlsBar}>
      {/* Left information group: 1. Word count, 2. Duration, 3. Segments & progress */}
      <div className={styles.leftGroup}>
        <div className={styles.infoRow}>
          <span className={styles.metaStat} title="Word count">
            <Type size={14} />
            <span>
              {wordCount.toLocaleString()} {wordCount === 1 ? 'word' : 'words'}
            </span>
          </span>

          <span className={styles.metaStat} title="Estimated listening duration">
            <Clock size={14} />
            <span>{readingTime}</span>
          </span>

          <span className={styles.segmentBadge}>
            {isPlaying || playbackState === 'stopped'
              ? `Segment ${Math.min(currentSegmentIndex + 1, totalSegments)} / ${totalSegments}`
              : `${totalSegments} ${totalSegments === 1 ? 'segment' : 'segments'}`}
          </span>

          {hasContent && totalSegments > 0 && (
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
          )}
        </div>

        {/* Subtle inline seek instruction */}
        <span className={styles.seekInstruction}>
          <MousePointerClick size={12} />
          <span>Double-click or double-tap any sentence to seek</span>
        </span>
      </div>

      {/* Right controls group: 1. Highlight mode, 2. Speed, 3. YappOut playback button */}
      <div className={styles.rightGroup}>
        <HighlightModeSelector
          mode={highlightMode}
          onCycle={onCycleHighlightMode}
          disabled={!hasContent}
        />

        <YappOutSpeed
          speedLabel={speedLabel}
          onCycle={onCycleSpeed}
          disabled={!hasContent}
        />

        <YappOutButton
          playbackState={playbackState}
          disabled={!hasContent}
          onPlay={onPlay}
          onStop={onStop}
        />
      </div>
    </div>
  );
}
