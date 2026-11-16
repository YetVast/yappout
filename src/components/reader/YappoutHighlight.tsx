'use client';
// src/components/reader/YappoutHighlight.tsx
// Fixed-position non-mutating visual overlay that tracks the active segment with multiple presentation modes

import { useEffect, useState, RefObject } from 'react';
import { RectItem, HighlightMode } from '@/types';
import { COLOR_YELLOW, COLOR_INDIGO_VIOLET } from '@/constants';

interface YappoutHighlightProps {
  activeRange: Range | null;
  scrollContainerRef: RefObject<HTMLElement | null>;
  highlightMode?: HighlightMode;
}

export function YappoutHighlight({
  activeRange,
  scrollContainerRef,
  highlightMode = 'box',
}: YappoutHighlightProps) {
  const [rects, setRects] = useState<RectItem[]>([]);

  // Update client rects on scroll/resize and active range changes
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!activeRange || !container) {
      setRects([]);
      return;
    }

    function update() {
      if (!activeRange) {
        setRects([]);
        return;
      }

      // getClientRects returns individual line rects when segment wraps across multiple lines
      const clientRects = activeRange.getClientRects();
      const list: RectItem[] = [];

      if (clientRects && clientRects.length > 0) {
        for (let i = 0; i < clientRects.length; i++) {
          const r = clientRects[i];
          if (r.width > 0 && r.height > 0) {
            list.push({
              left: r.left,
              top: r.top,
              width: r.width,
              height: r.height,
            });
          }
        }
      }

      // Fallback to bounding rect if getClientRects yielded no entries
      if (list.length === 0) {
        const bounding = activeRange.getBoundingClientRect();
        if (bounding && bounding.width > 0 && bounding.height > 0) {
          list.push({
            left: bounding.left,
            top: bounding.top,
            width: bounding.width,
            height: bounding.height,
          });
        }
      }

      setRects(list);
    }

    update();

    container.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update, { passive: true });

    return () => {
      container.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [activeRange, scrollContainerRef]);

  // Synchronize CSS Custom Highlight API for Bold typography mode
  useEffect(() => {
    if (typeof window === 'undefined' || typeof CSS === 'undefined' || !('highlights' in CSS)) {
      return;
    }

    try {
      const highlights = (CSS as unknown as { highlights: Map<string, unknown> }).highlights;
      if (highlightMode === 'bold' && activeRange) {
        const highlight = new Highlight(activeRange);
        highlights.set('yappout-bold', highlight);
      } else {
        highlights.delete('yappout-bold');
      }
    } catch {
      // CSS Highlight API unsupported or threw
    }

    return () => {
      try {
        if (typeof CSS !== 'undefined' && 'highlights' in CSS) {
          const highlights = (CSS as unknown as { highlights: Map<string, unknown> }).highlights;
          highlights.delete('yappout-bold');
        }
      } catch {
        // ignore
      }
    };
  }, [activeRange, highlightMode]);

  if (!activeRange || rects.length === 0) return null;

  const getStyleForMode = (rect: RectItem): React.CSSProperties => {
    const base: React.CSSProperties = {
      position: 'fixed',
      pointerEvents: 'none',
      zIndex: 9000,
      transition:
        'left 0.05s ease-out, top 0.05s ease-out, width 0.05s ease-out, height 0.05s ease-out',
    };

    switch (highlightMode) {
      case 'box':
        return {
          ...base,
          left: rect.left - 2,
          top: rect.top - 2,
          width: rect.width + 4,
          height: rect.height + 4,
          outline: `2px solid var(--highlight-inner, ${COLOR_YELLOW})`,
          outlineOffset: '1px',
          boxShadow: `0 0 0 4px var(--highlight-outer, ${COLOR_INDIGO_VIOLET})`,
          borderRadius: '2px',
          background: 'transparent',
        };

      case 'underline':
        return {
          ...base,
          left: rect.left - 1,
          top: rect.top,
          width: rect.width + 2,
          height: rect.height,
          borderBottom: '3.5px solid var(--highlight-underline, #4B0084)',
          background: 'transparent',
          outline: 'none',
          boxShadow: 'none',
          borderRadius: 0,
        };

      case 'background':
        return {
          ...base,
          left: rect.left - 2,
          top: rect.top - 1,
          width: rect.width + 4,
          height: rect.height + 2,
          background: 'var(--highlight-bg, rgba(255, 255, 17, 0.45))',
          borderRadius: '3px',
          outline: 'none',
          boxShadow: 'none',
        };

      case 'bold':
        return {
          ...base,
          left: rect.left,
          top: rect.top,
          width: rect.width,
          height: rect.height,
          background: 'transparent',
          outline: 'none',
          boxShadow: 'none',
          backdropFilter: 'url(#yappout-bold-dilate)',
          WebkitBackdropFilter: 'url(#yappout-bold-dilate)',
        };
    }
  };

  return (
    <>
      {/* Dynamic CSS rule for Custom Highlight API in Bold mode */}
      <style>{'::highlight(yappout-bold) { text-shadow: 0.5px 0 0 currentColor, -0.5px 0 0 currentColor, 0 0.5px 0 currentColor, 0 -0.5px 0 currentColor; }'}</style>

      {/* SVG filter definition for Bold mode backdrop filtering */}
      <svg
        width="0"
        height="0"
        style={{ position: 'fixed', left: -9999, top: -9999, pointerEvents: 'none' }}
        aria-hidden="true"
      >
        <defs>
          <filter id="yappout-bold-dilate">
            <feMorphology operator="dilate" radius="0.5" in="SourceGraphic" />
          </filter>
        </defs>
      </svg>

      {rects.map((rect, idx) => (
        <div key={idx} style={getStyleForMode(rect)} aria-hidden="true" />
      ))}
    </>
  );
}
