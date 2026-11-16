// src/adapters/speechSynthesisAdapter.ts
// Native browser Web Speech API wrapper abstraction

import { SpeechAdapter } from '@/types';

export function createSpeechSynthesisAdapter(): SpeechAdapter {
  return {
    isSupported(): boolean {
      return typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
    },

    speak(
      text: string,
      rate: number,
      onEnd: () => void,
      onError: (error?: string) => void,
    ): void {
      if (!this.isSupported()) {
        onEnd();
        return;
      }

      try {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = rate;
        utterance.lang = 'en-US';

        utterance.onend = () => {
          onEnd();
        };

        utterance.onerror = (e) => {
          if (e.error === 'canceled' || e.error === 'interrupted') {
            return;
          }
          onError(e.error);
        };

        window.speechSynthesis.speak(utterance);
      } catch (err) {
        onError(err instanceof Error ? err.message : 'Speech synthesis failure');
      }
    },

    cancel(): void {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
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
}): SpeechAdapter & { activeUtterances: string[]; cancelledCount: number } {
  let cancelled = false;
  const activeUtterances: string[] = [];
  let cancelledCount = 0;

  return {
    activeUtterances,
    get cancelledCount() {
      return cancelledCount;
    },
    isSupported() {
      return true;
    },
    speak(text, rate, onEnd) {
      cancelled = false;
      activeUtterances.push(text);
      if (options?.onSpeak) {
        options.onSpeak(text, rate);
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
  };
}
