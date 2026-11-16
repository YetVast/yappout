'use client';
// src/components/reader/ReadingCanvas.tsx
// Rendered reading canvas with non-mutating synchronized highlight overlay supporting multiple visual modes

import { useMemo, RefObject } from 'react';
import { marked } from 'marked';
import DOMPurify from 'isomorphic-dompurify';
import { BookOpen } from 'lucide-react';
import { HighlightMode } from '@/types';
import { YappoutHighlight } from './YappoutHighlight';
import styles from './ReadingCanvas.module.css';

interface ReadingCanvasProps {
  title: string;
  content: string;
  titleRef: RefObject<HTMLHeadingElement | null>;
  bodyRef: RefObject<HTMLDivElement | null>;
  scrollContainerRef: RefObject<HTMLDivElement | null>;
  activeRange: Range | null;
  highlightMode?: HighlightMode;
}

export function ReadingCanvas({
  title,
  content,
  titleRef,
  bodyRef,
  scrollContainerRef,
  activeRange,
  highlightMode = 'box',
}: ReadingCanvasProps) {
  // Parse markdown into clean, sanitized HTML
  const renderedHtml = useMemo(() => {
    if (!content || content.trim().length === 0) return '';
    try {
      // Configure marked synchronous parse
      const rawHtml = marked.parse(content, { async: false }) as string;
      return DOMPurify.sanitize(rawHtml);
    } catch {
      // Fallback: simple escaped text
      return content.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
  }, [content]);

  const hasContent = title.trim().length > 0 || content.trim().length > 0;

  return (
    <div className={styles.canvasWrapper}>
      <div className={styles.canvasHeader}>
        <span>Reading Canvas</span>
      </div>

      <div ref={scrollContainerRef} className={styles.scrollContainer}>
        {!hasContent ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon} aria-hidden="true">
              <BookOpen size={24} />
            </div>
            <h3 className={styles.emptyTitle}>Nothing to read yet</h3>
            <p className={styles.emptyDescription}>
              Enter or paste text above, or click &ldquo;Load Sample&rdquo; to test YappOut&rsquo;s audio-first synchronized reading engine.
            </p>
          </div>
        ) : (
          <>
            {title.trim().length > 0 && (
              <h1 ref={titleRef} className={styles.title}>
                {title.trim()}
              </h1>
            )}

            {renderedHtml && (
              <div
                ref={bodyRef}
                className={styles.body}
                dangerouslySetInnerHTML={{ __html: renderedHtml }}
              />
            )}
          </>
        )}

        {/* Non-mutating visual highlight overlay */}
        <YappoutHighlight
          activeRange={activeRange}
          scrollContainerRef={scrollContainerRef}
          highlightMode={highlightMode}
        />
      </div>
    </div>
  );
}
