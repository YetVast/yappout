'use client';
// src/components/reader/YappoutHighlight.tsx
// Fixed-position non-mutating visual overlay that tracks the active segment

import { useEffect, useState, RefObject } from 'react';
import { RectItem } from '@/types';
import { COLOR_YELLOW, COLOR_INDIGO_VIOLET } from '@/constants';

interface YappoutHighlightProps {
  activeRange: Range | null;
  scrollContainerRef: RefObject<HTMLElement | null>;
}

export function YappoutHighlight({ activeRange, scrollContainerRef }: YappoutHighlightProps) {
  const [rects, setRects] = useState<RectItem[]>([]);

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

  if (!activeRange || rects.length === 0) return null;

  return (
    <>
      {rects.map((rect, idx) => (
        <div
          key={idx}
          style={{
            position: 'fixed',
            pointerEvents: 'none',
            zIndex: 9000,
            left: rect.left - 2,
            top: rect.top - 2,
            width: rect.width + 4,
            height: rect.height + 4,
            outline: `2px solid ${COLOR_YELLOW}`,
            outlineOffset: '1px',
            boxShadow: `0 0 0 4px ${COLOR_INDIGO_VIOLET}`,
            borderRadius: '2px',
            transition: 'left 0.05s ease-out, top 0.05s ease-out, width 0.05s ease-out, height 0.05s ease-out',
          }}
          aria-hidden="true"
        />
      ))}
    </>
  );
}
