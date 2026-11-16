'use client';
// src/components/player/PlayerControls.tsx
// Unified playback toolbar with highlight mode selector, speed cycle, segment metadata, and YappOut action

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
      <div className={styles.leftGroup}>
        {/* 1. Reading Highlight Mode Selector */}
        <HighlightModeSelector
          mode={highlightMode}
          onCycle={onCycleHighlightMode}
          disabled={!hasContent}
        />

        {/* 2. Playback Speed Selector */}
        <YappOutSpeed
          speedLabel={speedLabel}
          onCycle={onCycleSpeed}
          disabled={!hasContent}
        />

        {/* 3. Segment metadata, progress, word count, and duration */}
        <div className={styles.segmentInfoBlock}>
          <div className={styles.statusRow}>
            {hasContent && totalSegments > 0 && (
              <>
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
              </>
            )}

            {hasContent && (
              <>
                <span className={styles.metaStat} title="Word count">
                  <Type size={13} />
                  <span>
                    {wordCount.toLocaleString()} {wordCount === 1 ? 'word' : 'words'}
                  </span>
                </span>

                <span className={styles.metaStat} title="Estimated listening duration">
                  <Clock size={13} />
                  <span>{readingTime}</span>
                </span>
              </>
            )}
          </div>

          {/* Double-click instruction immediately below segment information */}
          <span className={styles.seekInstruction}>
            <MousePointerClick size={12} />
            <span>Double-click or double-tap any sentence to seek</span>
          </span>
        </div>
      </div>

      <div className={styles.rightGroup}>
        {/* YappOut playback button, aligned to far right */}
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
