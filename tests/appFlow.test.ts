import { describe, it, expect, vi } from 'vitest';
import { createMockSpeechAdapter } from '@/adapters/speechSynthesisAdapter';
import { buildReadingSequence } from '@/core/readingSequence';
import { speakSegmentBySegment } from '@/core/playbackController';

describe('Application Core Flow & State Integration', () => {
  it('identifies empty input as having zero segments and empty sequence', () => {
    const sequence = buildReadingSequence('', '');
    expect(sequence.segments.length).toBe(0);
    expect(sequence.words.length).toBe(0);
  });

  it('populates segments when valid content is supplied and executes speech cycle', () => {
    const mockAdapter = createMockSpeechAdapter({ instant: true });
    const sequence = buildReadingSequence('Title Test', 'Hello world. Testing YappOut speech.');

    expect(sequence.segments.length).toBe(3); // 1 title + 2 body segments

    const segmentIndices: number[] = [];
    let completed = false;

    speakSegmentBySegment(
      sequence.segments,
      0,
      1,
      1,
      () => 1,
      {
        onSegmentChange: (idx) => segmentIndices.push(idx),
        onComplete: () => {
          completed = true;
        },
      },
      mockAdapter,
    );

    expect(mockAdapter.activeUtterances).toEqual([
      'Title Test',
      'Hello world.',
      'Testing YappOut speech.',
    ]);
    expect(segmentIndices).toEqual([0, 1, 2]);
    expect(completed).toBe(true);
  });

  it('cancels active playback when stop action is invoked', () => {
    const mockAdapter = createMockSpeechAdapter({ instant: false });
    const sequence = buildReadingSequence('Stop Test', 'Sentence one. Sentence two.');

    let sessionId = 1;
    const onSegmentChange = vi.fn();
    const onComplete = vi.fn();

    speakSegmentBySegment(
      sequence.segments,
      0,
      1,
      sessionId,
      () => sessionId,
      {
        onSegmentChange,
        onComplete,
      },
      mockAdapter,
    );

    // Stop action: increment sessionId and call cancel
    sessionId++;
    mockAdapter.cancel();

    expect(mockAdapter.cancelledCount).toBe(1);
    expect(onComplete).not.toHaveBeenCalled();
  });
});
