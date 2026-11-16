// src/adapters/speechSynthesisAdapter.ts
// Native browser Web Speech API wrapper abstraction with mobile reliability optimizations:
// - Strong JS reference retention preventing Garbage Collection premature termination (Chrome/Safari)
// - Voice discovery, voiceschanged event subscription, and localized voice selection without UI friction
// - Chrome 15-second utterance pause keepalive watchdog
// - Stall watchdog timeout recovery for dropped or frozen synthesis utterances
// - Safe session-aware cancel and state management for iOS Safari audio engine stability

import { SpeechAdapter, SpeechEngineState } from '@/types';
import { logDiagnostic } from '../utils/logger';

// Module-level cached voices
let cachedVoices: SpeechSynthesisVoice[] = [];
let voicesInitialized = false;

export function clearVoiceCache(): void {
  cachedVoices = [];
  voicesInitialized = false;
}

function queryVoices(force = false): SpeechSynthesisVoice[] {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return [];
  }
  if (!force && cachedVoices.length > 0) {
    return cachedVoices;
  }
  try {
    const list = window.speechSynthesis.getVoices();
    if (list && list.length > 0) {
      cachedVoices = list;
      voicesInitialized = true;
    }
  } catch {
    // Ignore environments where getVoices throws
  }
  return cachedVoices;
}

/**
 * Discovers and selects the most suitable voice for speech synthesis.
 * Prioritizes:
 * 1. Matching language + localService + default voice
 * 2. Matching language + localService (preferred on mobile to prevent network dropouts)
 * 3. Matching language + default voice
 * 4. Any voice matching language prefix (e.g. 'en')
 * 5. Default browser voice
 */
export function selectBestVoice(lang = 'en-US'): SpeechSynthesisVoice | null {
  const voices = queryVoices();
  if (voices.length === 0) return null;

  const targetPrefix = lang.toLowerCase().split('-')[0];
  const langLower = lang.toLowerCase();

  // 1. Exact language match + local service + default
  const localDefaultMatch = voices.find(
    (v) => v.lang.toLowerCase() === langLower && v.localService && v.default,
  );
  if (localDefaultMatch) return localDefaultMatch;

  // 2. Exact language match + local service
  const localMatch = voices.find(
    (v) => v.lang.toLowerCase() === langLower && v.localService,
  );
  if (localMatch) return localMatch;

  // 3. Exact language match + default
  const exactDefaultMatch = voices.find(
    (v) => v.lang.toLowerCase() === langLower && v.default,
  );
  if (exactDefaultMatch) return exactDefaultMatch;

  // 4. Exact language match
  const exactMatch = voices.find(
    (v) => v.lang.toLowerCase() === langLower,
  );
  if (exactMatch) return exactMatch;

  // 5. Prefix match (e.g. en-GB, en-AU for en-US) + local service
  const prefixLocalMatch = voices.find(
    (v) => v.lang.toLowerCase().startsWith(targetPrefix) && v.localService,
  );
  if (prefixLocalMatch) return prefixLocalMatch;

  // 6. Prefix match
  const prefixMatch = voices.find(
    (v) => v.lang.toLowerCase().startsWith(targetPrefix),
  );
  if (prefixMatch) return prefixMatch;

  // 7. System default voice
  const defaultVoice = voices.find((v) => v.default);
  if (defaultVoice) return defaultVoice;

  return voices[0] || null;
}

