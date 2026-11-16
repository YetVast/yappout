import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createSpeechSynthesisAdapter,
  selectBestVoice,
  clearVoiceCache,
} from '@/adapters/speechSynthesisAdapter';

describe('SpeechSynthesisAdapter Reliability & Mobile Hardening', () => {
  let mockSynth: {
    speaking: boolean;
    pending: boolean;
    paused: boolean;
    speak: ReturnType<typeof vi.fn>;
    cancel: ReturnType<typeof vi.fn>;
    pause: ReturnType<typeof vi.fn>;
    resume: ReturnType<typeof vi.fn>;
    getVoices: ReturnType<typeof vi.fn>;
    addEventListener: ReturnType<typeof vi.fn>;
    removeEventListener: ReturnType<typeof vi.fn>;
    onvoiceschanged: null | (() => void);
  };

  class MockUtterance {
    text: string;
    rate = 1;
    lang = 'en-US';
    voice: SpeechSynthesisVoice | null = null;
    onstart: (() => void) | null = null;
    onend: (() => void) | null = null;
    onerror: ((e: { error: string }) => void) | null = null;

    constructor(text: string) {
      this.text = text;
    }
  }

  beforeEach(() => {
    vi.useFakeTimers();
    clearVoiceCache();
    mockSynth = {
      speaking: false,
      pending: false,
      paused: false,
      speak: vi.fn(),
      cancel: vi.fn(),
      pause: vi.fn(),
      resume: vi.fn(),
      getVoices: vi.fn().mockReturnValue([]),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      onvoiceschanged: null,
    };

    // @ts-expect-error Mocking window.speechSynthesis
    window.speechSynthesis = mockSynth;
    // @ts-expect-error Mocking window.SpeechSynthesisUtterance
    window.SpeechSynthesisUtterance = MockUtterance;
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it('detects isSupported when window.speechSynthesis and SpeechSynthesisUtterance exist', () => {
    const adapter = createSpeechSynthesisAdapter();
    expect(adapter.isSupported()).toBe(true);
  });

  it('selects the best local voice matching language without user friction', () => {
    const mockVoices: SpeechSynthesisVoice[] = [
      {
        name: 'Remote Voice',
        lang: 'en-US',
        localService: false,
        default: false,
        voiceURI: 'remote-1',
      },
      {
        name: 'Local Default Voice',
        lang: 'en-US',
        localService: true,
        default: true,
        voiceURI: 'local-1',
      },
      {
        name: 'French Voice',
        lang: 'fr-FR',
        localService: true,
        default: false,
        voiceURI: 'fr-1',
      },
    ];

    mockSynth.getVoices.mockReturnValue(mockVoices);

    const voice = selectBestVoice('en-US');
    expect(voice).not.toBeNull();
    expect(voice?.name).toBe('Local Default Voice');
  });

  it('initializes voices asynchronously via voiceschanged event if initially empty', async () => {
    let voicesListener: (() => void) | null = null;
    mockSynth.getVoices.mockReturnValue([]);
    mockSynth.addEventListener.mockImplementation((event, listener) => {
      if (event === 'voiceschanged') {
        voicesListener = listener as () => void;
      }
    });

    const adapter = createSpeechSynthesisAdapter();
    const initPromise = adapter.initVoices?.();

    const mockVoices = [
      { name: 'Loaded Voice', lang: 'en-US', localService: true, default: true, voiceURI: 'v1' },
    ] as SpeechSynthesisVoice[];

    mockSynth.getVoices.mockReturnValue(mockVoices);
    if (typeof voicesListener === 'function') {
      (voicesListener as () => void)();
    }

    const voices = await initPromise;
    expect(voices).toEqual(mockVoices);
  });

  it('resumes speech synthesis before speaking if synthesizer is in paused state', () => {
    mockSynth.paused = true;
    mockSynth.speak.mockImplementation((utt: MockUtterance) => {
      mockSynth.speaking = true;
      utt.onstart?.();
    });

    const adapter = createSpeechSynthesisAdapter();
    adapter.speak('Hello world', 1, () => {}, () => {});

    expect(mockSynth.resume).toHaveBeenCalled();
    expect(mockSynth.speak).toHaveBeenCalled();
  });

  it('retains active utterance reference and safely cleans up on completion', () => {
    let capturedUtterance: MockUtterance | null = null;
    mockSynth.speak.mockImplementation((utt: MockUtterance) => {
      capturedUtterance = utt;
      mockSynth.speaking = true;
      utt.onstart?.();
    });

    const adapter = createSpeechSynthesisAdapter();
    let ended = false;

    adapter.speak('Retention test', 1, () => {
      ended = true;
    }, () => {});

    expect(capturedUtterance).not.toBeNull();
    const stateBefore = adapter.getState?.();
    expect(stateBefore?.speaking).toBe(true);

    // Simulate completion
    capturedUtterance!.onend?.();
    expect(ended).toBe(true);
  });

  it('detects utterance stall timeout when browser drops speech events', () => {
    mockSynth.speak.mockImplementation(() => {
      // Intentionally simulate a frozen browser speech engine: neither onstart, onend, nor onerror fire
      mockSynth.speaking = false;
    });

    const adapter = createSpeechSynthesisAdapter();
    let receivedError: string | undefined;

    adapter.speak('Short text', 1, () => {}, (err) => {
      receivedError = err;
    });

    expect(receivedError).toBeUndefined();

    // Advance past stall timeout (minimum 10000ms)
    vi.advanceTimersByTime(11000);

    expect(receivedError).toBe('utterance-timeout');
  });

  it('cancels speech safely without locking iOS Safari audio engine when idle', () => {
    mockSynth.speaking = false;
    mockSynth.pending = false;

    const adapter = createSpeechSynthesisAdapter();
    adapter.cancel();

    // Because neither speaking nor pending is true, cancel() is not called on the native synth
    expect(mockSynth.cancel).not.toHaveBeenCalled();

    // When speaking is true, cancel IS called
    mockSynth.speaking = true;
    adapter.cancel();
    expect(mockSynth.cancel).toHaveBeenCalledTimes(1);
  });

  it('triggers Chrome keepalive ping periodically during long utterances', () => {
    let capturedUtterance: MockUtterance | null = null;
    mockSynth.speak.mockImplementation((utt: MockUtterance) => {
      capturedUtterance = utt;
      mockSynth.speaking = true;
      utt.onstart?.();
    });

    const adapter = createSpeechSynthesisAdapter();
    adapter.speak('A very long text segment that takes more than fifteen seconds to read completely...', 1, () => {}, () => {});

    expect(mockSynth.pause).not.toHaveBeenCalled();

    // Advance 10s: keepalive interval fires
    vi.advanceTimersByTime(10500);

    expect(mockSynth.pause).toHaveBeenCalledTimes(1);
    expect(mockSynth.resume).toHaveBeenCalledTimes(1);

    // Utterance finishes: keepalive interval is cleared
    capturedUtterance!.onend?.();

    vi.advanceTimersByTime(15000);
    // Pause count should not increase further
    expect(mockSynth.pause).toHaveBeenCalledTimes(1);
  });

  it('handles intentional cancel/interrupted errors without invoking onError', () => {
    let capturedUtterance: MockUtterance | null = null;
    mockSynth.speak.mockImplementation((utt: MockUtterance) => {
      capturedUtterance = utt;
    });

    const adapter = createSpeechSynthesisAdapter();
    const onError = vi.fn();
    const onEnd = vi.fn();

    adapter.speak('Interrupted segment', 1, onEnd, onError);

    capturedUtterance!.onerror?.({ error: 'interrupted' });
    expect(onError).not.toHaveBeenCalled();
    expect(onEnd).not.toHaveBeenCalled();

    capturedUtterance!.onerror?.({ error: 'canceled' });
    expect(onError).not.toHaveBeenCalled();
  });
});
