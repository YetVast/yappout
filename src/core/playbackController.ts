// src/core/playbackController.ts
// Session-guarded continuous segment-by-segment playback controller

import { SegmentToken, WordToken, PlaybackState, SpeechAdapter } from '@/types';
import { createSpeechSynthesisAdapter } from '../adapters/speechSynthesisAdapter';

export type { PlaybackState };

export interface SegmentPlaybackCallbacks {
  onSegmentChange: (segmentIndex: number) => void;
  onComplete: () => void;
  onError?: (error?: string) => void;
}

export interface WordPlaybackCallbacks {
  onWordChange: (wordIndex: number) => void;
  onComplete: () => void;
  onError?: (error?: string) => void;
}

/**
 * Speaks continuous text segments one after another using a SpeechAdapter.
 * Each segment is a continuous sentence/clause ending at punctuation or line break.
 * Stale sessions are safely ignored via monotonic sessionId guard.
 */
export function speakSegmentBySegment(
  segments: SegmentToken[],
  startIndex: number,
  rate: number,
  sessionId: number,
  getSessionId: () => number,
  callbacks: SegmentPlaybackCallbacks,
  speechAdapter?: SpeechAdapter,
): void {
  const adapter = speechAdapter ?? createSpeechSynthesisAdapter();
  let currentIdx = startIndex;

  function speakNext(): void {
    if (getSessionId() !== sessionId) return; // stale session guard

    if (currentIdx >= segments.length) {
      callbacks.onComplete();
      return;
    }

    const segment = segments[currentIdx];
    callbacks.onSegmentChange(currentIdx);

    // If segment text is empty or only whitespace, advance to next
    if (!segment.text || segment.text.trim().length === 0) {
      currentIdx++;
      speakNext();
      return;
    }

    adapter.speak(
      segment.text,
      rate,
      () => {
        if (getSessionId() !== sessionId) return;
        currentIdx++;
        speakNext();
      },
      (error) => {
        if (getSessionId() !== sessionId) return;
        if (callbacks.onError) {
          callbacks.onError(error);
        }
        currentIdx++;
        speakNext();
      },
    );
  }

  speakNext();
}

/**
 * Speaks words one at a time using SpeechAdapter.
 */
export function speakWordByWord(
  words: WordToken[],
  startIndex: number,
  rate: number,
  sessionId: number,
  getSessionId: () => number,
  callbacks: WordPlaybackCallbacks,
  speechAdapter?: SpeechAdapter,
): void {
  const adapter = speechAdapter ?? createSpeechSynthesisAdapter();
  let currentIdx = startIndex;

  function speakNext(): void {
    if (getSessionId() !== sessionId) return; // stale session guard

    if (currentIdx >= words.length) {
      callbacks.onComplete();
      return;
    }

    const word = words[currentIdx];
    callbacks.onWordChange(currentIdx);

    adapter.speak(
      word.text,
      rate,
      () => {
        if (getSessionId() !== sessionId) return;
        currentIdx++;
        speakNext();
      },
      (error) => {
        if (getSessionId() !== sessionId) return;
        if (callbacks.onError) {
          callbacks.onError(error);
        }
        currentIdx++;
        speakNext();
      },
    );
  }

  speakNext();
}
