// src/index.ts
// Barrel exports for YappOut standalone engine

export * from './types';
export * from './constants';
export * from './adapters/speechSynthesisAdapter';
export * from './core/playbackController';
export * from './core/readingSequence';
export * from './core/scrollController';
export * from './core/seekController';
export * from './core/speedController';
export * from './core/wordTracker';
export * from './hooks/useYappout';
export * from './utils/textNormalizer';
export * from './utils/markdownExtractor';
export * from './utils/doubleTapDetector';
export * from './components/player/YappOutButton';
export * from './components/player/YappOutSpeed';
export * from './components/player/HighlightModeSelector';
export * from './components/player/PlayerControls';
export * from './components/reader/YappoutHighlight';
export * from './components/reader/ReadingCanvas';
export * from './components/input/ContentEditor';
export * from './components/layout/Header';
