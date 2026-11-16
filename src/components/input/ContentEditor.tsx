'use client';
// src/components/input/ContentEditor.tsx
// Responsive text input workspace for plain text and Markdown

import { useMemo } from 'react';
import { Trash2, FileText, Clock, Type } from 'lucide-react';
import styles from './ContentEditor.module.css';

interface ContentEditorProps {
  title: string;
  content: string;
  onTitleChange: (val: string) => void;
  onContentChange: (val: string) => void;
  onClear: () => void;
  onLoadSample: () => void;
}

export function ContentEditor({
  title,
  content,
  onTitleChange,
  onContentChange,
  onClear,
  onLoadSample,
}: ContentEditorProps) {
  // Approximate word count
  const wordCount = useMemo(() => {
    const combined = `${title} ${content}`.trim();
    if (!combined) return 0;
    return combined.split(/\s+/).filter((w) => w.length > 0).length;
  }, [title, content]);

  // Estimated reading duration in minutes (avg 160 wpm speech synthesis rate)
  const estimatedReadingTime = useMemo(() => {
    if (wordCount === 0) return '0 min';
    const minutes = wordCount / 160;
    if (minutes < 1) return '< 1 min';
    return `${Math.ceil(minutes)} min`;
  }, [wordCount]);

  const hasContent = title.trim().length > 0 || content.trim().length > 0;

  return (
    <div className={styles.container}>
      <input
        type="text"
        className={styles.titleInput}
        placeholder="Document Title (optional — spoken first)"
        value={title}
        onChange={(e) => onTitleChange(e.target.value)}
        aria-label="Document Title"
      />

      <div className={styles.editorCard}>
        <textarea
          className={styles.textarea}
          placeholder="Paste or type any content or Markdown here to listen... YappOut reads sentences sequentially with zero lag and synchronized highlighting."
          value={content}
          onChange={(e) => onContentChange(e.target.value)}
          aria-label="Reading Content"
          rows={8}
        />

        <div className={styles.metaFooter}>
          <div className={styles.stats}>
            <span className={styles.statItem} title="Word count">
              <Type size={14} />
              <span>{wordCount.toLocaleString()} {wordCount === 1 ? 'word' : 'words'}</span>
            </span>

            <span className={styles.statItem} title="Estimated listening duration">
              <Clock size={14} />
              <span>{estimatedReadingTime}</span>
            </span>
          </div>

          <div className={styles.actions}>
            {!hasContent && (
              <button
                type="button"
                className={styles.btnSecondary}
                onClick={onLoadSample}
                title="Load sample Markdown text to test playback"
              >
                <FileText size={14} />
                <span>Load Sample</span>
              </button>
            )}

            {hasContent && (
              <button
                type="button"
                className={`${styles.btnSecondary} ${styles.destructive}`}
                onClick={onClear}
                title="Clear all text"
              >
                <Trash2 size={14} />
                <span>Clear</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