export function createSpeechSynthesisAdapter(): SpeechAdapter {
  // GC Prevention: retain strong reference to active utterance while speaking
  let activeUtterance: SpeechSynthesisUtterance | null = null;
  let keepAliveInterval: ReturnType<typeof setInterval> | null = null;
  let stallTimeout: ReturnType<typeof setTimeout> | null = null;

  function clearTimers(): void {
    if (keepAliveInterval) {
      clearInterval(keepAliveInterval);
      keepAliveInterval = null;
    }
    if (stallTimeout) {
      clearTimeout(stallTimeout);
      stallTimeout = null;
    }
  }

  function detachUtterance(u: SpeechSynthesisUtterance): void {
    clearTimers();
    u.onstart = null;
    u.onend = null;
    u.onerror = null;
    if (activeUtterance === u) {
      activeUtterance = null;
    }
  }

  // Set up voiceschanged listener once if supported
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    queryVoices();
    if (!voicesInitialized && 'onvoiceschanged' in window.speechSynthesis) {
      window.speechSynthesis.addEventListener('voiceschanged', () => {
        queryVoices();
        logDiagnostic('Speech', `voiceschanged fired, loaded ${cachedVoices.length} voices`);
      }, { once: true });
    }
  }

  return {
    isSupported(): boolean {
      return (
        typeof window !== 'undefined' &&
        'speechSynthesis' in window &&
        'SpeechSynthesisUtterance' in window
      );
    },

    getState(): SpeechEngineState {
      const isClient = typeof window !== 'undefined' && 'speechSynthesis' in window;
      const synth = isClient ? window.speechSynthesis : null;
      return {
        speaking: synth ? synth.speaking : false,
        pending: synth ? synth.pending : false,
        paused: synth ? synth.paused : false,
        voiceName: activeUtterance?.voice?.name || undefined,
        voicesCount: cachedVoices.length,
      };
    },

    initVoices(): Promise<SpeechSynthesisVoice[]> {
      if (!this.isSupported()) {
        return Promise.resolve([]);
      }
      const existing = queryVoices();
      if (existing.length > 0) {
        return Promise.resolve(existing);
      }
      return new Promise((resolve) => {
        if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
          resolve([]);
          return;
        }
        const onVoices = () => {
          resolve(queryVoices(true));
        };
        window.speechSynthesis.addEventListener('voiceschanged', onVoices, { once: true });
        // Fallback timeout in case voiceschanged never fires (e.g. headless or unsupported)
        setTimeout(() => {
          resolve(queryVoices(true));
        }, 500);
      });
    },

    speak(
      text: string,
      rate: number,
      onEnd: () => void,
      onError: (error?: string) => void,
      onStart?: () => void,
    ): void {
      if (!this.isSupported()) {
        onEnd();
        return;
      }

      // Clear any remaining timers from previous utterance
      clearTimers();

      try {
        const synth = window.speechSynthesis;

        // Chrome/Safari edge case: if synthesizer was left in paused state, resume before speaking
        if (synth.paused) {
          synth.resume();
        }

        const utterance = new SpeechSynthesisUtterance(text);
        activeUtterance = utterance; // Strong reference keeps object alive in JS heap
        utterance.rate = rate;
        utterance.lang = 'en-US';

        const selectedVoice = selectBestVoice('en-US');
        if (selectedVoice) {
          utterance.voice = selectedVoice;
        }

        // Expected speaking duration based on length and rate with generous buffer
        // Average speaking rate: ~15 chars per second at 1.0 rate
        const estimatedSeconds = Math.max(10, (text.length / 15 / Math.max(rate, 0.5)) * 2.5);
        const stallMs = Math.round(estimatedSeconds * 1000);

        utterance.onstart = () => {
          logDiagnostic('Speech', 'Utterance started', {
            rate,
            voice: utterance.voice?.name,
            estimatedSeconds: Math.round(estimatedSeconds),
          });

          // Chrome 15s keepalive ping: pause and immediately resume periodically
          // to prevent Chrome's internal engine from timing out and stalling
          if (!keepAliveInterval) {
            keepAliveInterval = setInterval(() => {
              if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
                if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
                  window.speechSynthesis.pause();
                  window.speechSynthesis.resume();
                }
              }
            }, 10000);
          }

          if (onStart) {
            onStart();
          }
        };

        // Stall recovery timer: if utterance hangs and produces neither end nor error
        stallTimeout = setTimeout(() => {
          logDiagnostic('Recovery', `Utterance stall timeout triggered after ${stallMs}ms`, {
            speaking: synth.speaking,
            paused: synth.paused,
          });
          detachUtterance(utterance);
          onError('utterance-timeout');
        }, stallMs);

        utterance.onend = () => {
          logDiagnostic('Speech', 'Utterance ended cleanly');
          detachUtterance(utterance);
          onEnd();
        };

        utterance.onerror = (e) => {
          detachUtterance(utterance);
          if (e.error === 'canceled' || e.error === 'interrupted') {
            logDiagnostic('Speech', `Utterance cancelled or interrupted: ${e.error}`);
            return;
          }
          logDiagnostic('Speech', `Utterance error: ${e.error}`);
          onError(e.error);
        };

        synth.speak(utterance);
      } catch (err) {
        clearTimers();
        activeUtterance = null;
        const msg = err instanceof Error ? err.message : 'Speech synthesis failure';
        logDiagnostic('Speech', `Synchronous speech synthesis failure: ${msg}`);
        onError(msg);
      }
    },

    cancel(): void {
      clearTimers();
      if (activeUtterance) {
        activeUtterance.onstart = null;
        activeUtterance.onend = null;
        activeUtterance.onerror = null;
        activeUtterance = null;
      }
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        // Only cancel if actively speaking or pending to prevent iOS Safari audio engine lockup
        if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
          window.speechSynthesis.cancel();
        }
      }
    },

    pause(): void {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
          window.speechSynthesis.pause();
        }
      }
    },

    resume(): void {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
      }
    },
  };
}

/**
 * Creates a deterministic mock speech adapter for testing and environments without Web Speech API.
 */
export function createMockSpeechAdapter(options?: {
  instant?: boolean;
  onSpeak?: (text: string, rate: number) => void;
  shouldFailNext?: boolean;
  failureError?: string;
}): SpeechAdapter & {
  activeUtterances: string[];
  cancelledCount: number;
  isPaused: boolean;
  failNextUtterance: (error?: string) => void;
} {
  let cancelled = false;
  let isPaused = false;
  const activeUtterances: string[] = [];
  let cancelledCount = 0;
  let nextFailureError: string | null = options?.shouldFailNext
    ? options.failureError || 'synthetic-failure'
    : null;

  return {
    activeUtterances,
    get cancelledCount() {
      return cancelledCount;
    },
    get isPaused() {
      return isPaused;
    },
    failNextUtterance(error = 'synthetic-failure') {
      nextFailureError = error;
    },
    isSupported() {
      return true;
    },
    getState(): SpeechEngineState {
      return {
        speaking: activeUtterances.length > 0 && !isPaused,
        pending: false,
        paused: isPaused,
        voiceName: 'Mock Voice En-US',
        voicesCount: 1,
      };
    },
    initVoices(): Promise<SpeechSynthesisVoice[]> {
      return Promise.resolve([]);
    },
    speak(text, rate, onEnd, onError, onStart) {
      cancelled = false;
      activeUtterances.push(text);
      if (options?.onSpeak) {
        options.onSpeak(text, rate);
      }
      if (onStart) {
        onStart();
      }

      if (nextFailureError) {
        const err = nextFailureError;
        nextFailureError = null;
        if (options?.instant) {
          onError?.(err);
        } else {
          setTimeout(() => {
            if (!cancelled) {
              onError?.(err);
            }
          }, 5);
        }
        return;
      }

      if (options?.instant) {
        onEnd();
      } else {
        setTimeout(() => {
          if (!cancelled) {
            onEnd();
          }
        }, 10);
      }
    },
    cancel() {
      cancelled = true;
      cancelledCount++;
    },
    pause() {
      isPaused = true;
    },
    resume() {
      isPaused = false;
    },
  };
}
