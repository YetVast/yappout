// src/core/playbackController.ts
// Session-guarded continuous segment-by-segment playback controller with controlled recovery

import { SegmentToken, WordToken, PlaybackState, SpeechAdapter } from '@/types';
import { createSpeechSynthesisAdapter } from '../adapters/speechSynthesisAdapter';
import { logDiagnostic } from '../utils/logger';

export type { PlaybackState };

export interface SegmentPlaybackCallbacks {
  onSegmentChange: (segmentIndex: number) => void;
  onComplete: () => void;
  onError?: (error?: string) => void;
  onUtteranceStart?: (segmentIndex: number) => void;
}

export interface WordPlaybackCallbacks {
  onWordChange: (wordIndex: number) => void;
  onComplete: () => void;
  onError?: (error?: string) => void;
}

const MAX_SEGMENT_RETRIES = 2;

/**
 * Speaks continuous text segments one after another using a SpeechAdapter.
 * Each segment is a continuous sentence/clause ending at punctuation or line break.
 * Stale sessions are safely ignored via monotonic sessionId guard.
 *
 * Implements a controlled recovery mechanism:
 * 1. Verifies the active playback session.
 * 2. Verifies current segment has not already completed.
 * 3. Avoids repeating completed segments.
 * 4. Retries transient errors up to MAX_SEGMENT_RETRIES before advancing.
 * 5. Avoids infinite retry loops.
 * 6. Logs diagnostic events in development mode.
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
  let retryCount = 0;

  function speakNext(): void {
    if (getSessionId() !== sessionId) {
      logDiagnostic('Session', `Discarding speakNext for stale session ${sessionId} (current: ${getSessionId()})`);
      return;
    }

    if (currentIdx >= segments.length) {
      logDiagnostic('Playback', `Completed all ${segments.length} segments in session ${sessionId}`);
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

    logDiagnostic('Playback', `Speaking segment [${currentIdx}/${segments.length}]`, {
      sessionId,
      segmentIndex: currentIdx,
      text: segment.text,
      rate,
      retryCount,
    });

    adapter.speak(
      segment.text,
      rate,
      () => {
        // Successful onEnd: verify session guard
        if (getSessionId() !== sessionId) return;

        // Reset retry counter on successful completion of segment
        retryCount = 0;
        currentIdx++;
        speakNext();
      },
      (error) => {
        // Error callback: verify session guard
        if (getSessionId() !== sessionId) return;

        logDiagnostic('Recovery', `Segment [${currentIdx}] error: ${error || 'unknown'}`, {
          sessionId,
          segmentIndex: currentIdx,
          retryCount,
          maxRetries: MAX_SEGMENT_RETRIES,
        });

        if (callbacks.onError) {
          callbacks.onError(error);
        }

        // Controlled recovery check
        if (retryCount < MAX_SEGMENT_RETRIES) {
          retryCount++;
          logDiagnostic('Recovery', `Retrying segment [${currentIdx}] (attempt ${retryCount}/${MAX_SEGMENT_RETRIES})`);
          speakNext();
        } else {
          // Max retries exceeded: skip to next segment to prevent indefinite stall
          logDiagnostic('Recovery', `Segment [${currentIdx}] failed after ${MAX_SEGMENT_RETRIES} retries. Skipping to next.`);
          retryCount = 0;
          currentIdx++;
          speakNext();
        }
      },
      () => {
        // onStart callback
        if (getSessionId() !== sessionId) return;
        if (callbacks.onUtteranceStart) {
          callbacks.onUtteranceStart(currentIdx);
        }
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
