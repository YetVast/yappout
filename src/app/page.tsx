'use client';
// src/app/page.tsx
// Standalone YappOut V0 homepage: complete audio-first synchronized reading experience

import { useState, useRef, useTransition } from 'react';
import { Header } from '@/components/layout/Header';
import { ContentEditor } from '@/components/input/ContentEditor';
import { PlayerControls } from '@/components/player/PlayerControls';
import { ReadingCanvas } from '@/components/reader/ReadingCanvas';
import { useYappout } from '@/hooks/useYappout';
import styles from './page.module.css';

const SAMPLE_TITLE = 'The Art of Synchronized Reading';
const SAMPLE_CONTENT = `YappOut transforms how you consume long-form text. By synchronizing natural speech synthesis with precise visual highlighting, your eyes and ears work together in seamless harmony.

Dual-modality reading significantly increases reading comprehension and sustained focus. Whether you are reviewing technical documentation, studying dense scientific papers, or catching up on newsletters, active visual anchoring prevents cognitive fatigue and line-skipping.

### Key Capabilities

- **Zero DOM Mutation:** Unlike ordinary screen extensions, YappOut never injects intrusive spans or marks into your document.
- **Natural Boundary Detection:** Sentences and clauses split at natural punctuation marks like commas, periods, and colons.
- **Abbreviation & Number Awareness:** Common abbreviations like Dr. Smith, e.g., and etc., as well as numerical figures like 3.14 and 10,000, remain contiguous and uninterrupted.
- **Spatial Caret Seeking:** Notice an interesting section further down? Double-click on desktop or double-tap on mobile anywhere on this text to instantly jump playback to that exact sentence!

Give it a try now: adjust the playback speed, tap any sentence to seek, and experience fluid, audio-first reading.`;

export default function HomePage() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
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

  const handleClear = () => {
    stop();
    startTransition(() => {
      setTitle('');
      setContent('');
    });
  };

  const handleLoadSample = () => {
    stop();
    startTransition(() => {
      setTitle(SAMPLE_TITLE);
      setContent(SAMPLE_CONTENT);
    });
  };

  const hasContent = title.trim().length > 0 || content.trim().length > 0;

  return (
    <div className={styles.main}>
      <Header />

      <main className={styles.contentWrapper}>
        <section className={styles.introSection}>
          <h2 className={styles.heroHeading}>Listen and read in perfect sync</h2>
          <p className={styles.heroSubtitle}>
            Paste any text or Markdown below. YappOut reads your document aloud while tracking the active sentence in real time.
          </p>
        </section>

        <section className={styles.workspaceSection}>
          <ContentEditor
            title={title}
            content={content}
            onTitleChange={setTitle}
            onContentChange={setContent}
            onClear={handleClear}
            onLoadSample={handleLoadSample}
          />

          <div className={styles.controlsStickyWrapper}>
            <PlayerControls
              playbackState={playbackState}
              currentSegmentIndex={currentSegmentIndex}
              totalSegments={readingSequence.segments.length}
              speedLabel={speedLabel}
              hasContent={hasContent}
              onPlay={play}
              onStop={stop}
              onCycleSpeed={cycleSpeed}
            />
          </div>

          <ReadingCanvas
            title={title}
            content={content}
            titleRef={titleRef}
            bodyRef={bodyRef}
            scrollContainerRef={scrollContainerRef}
            activeRange={activeRange}
          />
        </section>
      </main>

      <footer className={styles.footer}>
        <p>YappOut V0 &bull; Audio-First Reading &bull; Yet Vast Solutions</p>
      </footer>
    </div>
  );
}
