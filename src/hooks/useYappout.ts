'use client';
// src/hooks/useYappout.ts
// Primary React hook for YappOut TTS and synchronized non-mutating reading
// Features: session-guarded playback, mobile browser lifecycle recovery, Media Session API support

import { useState, useEffect, useRef, useCallback, useMemo, RefObject } from 'react';
import {
  PlaybackState,
  ReadingSequence,
  SegmentDOMMap,
  WordDOMMap,
  SpeechAdapter,
} from '@/types';
import { buildReadingSequence } from '../core/readingSequence';
import {
  buildSegmentDOMMap,
  findSegmentIndexFromCaretRange,
  buildWordDOMMap,
} from '../core/wordTracker';
import { scrollSegmentIntoView } from '../core/scrollController';
import { speakSegmentBySegment } from '../core/playbackController';
import {
  SPEED_CYCLE,
  DEFAULT_SPEED_IDX,
  getSpeedLabel,
  getSpeed,
  nextSpeedIdx,
} from '../core/speedController';
import { attachDoubleTapHandler } from '../utils/doubleTapDetector';
import { createSpeechSynthesisAdapter } from '../adapters/speechSynthesisAdapter';
import { logDiagnostic } from '../utils/logger';

export interface UseYappoutOptions {
  title: string;
  content: string;
  titleRef: RefObject<HTMLElement | null>;
  bodyRef: RefObject<HTMLElement | null>;
  scrollContainerRef: RefObject<HTMLElement | null>;
  speechAdapter?: SpeechAdapter;
}

export interface UseYappoutReturn {
  playbackState: PlaybackState;
  currentSegmentIndex: number;
  currentWordIndex: number;
  readingSequence: ReadingSequence;
  speed: number;
  speedLabel: string;
  activeRange: Range | null;
  segmentDOMMap: SegmentDOMMap;
  wordDOMMap: WordDOMMap;
  play: () => void;
  stop: () => void;
  seekTo: (segmentIndex: number) => void;
  cycleSpeed: () => void;
}

