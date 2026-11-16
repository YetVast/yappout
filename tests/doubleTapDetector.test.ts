import { describe, it, expect, vi, beforeEach } from 'vitest';
import { attachDoubleTapHandler } from '@/utils/doubleTapDetector';

describe('Double-Tap and Double-Click Gesture Detector', () => {
  let element: HTMLDivElement;

  beforeEach(() => {
    element = document.createElement('div');
    document.body.appendChild(element);
  });

  it('triggers onDoubleTap callback on mouse dblclick event', () => {
    const callback = vi.fn();
    const cleanup = attachDoubleTapHandler(element, callback);

    const dblclickEvent = new MouseEvent('dblclick', {
      clientX: 150,
      clientY: 250,
      bubbles: true,
    });
    element.dispatchEvent(dblclickEvent);

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith(150, 250);

    cleanup();
  });

  it('triggers onDoubleTap on touchscreen double-tap within 300ms and 20px slop', () => {
    const callback = vi.fn();
    const cleanup = attachDoubleTapHandler(element, callback);

    const createTouchEvent = (type: string, x: number, y: number) => {
      const touch = {
        clientX: x,
        clientY: y,
        target: element,
      } as unknown as Touch;
      return new TouchEvent(type, {
        changedTouches: [touch],
        bubbles: true,
        cancelable: true,
      });
    };

    // First tap at (100, 100)
    element.dispatchEvent(createTouchEvent('touchend', 100, 100));
    expect(callback).not.toHaveBeenCalled();

    // Second tap at (105, 105) (within 20px slop) immediately after
    element.dispatchEvent(createTouchEvent('touchend', 105, 105));
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith(105, 105);

    cleanup();
  });

  it('does NOT trigger onDoubleTap if touch movement exceeds 20px slop', () => {
    const callback = vi.fn();
    const cleanup = attachDoubleTapHandler(element, callback);

    const createTouchEvent = (type: string, x: number, y: number) => {
      const touch = {
        clientX: x,
        clientY: y,
        target: element,
      } as unknown as Touch;
      return new TouchEvent(type, {
        changedTouches: [touch],
        bubbles: true,
      });
    };

    // First tap at (100, 100)
    element.dispatchEvent(createTouchEvent('touchend', 100, 100));

    // Second tap far away at (200, 200) (100px difference)
    element.dispatchEvent(createTouchEvent('touchend', 200, 200));

    expect(callback).not.toHaveBeenCalled();
    cleanup();
  });
});
