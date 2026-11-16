'use client';
// src/hooks/useYappout.ts
// Primary React hook for YappOut TTS and synchronized non-mutating reading

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
      if (!adapterRef.current.isSupported()) return;

      adapterRef.current.cancel();
      const sessionId = ++sessionIdRef.current;
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
            updatePlaybackState('completed');
            updateCurrentSegmentIndex(0);
          },
          onError: () => {
            // Error handling maintains sequence or safe fallback
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
    sessionIdRef.current++;
    adapterRef.current.cancel();
    updatePlaybackState('stopped');
    updateCurrentSegmentIndex(0);
  }, [updatePlaybackState, updateCurrentSegmentIndex]);

  const seekTo = useCallback(
    (segmentIndex: number) => {
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
      speedRef.current = SPEED_CYCLE[next];

      // If playing, restart from current segment with new speed without resetting to beginning
      if (playbackStateRef.current === 'playing') {
        const currentIdx = currentSegmentIndexRef.current;
        setTimeout(() => {
          if (playbackStateRef.current === 'playing') {
            adapterRef.current.cancel();
            const newSessionId = ++sessionIdRef.current;
            speakSegmentBySegment(
              readingSequenceRef.current.segments,
              currentIdx,
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
        }, 0);
      }

      return next;
    });
  }, [updatePlaybackState, updateCurrentSegmentIndex]);

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