export function useYappout({
  title,
  content,
  titleRef,
  bodyRef,
  scrollContainerRef,
  speechAdapter,
}: UseYappoutOptions): UseYappoutReturn {
  const [playbackState, setPlaybackState] = useState<PlaybackState>('idle');
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0);
  const [speedCycleIdx, setSpeedCycleIdx] = useState(DEFAULT_SPEED_IDX);
  const [segmentDOMMap, setSegmentDOMMap] = useState<SegmentDOMMap>([]);
  const [wordDOMMap, setWordDOMMap] = useState<WordDOMMap>([]);

  // Stable adapter reference
  const adapterRef = useRef<SpeechAdapter>(speechAdapter ?? createSpeechSynthesisAdapter());
  useEffect(() => {
    if (speechAdapter) {
      adapterRef.current = speechAdapter;
    }
  }, [speechAdapter]);

  // Eagerly initialize voice availability on mount
  useEffect(() => {
    adapterRef.current.initVoices?.().catch(() => {});
  }, []);

  // Purely derived reading sequence containing segments and words
  const readingSequence = useMemo(() => {
    if (!title && !content) {
      return {
        segments: [],
        titleSegmentCount: 0,
        words: [],
        titleWordCount: 0,
      };
    }
    return buildReadingSequence(title, content);
  }, [title, content]);

  // Authoritative active Range based on segmentDOMMap and currentSegmentIndex
  const activeRange = useMemo(() => {
    if (playbackState !== 'playing') return null;
    const entry = segmentDOMMap.find((e) => e.segmentIndex === currentSegmentIndex);
    return entry ? entry.range : null;
  }, [playbackState, currentSegmentIndex, segmentDOMMap]);

  // Stable refs for event callbacks & session guards
  const sessionIdRef = useRef(0);
  const playbackStateRef = useRef<PlaybackState>('idle');
  const currentSegmentIndexRef = useRef(0);
  const speedRef = useRef<number>(SPEED_CYCLE[DEFAULT_SPEED_IDX]);
  const readingSequenceRef = useRef<ReadingSequence>(readingSequence);

  useEffect(() => {
    readingSequenceRef.current = readingSequence;
  }, [readingSequence]);

  // Keep state refs in sync
  const updatePlaybackState = useCallback((state: PlaybackState) => {
    logDiagnostic('Session', `PlaybackState changed to: ${state}`);
    playbackStateRef.current = state;
    setPlaybackState(state);
  }, []);

  const updateCurrentSegmentIndex = useCallback((idx: number) => {
    currentSegmentIndexRef.current = idx;
    setCurrentSegmentIndex(idx);
  }, []);

  // When content changes, cancel any ongoing playback and reset state
  const prevContentKeyRef = useRef(`${title}:::${content}`);
  useEffect(() => {
    const currentKey = `${title}:::${content}`;
    if (prevContentKeyRef.current !== currentKey) {
      logDiagnostic('Session', 'Content changed, resetting session');
      prevContentKeyRef.current = currentKey;
      sessionIdRef.current++;
      adapterRef.current.cancel();
      updatePlaybackState('idle');
      updateCurrentSegmentIndex(0);
    }
  }, [title, content, updatePlaybackState, updateCurrentSegmentIndex]);

  // Clean up on component unmount
  useEffect(() => {
    const session = sessionIdRef;
    const adapter = adapterRef;
    return () => {
      session.current++;
      adapter.current.cancel();
    };
  }, []);

  // Rebuild DOM map after sequence changes with a debounce to allow DOM rendering
  useEffect(() => {
    const timer = setTimeout(() => {
      if (readingSequence.segments.length === 0 && readingSequence.words.length === 0) {
        setSegmentDOMMap([]);
        setWordDOMMap([]);
        return;
      }
      const segMap = buildSegmentDOMMap(
        titleRef.current,
        bodyRef.current,
        readingSequence.segments,
      );
      setSegmentDOMMap(segMap);

      const wMap = buildWordDOMMap(
        titleRef.current,
        bodyRef.current,
        readingSequence.words,
      );
      setWordDOMMap(wMap);
    }, 150);

    return () => clearTimeout(timer);
  }, [readingSequence, titleRef, bodyRef]);

  // Auto-scroll active segment into view within scrollContainer
  useEffect(() => {
    if (activeRange && scrollContainerRef.current) {
      scrollSegmentIntoView(activeRange, scrollContainerRef.current);
    }
  }, [activeRange, scrollContainerRef]);

  // Core play function with monotonic session ID guard
  const doPlay = useCallback(
    (fromIndex: number) => {
      if (!adapterRef.current.isSupported()) {
        logDiagnostic('Playback', 'Speech synthesis is unsupported on this browser');
        return;
      }

      adapterRef.current.cancel();
      const sessionId = ++sessionIdRef.current;
      logDiagnostic('Session', `Starting session ${sessionId} at segment ${fromIndex}`);
      updatePlaybackState('playing');

      speakSegmentBySegment(
        readingSequenceRef.current.segments,
        fromIndex,
        speedRef.current,
        sessionId,
        () => sessionIdRef.current,
        {
          onSegmentChange: (idx) => {
            updateCurrentSegmentIndex(idx);
          },
          onComplete: () => {
            logDiagnostic('Playback', `Session ${sessionId} completed`);
            updatePlaybackState('completed');
            updateCurrentSegmentIndex(0);
          },
          onError: (err) => {
            logDiagnostic('Recovery', `Session ${sessionId} error callback`, { error: err });
          },
        },
        adapterRef.current,
      );
    },
    [updatePlaybackState, updateCurrentSegmentIndex],
  );

  const play = useCallback(() => {
    if (playbackStateRef.current === 'playing') return;
    const startIdx =
      playbackStateRef.current === 'completed' ? 0 : currentSegmentIndexRef.current;
    doPlay(startIdx);
  }, [doPlay]);

  const stop = useCallback(() => {
    logDiagnostic('Session', `Stopping playback (session ${sessionIdRef.current})`);
    sessionIdRef.current++;
    adapterRef.current.cancel();
    updatePlaybackState('stopped');
    updateCurrentSegmentIndex(0);
  }, [updatePlaybackState, updateCurrentSegmentIndex]);

  const seekTo = useCallback(
    (segmentIndex: number) => {
      logDiagnostic('Session', `Seeking to segment ${segmentIndex}`);
      sessionIdRef.current++;
      adapterRef.current.cancel();
      updateCurrentSegmentIndex(segmentIndex);
      doPlay(segmentIndex);
    },
    [doPlay, updateCurrentSegmentIndex],
  );

  const cycleSpeed = useCallback(() => {
    setSpeedCycleIdx((prev) => {
      const next = nextSpeedIdx(prev);
      const newSpeed = SPEED_CYCLE[next];
      speedRef.current = newSpeed;
      logDiagnostic('Playback', `Cycling speed to ${newSpeed}x`);

      // If playing, restart from current segment with new speed without resetting to beginning
      if (playbackStateRef.current === 'playing') {
        const currentIdx = currentSegmentIndexRef.current;
        adapterRef.current.cancel();
        const newSessionId = ++sessionIdRef.current;
        speakSegmentBySegment(
          readingSequenceRef.current.segments,
          currentIdx,
          newSpeed,
          newSessionId,
          () => sessionIdRef.current,
          {
            onSegmentChange: (idx) => updateCurrentSegmentIndex(idx),
            onComplete: () => {
              updatePlaybackState('completed');
              updateCurrentSegmentIndex(0);
            },
          },
          adapterRef.current,
        );
      }

      return next;
    });
  }, [updatePlaybackState, updateCurrentSegmentIndex]);

  // Mobile browser lifecycle handling: visibilitychange, pagehide, pageshow, focus, blur
  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    const handleVisibilityChange = () => {
      const isHidden = document.visibilityState === 'hidden';
      logDiagnostic('Lifecycle', `visibilitychange: ${document.visibilityState}`, {
        playbackState: playbackStateRef.current,
        currentSegment: currentSegmentIndexRef.current,
      });

      // Do NOT automatically stop playback when hidden
      if (!isHidden && playbackStateRef.current === 'playing') {
        const adapter = adapterRef.current;
        const state = adapter.getState ? adapter.getState() : null;

        if (state?.paused) {
          logDiagnostic('Lifecycle', 'Resuming paused speech synthesis after returning to foreground');
          adapter.resume?.();
        } else if (state && !state.speaking && !state.pending) {
          // Engine halted or suspended while hidden; cleanly recover from current segment
          logDiagnostic('Lifecycle', 'Speech engine suspended while hidden. Recovering active segment.', {
            segmentIndex: currentSegmentIndexRef.current,
          });
          adapter.cancel();
          const newSessionId = ++sessionIdRef.current;
          speakSegmentBySegment(
            readingSequenceRef.current.segments,
            currentSegmentIndexRef.current,
            speedRef.current,
            newSessionId,
            () => sessionIdRef.current,
            {
              onSegmentChange: (idx) => updateCurrentSegmentIndex(idx),
              onComplete: () => {
                updatePlaybackState('completed');
                updateCurrentSegmentIndex(0);
              },
            },
            adapterRef.current,
          );
        }
      }
    };

    const handlePageHide = (e: PageTransitionEvent) => {
      logDiagnostic('Lifecycle', `pagehide (persisted: ${e.persisted})`, {
        playbackState: playbackStateRef.current,
      });
    };

    const handlePageShow = (e: PageTransitionEvent) => {
      logDiagnostic('Lifecycle', `pageshow (persisted: ${e.persisted})`, {
        playbackState: playbackStateRef.current,
      });
      if (e.persisted && playbackStateRef.current === 'playing') {
        handleVisibilityChange();
      }
    };

    const handleFocus = () => {
      logDiagnostic('Lifecycle', 'focus event');
      if (playbackStateRef.current === 'playing') {
        adapterRef.current.resume?.();
      }
    };

    const handleBlur = () => {
      logDiagnostic('Lifecycle', 'blur event');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('pageshow', handlePageShow);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('pageshow', handlePageShow);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, [updatePlaybackState, updateCurrentSegmentIndex]);

  // Media Session API integration (optional, feature-detected, zero-backend, zero-silent-audio)
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) {
      return;
    }

    try {
      const nav = navigator;

      // Update metadata
      if (typeof window !== 'undefined' && 'MediaMetadata' in window) {
        nav.mediaSession.metadata = new MediaMetadata({
          title: title.trim() || 'YappOut Reader',
          artist: 'YappOut',
          album: 'Audio-First Reading',
        });
      }

      // Update playbackState
      if (playbackState === 'playing') {
        nav.mediaSession.playbackState = 'playing';
      } else if (playbackState === 'stopped') {
        nav.mediaSession.playbackState = 'paused';
      } else {
        nav.mediaSession.playbackState = 'none';
      }

      const totalSegments = readingSequenceRef.current.segments.length;

      const handleMediaPlay = () => {
        logDiagnostic('MediaSession', 'Action: play');
        play();
      };

      const handleMediaPause = () => {
        logDiagnostic('MediaSession', 'Action: pause');
        stop();
      };

      const handleMediaStop = () => {
        logDiagnostic('MediaSession', 'Action: stop');
        stop();
      };

      const handleNextTrack = () => {
        logDiagnostic('MediaSession', 'Action: nexttrack');
        const nextIdx = currentSegmentIndexRef.current + 1;
        if (nextIdx < totalSegments) {
          seekTo(nextIdx);
        }
      };

      const handlePreviousTrack = () => {
        logDiagnostic('MediaSession', 'Action: previoustrack');
        const prevIdx = currentSegmentIndexRef.current - 1;
        if (prevIdx >= 0) {
          seekTo(prevIdx);
        }
      };

      nav.mediaSession.setActionHandler('play', handleMediaPlay);
      nav.mediaSession.setActionHandler('pause', handleMediaPause);
      nav.mediaSession.setActionHandler('stop', handleMediaStop);
      nav.mediaSession.setActionHandler('nexttrack', handleNextTrack);
      nav.mediaSession.setActionHandler('previoustrack', handlePreviousTrack);

      return () => {
        try {
          nav.mediaSession.setActionHandler('play', null);
          nav.mediaSession.setActionHandler('pause', null);
          nav.mediaSession.setActionHandler('stop', null);
          nav.mediaSession.setActionHandler('nexttrack', null);
          nav.mediaSession.setActionHandler('previoustrack', null);
        } catch {
          // Ignore action handler removal errors
        }
      };
    } catch {
      // Ignore browsers with partial Media Session API implementation
    }
  }, [playbackState, title, play, stop, seekTo]);

  // Attach double-click / double-tap handlers for segment seeking
  useEffect(() => {
    const titleEl = titleRef.current;
    const bodyEl = bodyRef.current;

    function handleDoubleTap(x: number, y: number) {
      const caretRange = getCaretRangeFromPoint(x, y);
      if (caretRange) {
        const segmentIndex = findSegmentIndexFromCaretRange(caretRange, segmentDOMMap);
        if (segmentIndex !== -1) {
          seekTo(segmentIndex);
          return;
        }
      }

      // Fallback: check element under point
      if (typeof document !== 'undefined' && typeof document.elementFromPoint === 'function') {
        const el = document.elementFromPoint(x, y);
        if (el) {
          for (const entry of segmentDOMMap) {
            try {
              if (
                entry.range.intersectsNode(el) ||
                el.contains(entry.range.commonAncestorContainer)
              ) {
                seekTo(entry.segmentIndex);
                return;
              }
            } catch {
              // ignore
            }
          }
        }
      }
    }

    const cleanups: (() => void)[] = [];
    if (titleEl) cleanups.push(attachDoubleTapHandler(titleEl, handleDoubleTap));
    if (bodyEl) cleanups.push(attachDoubleTapHandler(bodyEl, handleDoubleTap));

    return () => cleanups.forEach((fn) => fn());
  }, [titleRef, bodyRef, segmentDOMMap, seekTo]);

  const speed = getSpeed(speedCycleIdx);
  const speedLabel = getSpeedLabel(speedCycleIdx);

  return {
    playbackState,
    currentSegmentIndex,
    currentWordIndex: currentSegmentIndex,
    readingSequence,
    speed,
    speedLabel,
    activeRange,
    segmentDOMMap,
    wordDOMMap,
    play,
    stop,
    seekTo,
    cycleSpeed,
  };
}

/**
 * Cross-browser helper to get caret Range from screen coordinates.
 */
function getCaretRangeFromPoint(x: number, y: number): Range | null {
  if (typeof document === 'undefined') return null;

  const doc = document as Document & {
    caretRangeFromPoint?: (x: number, y: number) => Range | null;
    caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null;
  };

  if (typeof doc.caretRangeFromPoint === 'function') {
    return doc.caretRangeFromPoint(x, y);
  }
  if (typeof doc.caretPositionFromPoint === 'function') {
    const pos = doc.caretPositionFromPoint(x, y);
    if (pos) {
      const range = document.createRange();
      range.setStart(pos.offsetNode, pos.offset);
      range.collapse(true);
      return range;
    }
  }
  if (typeof window !== 'undefined' && window.getSelection) {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      return sel.getRangeAt(0);
    }
  }
  return null;
}
