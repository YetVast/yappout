'use client';
// src/components/input/ContentEditor.tsx
// Responsive text input workspace with collapsible minimized state and contextual title-side controls

import { ChevronDown, ChevronUp, FileText, Trash2 } from 'lucide-react';
import styles from './ContentEditor.module.css';

interface ContentEditorProps {
  title: string;
  content: string;
  isMinimized: boolean;
  onTitleChange: (val: string) => void;
  onContentChange: (val: string) => void;
  onToggleMinimize: () => void;
  onClear: () => void;
  onLoadSample: () => void;
}

export function ContentEditor({
  title,
  content,
  isMinimized,
  onTitleChange,
  onContentChange,
  onToggleMinimize,
  onClear,
  onLoadSample,
}: ContentEditorProps) {
  const hasContent = title.trim().length > 0 || content.trim().length > 0;

  return (
    <div className={styles.container}>
      <div className={styles.titleRow}>
        <input
          type="text"
          className={styles.titleInput}
          placeholder="Document Title (optional — spoken first)"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          aria-label="Document Title"
        />

        <div className={styles.titleAction}>
          {isMinimized ? (
            <button
              type="button"
              className={styles.titleControlBtn}
              onClick={onToggleMinimize}
              aria-label="Expand editor"
              title="Expand editor"
            >
              <ChevronDown size={18} />
            </button>
          ) : hasContent ? (
            <>
              <button
                type="button"
                className={styles.titleClearBtn}
                onClick={onClear}
                aria-label="Clear all content"
                title="Clear document title and content"
              >
                <Trash2 size={15} />
                <span>Clear</span>
              </button>
              <button
                type="button"
                className={styles.titleControlBtn}
                onClick={onToggleMinimize}
                aria-label="Minimize editor"
                title="Minimize editor"
              >
                <ChevronUp size={18} />
              </button>
            </>
          ) : (
            <button
              type="button"
              className={styles.titleSampleBtn}
              onClick={onLoadSample}
              aria-label="Load sample content"
              title="Load sample Markdown text to test playback"
            >
              <FileText size={15} />
              <span>Load Sample</span>
            </button>
          )}
        </div>
      </div>

      {!isMinimized && (
        <div className={styles.editorCard}>
          <textarea
            className={styles.textarea}
            placeholder="Paste or type any content or Markdown here to listen... YappOut reads sentences sequentially with zero lag and synchronized highlighting."
            value={content}
            onChange={(e) => onContentChange(e.target.value)}
            aria-label="Reading Content"
            rows={8}
          />
        </div>
      )}
    </div>
  );
}
