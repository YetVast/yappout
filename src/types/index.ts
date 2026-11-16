// src/types/index.ts
// Core domain types for YappOut

export type PlaybackState = 'idle' | 'playing' | 'stopped' | 'completed';

export type HighlightMode = 'box' | 'underline' | 'background' | 'bold';

export interface WordToken {
  index: number;
  text: string;
  section: 'title' | 'body';
}

export interface SegmentToken {
  index: number;
  text: string;
  section: 'title' | 'body';
}

export interface ReadingSequence {
  segments: SegmentToken[];
  titleSegmentCount: number;
  words: WordToken[];
  titleWordCount: number;
}

export interface SegmentDOMEntry {
  segmentIndex: number;
  range: Range;
  text: string;
}

export type SegmentDOMMap = SegmentDOMEntry[];

export interface WordDOMEntry {
  wordIndex: number;
  range: Range;
}

export type WordDOMMap = WordDOMEntry[];

export interface SeekRequest {
  segmentIndex: number;
  sessionId: number;
  wordIndex?: number;
}

export interface RectItem {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface SpeechEngineState {
  speaking: boolean;
  pending: boolean;
  paused: boolean;
  voiceName?: string;
  voicesCount: number;
}

export interface SpeechAdapter {
  speak(
    text: string,
    rate: number,
    onEnd: () => void,
    onError: (error?: string) => void,
    onStart?: () => void,
  ): void;
  cancel(): void;
  isSupported(): boolean;
  pause?(): void;
  resume?(): void;
  getState?(): SpeechEngineState;
  initVoices?(): Promise<SpeechSynthesisVoice[]>;
}
