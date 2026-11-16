// src/core/scrollController.ts
// Automatically scrolls the active segment into view within the scroll container

import { YAPPOUT_SCROLL_MARGIN } from '@/constants';

/**
 * Scrolls the segment (identified by its Range) into view within the given scroll container.
 * Adds an 80px buffer margin so the segment is never flush against the top or bottom edge.
 */
export function scrollSegmentIntoView(
  segmentRange: Range,
  scrollContainer: HTMLElement,
): void {
  const segmentRect = segmentRange.getBoundingClientRect();
  const containerRect = scrollContainer.getBoundingClientRect();

  const segmentTop = segmentRect.top - containerRect.top + scrollContainer.scrollTop;
  const segmentBottom = segmentTop + segmentRect.height;

  const visTop = scrollContainer.scrollTop;
  const visBottom = visTop + scrollContainer.clientHeight;

  const margin = YAPPOUT_SCROLL_MARGIN; // px buffer zone

  if (segmentTop - margin < visTop) {
    // Need to scroll up to keep segment and top margin visible
    scrollContainer.scrollTo({
      top: Math.max(0, segmentTop - margin),
      behavior: 'smooth',
    });
  } else if (segmentBottom + margin > visBottom) {
    // Need to scroll down to keep segment and bottom margin visible
    scrollContainer.scrollTo({
      top: segmentBottom + margin - scrollContainer.clientHeight,
      behavior: 'smooth',
    });
  }
}

export const scrollWordIntoView = scrollSegmentIntoView;
