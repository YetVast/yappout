import { describe, it, expect, vi } from 'vitest';
import { speakSegmentBySegment } from '@/core/playbackController';
import { createMockSpeechAdapter } from '@/adapters/speechSynthesisAdapter';
import { SegmentToken } from '@/types';

describe('Playback Controller & Session Protection', () => {
  const sampleSegments: SegmentToken[] = [
    { index: 0, text: 'First sentence.', section: 'body' },
    { index: 1, text: 'Second sentence.', section: 'body' },
    { index: 2, text: 'Third sentence.', section: 'body' },
  ];

  it('starts sequential speech synthesis with mock adapter', () => {
    const spoken: string[] = [];
    const adapter = createMockSpeechAdapter({
      instant: true,
      onSpeak: (text) => spoken.push(text),
    });

    const currentSession = 1;
    const segmentChanges: number[] = [];
    let completed = false;

    speakSegmentBySegment(
      sampleSegments,
      0,
      1,
      currentSession,
      () => currentSession,
      {
        onSegmentChange: (idx) => segmentChanges.push(idx),
        onComplete: () => {
          completed = true;
        },
      },
      adapter,
    );

    expect(spoken).toEqual(['First sentence.', 'Second sentence.', 'Third sentence.']);
    expect(segmentChanges).toEqual([0, 1, 2]);
    expect(completed).toBe(true);
  });

  it('rejects stale async callbacks when sessionId is incremented', () => {
    let currentSession = 1;
    let finishFirstUtterance: (() => void) | null = null;

    const customAdapter = {
      isSupported: () => true,
      cancel: vi.fn(),
      speak: (text: string, _rate: number, onEnd: () => void) => {
        if (!finishFirstUtterance) {
          finishFirstUtterance = onEnd;
        }
      },
    };

    const segmentChanges: number[] = [];
    let completed = false;

    speakSegmentBySegment(
      sampleSegments,
      0,
      1,
      1, // session 1
      () => currentSession,
      {
        onSegmentChange: (idx) => segmentChanges.push(idx),
        onComplete: () => {
          completed = true;
        },
      },
      customAdapter,
    );

    expect(segmentChanges).toEqual([0]);

    // Invalidate session before the first utterance completes (e.g. user seeks or stops)
    currentSession = 2;

    // Utterance 1 completes late (zombie callback)
    finishFirstUtterance!();

    // Because session changed, it must NOT advance to segment 1 or complete
    expect(segmentChanges).toEqual([0]);
    expect(completed).toBe(false);
  });

  it('resumes from current segment when speed changes without restarting from 0', () => {
    const spoken: string[] = [];
    const adapter = createMockSpeechAdapter({
      instant: true,
      onSpeak: (text) => spoken.push(text),
    });

    const currentSession = 10;
    const segmentChanges: number[] = [];

    // Simulate seeking/resuming from segment index 1 at 1.5x speed
    speakSegmentBySegment(
      sampleSegments,
      1, // start from segment 1
      1.5,
      currentSession,
      () => currentSession,
      {
        onSegmentChange: (idx) => segmentChanges.push(idx),
        onComplete: () => {},
      },
      adapter,
    );

    expect(segmentChanges).toEqual([1, 2]);
    expect(spoken).toEqual(['Second sentence.', 'Third sentence.']);
    expect(spoken).not.toContain('First sentence.');
  });

  it('skips empty whitespace segments gracefully', () => {
    const segmentsWithWhitespace: SegmentToken[] = [
      { index: 0, text: 'Valid sentence.', section: 'body' },
      { index: 1, text: '   ', section: 'body' },
      { index: 2, text: 'Final sentence.', section: 'body' },
    ];

    const spoken: string[] = [];
    const adapter = createMockSpeechAdapter({
      instant: true,
      onSpeak: (text) => spoken.push(text),
    });

    const currentSession = 1;
    const segmentChanges: number[] = [];

    speakSegmentBySegment(
      segmentsWithWhitespace,
      0,
      1,
      currentSession,
      () => currentSession,
      {
        onSegmentChange: (idx) => segmentChanges.push(idx),
        onComplete: () => {},
      },
      adapter,
    );

    expect(spoken).toEqual(['Valid sentence.', 'Final sentence.']);
    expect(segmentChanges).toEqual([0, 1, 2]);
  });
});
