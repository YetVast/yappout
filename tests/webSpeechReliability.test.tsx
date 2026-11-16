import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { useYappout } from '@/hooks/useYappout';
import { speakSegmentBySegment } from '@/core/playbackController';
import { createMockSpeechAdapter } from '@/adapters/speechSynthesisAdapter';
import { SegmentToken } from '@/types';

// @ts-expect-error React act environment flag
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('Web Speech API Reliability & Mobile Edge-Case Test Suite', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  // Helper component to exercise useYappout with a mock adapter
  function TestHarness({
    title,
    content,
    mockAdapter,
    onHookReady,
  }: {
    title: string;
    content: string;
    mockAdapter: ReturnType<typeof createMockSpeechAdapter>;
    onHookReady: (hook: ReturnType<typeof useYappout>) => void;
  }) {
    const titleRef = React.useRef<HTMLHeadingElement | null>(null);
    const bodyRef = React.useRef<HTMLDivElement | null>(null);
    const scrollContainerRef = React.useRef<HTMLDivElement | null>(null);

    const hook = useYappout({
      title,
      content,
      titleRef,
      bodyRef,
      scrollContainerRef,
      speechAdapter: mockAdapter,
    });

    React.useEffect(() => {
      onHookReady(hook);
    });

    return (
      <div ref={scrollContainerRef}>
        <h1 ref={titleRef}>{title}</h1>
        <div ref={bodyRef}>{content}</div>
      </div>
    );
  }

  const sampleSegments: SegmentToken[] = [
    { index: 0, text: 'Sentence one.', section: 'body' },
    { index: 1, text: 'Sentence two.', section: 'body' },
    { index: 2, text: 'Sentence three.', section: 'body' },
  ];

  // 1 & 2. Normal sequential playback, utterance completion and advancement
  it('advances through segments sequentially on utterance completion', () => {
    const spoken: string[] = [];
    const adapter = createMockSpeechAdapter({
      instant: true,
      onSpeak: (text) => spoken.push(text),
    });

    const segmentChanges: number[] = [];
    let completed = false;

    speakSegmentBySegment(
      sampleSegments,
      0,
      1,
      1,
      () => 1,
      {
        onSegmentChange: (idx) => segmentChanges.push(idx),
        onComplete: () => {
          completed = true;
        },
      },
      adapter,
    );

    expect(spoken).toEqual(['Sentence one.', 'Sentence two.', 'Sentence three.']);
    expect(segmentChanges).toEqual([0, 1, 2]);
    expect(completed).toBe(true);
  });

  // 3. Utterance error handling and controlled recovery
  it('retries transient segment error up to MAX_RETRIES before advancing', () => {
    const spoken: string[] = [];
    let failCount = 0;

    const adapter = {
      isSupported: () => true,
      cancel: vi.fn(),
      speak: (
        text: string,
        _rate: number,
        onEnd: () => void,
        onError: (err?: string) => void,
      ) => {
        spoken.push(text);
        if (text === 'Sentence one.' && failCount < 1) {
          failCount++;
          onError('transient-audio-busy');
        } else {
          onEnd();
        }
      },
    };

    const segmentChanges: number[] = [];
    const errors: string[] = [];
    let completed = false;

    speakSegmentBySegment(
      sampleSegments,
      0,
      1,
      1,
      () => 1,
      {
        onSegmentChange: (idx) => segmentChanges.push(idx),
        onComplete: () => {
          completed = true;
        },
        onError: (err) => {
          if (err) errors.push(err);
        },
      },
      adapter,
    );

    // Sentence one was retried and succeeded on attempt 2
    expect(spoken).toEqual([
      'Sentence one.', // initial failure
      'Sentence one.', // retry 1 -> success
      'Sentence two.',
      'Sentence three.',
    ]);
    expect(errors).toEqual(['transient-audio-busy']);
    expect(completed).toBe(true);
  });

  it('exceeds MAX_RETRIES on persistent error and gracefully advances without infinite loops', () => {
    const spoken: string[] = [];

    const adapter = {
      isSupported: () => true,
      cancel: vi.fn(),
      speak: (
        text: string,
        _rate: number,
        onEnd: () => void,
        onError: (err?: string) => void,
      ) => {
        spoken.push(text);
        if (text === 'Sentence one.') {
          onError('fatal-voice-crash');
        } else {
          onEnd();
        }
      },
    };

    let completed = false;

    speakSegmentBySegment(
      sampleSegments,
      0,
      1,
      1,
      () => 1,
      {
        onSegmentChange: () => {},
        onComplete: () => {
          completed = true;
        },
      },
      adapter,
    );

    // Initial attempt + 2 retries = 3 attempts total for Sentence one, then advanced to Sentence two
    expect(spoken.filter((s) => s === 'Sentence one.').length).toBe(3);
    expect(spoken).toContain('Sentence two.');
    expect(spoken).toContain('Sentence three.');
    expect(completed).toBe(true);
  });

  // 4. Rapid play/stop interactions
  it('cancels playback and invalidates session on rapid play/stop', () => {
    let hookInstance: ReturnType<typeof useYappout> | null = null;
    const adapter = createMockSpeechAdapter({ instant: false });

    act(() => {
      root.render(
        <TestHarness
          title="Rapid Test"
          content="First sentence. Second sentence."
          mockAdapter={adapter}
          onHookReady={(h) => {
            hookInstance = h;
          }}
        />,
      );
    });

    expect(hookInstance).not.toBeNull();

    // Trigger rapid play followed immediately by stop
    act(() => {
      hookInstance!.play();
      hookInstance!.stop();
    });

    expect(hookInstance!.playbackState).toBe('stopped');
    expect(hookInstance!.currentSegmentIndex).toBe(0);
    expect(adapter.cancelledCount).toBeGreaterThan(0);
  });

  // 5. Rapid seeking
  it('cancels in-flight speech and begins playback from requested segment on rapid seek', () => {
    let hookInstance: ReturnType<typeof useYappout> | null = null;
    const spoken: string[] = [];
    const adapter = createMockSpeechAdapter({
      instant: false,
      onSpeak: (t) => spoken.push(t),
    });

    act(() => {
      root.render(
        <TestHarness
          title="Seek Title"
          content="Segment zero. Segment one. Segment two. Segment three."
          mockAdapter={adapter}
          onHookReady={(h) => {
            hookInstance = h;
          }}
        />,
      );
    });

    // Rapid seeking: 0 -> 2 -> 3
    act(() => {
      hookInstance!.seekTo(0);
      hookInstance!.seekTo(2);
      hookInstance!.seekTo(3);
    });

    expect(hookInstance!.playbackState).toBe('playing');
    expect(hookInstance!.currentSegmentIndex).toBe(3);
  });

  // 6. Speed changes
  it('resumes playback from current segment at new speed without resetting position', () => {
    let hookInstance: ReturnType<typeof useYappout> | null = null;
    const adapter = createMockSpeechAdapter({ instant: false });

    act(() => {
      root.render(
        <TestHarness
          title="Speed Title"
          content="Sentence one. Sentence two. Sentence three."
          mockAdapter={adapter}
          onHookReady={(h) => {
            hookInstance = h;
          }}
        />,
      );
    });

    // Start playing and seek to segment 1
    act(() => {
      hookInstance!.seekTo(1);
    });

    expect(hookInstance!.currentSegmentIndex).toBe(1);
    expect(hookInstance!.speed).toBe(1);

    // Cycle speed to 1.5x
    act(() => {
      hookInstance!.cycleSpeed();
    });

    expect(hookInstance!.speed).toBe(1.5);
    // Position must NOT reset to 0
    expect(hookInstance!.currentSegmentIndex).toBe(1);
    expect(hookInstance!.playbackState).toBe('playing');
  });

  // 7. Stale callbacks from invalidated sessions
  it('safely ignores delayed callbacks from invalidated sessions', () => {
    let capturedOnEnd: (() => void) | null = null;
    const customAdapter = {
      isSupported: () => true,
      cancel: vi.fn(),
      speak: (
        _text: string,
        _rate: number,
        onEnd: () => void,
      ) => {
        capturedOnEnd = onEnd;
      },
    };

    let session = 1;
    const segmentChanges: number[] = [];
    let completed = false;

    speakSegmentBySegment(
      sampleSegments,
      0,
      1,
      session,
      () => session,
      {
        onSegmentChange: (idx) => segmentChanges.push(idx),
        onComplete: () => {
          completed = true;
        },
      },
      customAdapter,
    );

    expect(segmentChanges).toEqual([0]);

    // Invalidate session
    session = 2;

    // Late callback fires from session 1
    capturedOnEnd!();

    // Callback must be ignored; should not advance to segment 1
    expect(segmentChanges).toEqual([0]);
    expect(completed).toBe(false);
  });

  // 8. Duplicate utterance prevention
  it('prevents duplicate utterances when play() is called while already playing', () => {
    let hookInstance: ReturnType<typeof useYappout> | null = null;
    const spoken: string[] = [];
    const adapter = createMockSpeechAdapter({
      instant: false,
      onSpeak: (t) => spoken.push(t),
    });

    act(() => {
      root.render(
        <TestHarness
          title="Duplicate Guard"
          content="First test sentence. Second test sentence."
          mockAdapter={adapter}
          onHookReady={(h) => {
            hookInstance = h;
          }}
        />,
      );
    });

    act(() => {
      hookInstance!.play();
    });

    const countAfterFirstPlay = adapter.activeUtterances.length;

    // Call play() again while playing
    act(() => {
      hookInstance!.play();
    });

    // Must NOT queue any duplicate utterances
    expect(adapter.activeUtterances.length).toBe(countAfterFirstPlay);
  });

  // 9. Visibility changes during playback (does not stop playback)
  it('does not automatically stop playback when visibility changes to hidden', () => {
    let hookInstance: ReturnType<typeof useYappout> | null = null;
    const adapter = createMockSpeechAdapter({ instant: false });

    act(() => {
      root.render(
        <TestHarness
          title="Visibility Test"
          content="Sentence one. Sentence two."
          mockAdapter={adapter}
          onHookReady={(h) => {
            hookInstance = h;
          }}
        />,
      );
    });

    act(() => {
      hookInstance!.play();
    });

    expect(hookInstance!.playbackState).toBe('playing');

    // Simulate tab hiding
    Object.defineProperty(document, 'visibilityState', {
      value: 'hidden',
      configurable: true,
    });

    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });

    // Playback state must remain 'playing'
    expect(hookInstance!.playbackState).toBe('playing');
  });

  // 10. Returning to a previously hidden page
  it('resumes paused speech when returning from hidden page to foreground', () => {
    let hookInstance: ReturnType<typeof useYappout> | null = null;
    const adapter = createMockSpeechAdapter({ instant: false });

    act(() => {
      root.render(
        <TestHarness
          title="Foreground Test"
          content="Sentence one. Sentence two."
          mockAdapter={adapter}
          onHookReady={(h) => {
            hookInstance = h;
          }}
        />,
      );
    });

    act(() => {
      hookInstance!.play();
    });

    // Simulate browser background pause
    adapter.pause?.();
    expect(adapter.isPaused).toBe(true);

    // Return to visible tab
    Object.defineProperty(document, 'visibilityState', {
      value: 'visible',
      configurable: true,
    });

    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });

    // Adapter resume should have been called
    expect(adapter.isPaused).toBe(false);
  });

  // 11. Voice availability initialization on mount
  it('eagerly queries voice availability on hook initialization', () => {
    const adapter = createMockSpeechAdapter();
    const initSpy = vi.spyOn(adapter, 'initVoices');

    act(() => {
      root.render(
        <TestHarness
          title="Voice Test"
          content="Content."
          mockAdapter={adapter}
          onHookReady={() => {}}
        />,
      );
    });

    expect(initSpy).toHaveBeenCalled();
  });

  // 12. Playback completion and state reset
  it('transitions to completed and resets segment index to 0 when all segments finish', () => {
    let hookInstance: ReturnType<typeof useYappout> | null = null;
    const adapter = createMockSpeechAdapter({ instant: true });

    act(() => {
      root.render(
        <TestHarness
          title="Completion Title"
          content="Final sentence."
          mockAdapter={adapter}
          onHookReady={(h) => {
            hookInstance = h;
          }}
        />,
      );
    });

    act(() => {
      hookInstance!.play();
    });

    expect(hookInstance!.playbackState).toBe('completed');
    expect(hookInstance!.currentSegmentIndex).toBe(0);
  });

  // 13. Media Session API
  it('registers Media Session handlers and metadata when supported by navigator', () => {
    const actionHandlers = new Map<string, () => void>();
    const mockMediaSession = {
      metadata: null as unknown,
      playbackState: 'none',
      setActionHandler: vi.fn((action: string, handler: (() => void) | null) => {
        if (handler) {
          actionHandlers.set(action, handler);
        } else {
          actionHandlers.delete(action);
        }
      }),
    };

    // @ts-expect-error Mocking navigator.mediaSession
    navigator.mediaSession = mockMediaSession;
    // @ts-expect-error Mocking window.MediaMetadata
    window.MediaMetadata = class {
      title: string;
      artist: string;
      album: string;
      constructor(init: { title: string; artist: string; album: string }) {
        this.title = init.title;
        this.artist = init.artist;
        this.album = init.album;
      }
    };

    let hookInstance: ReturnType<typeof useYappout> | null = null;
    const adapter = createMockSpeechAdapter({ instant: false });

    act(() => {
      root.render(
        <TestHarness
          title="Media Session Doc"
          content="First sentence. Second sentence."
          mockAdapter={adapter}
          onHookReady={(h) => {
            hookInstance = h;
          }}
        />,
      );
    });

    expect(mockMediaSession.setActionHandler).toHaveBeenCalledWith('play', expect.any(Function));
    expect(mockMediaSession.setActionHandler).toHaveBeenCalledWith('pause', expect.any(Function));
    expect(mockMediaSession.setActionHandler).toHaveBeenCalledWith('nexttrack', expect.any(Function));
    expect(mockMediaSession.setActionHandler).toHaveBeenCalledWith('previoustrack', expect.any(Function));

    // Media action: trigger next track
    act(() => {
      hookInstance!.play();
    });
    expect(hookInstance!.playbackState).toBe('playing');
    expect(mockMediaSession.playbackState).toBe('playing');

    const nextHandler = actionHandlers.get('nexttrack');
    expect(nextHandler).toBeDefined();

    act(() => {
      nextHandler!();
    });

    // Advanced to next segment
    expect(hookInstance!.currentSegmentIndex).toBe(1);
  });
});
