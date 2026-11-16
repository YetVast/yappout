'use client';
// src/components/player/HighlightModeSelector.tsx
// Presentation control for cycling reading highlight visual modes

import { Scan, Underline, Highlighter, Bold } from 'lucide-react';
import { HighlightMode } from '@/types';
import {
  HIGHLIGHT_MODE_LABELS,
  HIGHLIGHT_MODE_DESCRIPTIONS,
} from '@/constants';
import styles from './PlayerControls.module.css';

interface HighlightModeSelectorProps {
  mode: HighlightMode;
  onCycle: () => void;
  disabled?: boolean;
}

export function HighlightModeSelector({
  mode,
  onCycle,
  disabled = false,
}: HighlightModeSelectorProps) {
  const currentLabel = HIGHLIGHT_MODE_LABELS[mode];
  const currentDesc = HIGHLIGHT_MODE_DESCRIPTIONS[mode];

  const renderIcon = () => {
    switch (mode) {
      case 'box':
        return <Scan size={18} />;
      case 'underline':
        return <Underline size={18} />;
      case 'background':
        return <Highlighter size={18} />;
      case 'bold':
        return <Bold size={18} />;
    }
  };

  return (
    <button
      type="button"
      className={styles.highlightModeButton}
      onClick={onCycle}
      disabled={disabled}
      aria-label={`Highlight mode: ${currentLabel}. Click to cycle modes.`}
      title={`Highlight mode: ${currentLabel} (${currentDesc}). Click to cycle (Box → Underline → Background → Bold).`}
    >
      {renderIcon()}
    </button>
  );
}
