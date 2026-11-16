import { describe, it, expect, vi } from 'vitest';
import { scrollSegmentIntoView } from '@/core/scrollController';

describe('Auto-Scroll Controller', () => {
  it('scrolls down when segment is below viewport buffer', () => {
    const scrollContainer = document.createElement('div');
    scrollContainer.scrollTop = 0;
    Object.defineProperty(scrollContainer, 'clientHeight', { value: 500, configurable: true });

    // Mock getBoundingClientRect for container
    vi.spyOn(scrollContainer, 'getBoundingClientRect').mockReturnValue({
      top: 0,
      bottom: 500,
      left: 0,
      right: 400,
      width: 400,
      height: 500,
      x: 0,
      y: 0,
      toJSON: () => {},
    });

    const scrollToMock = vi.fn();
    scrollContainer.scrollTo = scrollToMock;

    // Mock segment range below viewport (e.g. top at 450, height 50 -> bottom at 500. 500 + 80 margin > 500)
    const mockRange = {
      getBoundingClientRect: () => ({
        top: 450,
        bottom: 500,
        height: 50,
        left: 0,
        right: 200,
        width: 200,
        x: 0,
        y: 450,
        toJSON: () => {},
      }),
    } as unknown as Range;

    scrollSegmentIntoView(mockRange, scrollContainer);

    expect(scrollToMock).toHaveBeenCalledTimes(1);
    expect(scrollToMock).toHaveBeenCalledWith({
      top: 500 + 80 - 500, // 80px scroll
      behavior: 'smooth',
    });
  });

  it('scrolls up when segment is above viewport buffer', () => {
    const scrollContainer = document.createElement('div');
    scrollContainer.scrollTop = 300;
    Object.defineProperty(scrollContainer, 'clientHeight', { value: 500, configurable: true });

    vi.spyOn(scrollContainer, 'getBoundingClientRect').mockReturnValue({
      top: 0,
      bottom: 500,
      left: 0,
      right: 400,
      width: 400,
      height: 500,
      x: 0,
      y: 0,
      toJSON: () => {},
    });

    const scrollToMock = vi.fn();
    scrollContainer.scrollTo = scrollToMock;

    // Segment top is at relative 20px, so absolute segmentTop = 20 - 0 + 300 = 320.
    // visTop is 300. segmentTop - 80 = 240 < 300! Needs scroll up.
    const mockRange = {
      getBoundingClientRect: () => ({
        top: 20,
        bottom: 40,
        height: 20,
        left: 0,
        right: 200,
        width: 200,
        x: 0,
        y: 20,
        toJSON: () => {},
      }),
    } as unknown as Range;

    scrollSegmentIntoView(mockRange, scrollContainer);

    expect(scrollToMock).toHaveBeenCalledTimes(1);
    expect(scrollToMock).toHaveBeenCalledWith({
      top: 320 - 80, // 240px
      behavior: 'smooth',
    });
  });
});
