'use client';
// src/app/page.tsx
// Standalone YappOut V0 homepage: audio-first synchronized reader with highlight modes and collapsible editor

import { useState, useRef, useTransition, useMemo } from 'react';
import { Header } from '@/components/layout/Header';
import { ContentEditor } from '@/components/input/ContentEditor';
import { PlayerControls } from '@/components/player/PlayerControls';
import { ReadingCanvas } from '@/components/reader/ReadingCanvas';
import { useYappout } from '@/hooks/useYappout';
import { HighlightMode } from '@/types';
import { DEFAULT_HIGHLIGHT_MODE, getNextHighlightMode } from '@/constants';
import styles from './page.module.css';

export default function HomePage() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isEditorMinimized, setIsEditorMinimized] = useState(false);
  const [highlightMode, setHighlightMode] = useState<HighlightMode>(DEFAULT_HIGHLIGHT_MODE);
  const [, startTransition] = useTransition();

  const titleRef = useRef<HTMLHeadingElement | null>(null);
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  const {
    playbackState,
    currentSegmentIndex,
    readingSequence,
    speedLabel,
    activeRange,
    play,
    stop,
    cycleSpeed,
  } = useYappout({
    title,
    content,
    titleRef,
    bodyRef,
    scrollContainerRef,
  });

  // Calculate approximate word count
  const wordCount = useMemo(() => {
    const combined = `${title} ${content}`.trim();
    if (!combined) return 0;
    return combined.split(/\s+/).filter((w) => w.length > 0).length;
  }, [title, content]);

  // Estimated reading duration in minutes (avg 160 wpm speech synthesis rate)
  const readingTime = useMemo(() => {
    if (wordCount === 0) return '0 min';
    const minutes = wordCount / 160;
    if (minutes < 1) return '< 1 min';
    return `${Math.ceil(minutes)} min`;
  }, [wordCount]);

  const handleClear = () => {
    stop();
    startTransition(() => {
      setTitle('');
      setContent('');
      setIsEditorMinimized(false);
    });
  };

  const handleLoadSample = async () => {
    stop();
    try {
      const res = await fetch('/yappout-info.json');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const sampleTitle = typeof data.sampleTitle === 'string' ? data.sampleTitle : '';
      const sampleBody = typeof data.sampleBody === 'string' ? data.sampleBody : '';

      stop();
      startTransition(() => {
        setTitle(sampleTitle);
        setContent(sampleBody);
        setIsEditorMinimized(false);
      });
    } catch (err) {
      console.error('Failed to load sample content from yappout-info.json:', err);
    }
  };

  const handlePlay = () => {
    setIsEditorMinimized(true);
    play();
  };

  const handleCycleHighlightMode = () => {
    setHighlightMode((prev) => getNextHighlightMode(prev));
  };

  const handleToggleMinimize = () => {
    setIsEditorMinimized((prev) => !prev);
  };

  const hasContent = title.trim().length > 0 || content.trim().length > 0;

  return (
    <div className={styles.main}>
      <Header onLoadSample={handleLoadSample} />

      <main className={styles.contentWrapper}>
        <section className={styles.workspaceSection}>
          <ContentEditor
            title={title}
            content={content}
            isMinimized={isEditorMinimized}
            onTitleChange={setTitle}
            onContentChange={setContent}
            onToggleMinimize={handleToggleMinimize}
            onClear={handleClear}
            onLoadSample={handleLoadSample}
          />

          <div className={styles.controlsStickyWrapper}>
            <PlayerControls
              playbackState={playbackState}
              currentSegmentIndex={currentSegmentIndex}
              totalSegments={readingSequence.segments.length}
              speedLabel={speedLabel}
              highlightMode={highlightMode}
              wordCount={wordCount}
              readingTime={readingTime}
              hasContent={hasContent}
              onPlay={handlePlay}
              onStop={stop}
              onCycleSpeed={cycleSpeed}
              onCycleHighlightMode={handleCycleHighlightMode}
            />
          </div>

          <ReadingCanvas
            title={title}
            content={content}
            titleRef={titleRef}
            bodyRef={bodyRef}
            scrollContainerRef={scrollContainerRef}
            activeRange={activeRange}
            highlightMode={highlightMode}
          />
        </section>
      </main>

      <footer className={styles.footer}>
        <p>YappOut V0 &bull; Audio-First Reading &bull; Yet Vast Solutions</p>
      </footer>
    </div>
  );
}
