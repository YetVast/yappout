import { describe, it, expect } from 'vitest';
import {
  SPEED_CYCLE,
  SPEED_LABELS,
  DEFAULT_SPEED_IDX,
  getSpeed,
  getSpeedLabel,
  nextSpeedIdx,
} from '@/core/speedController';

describe('Speed Controller', () => {
  it('defines the required speed cycle and labels', () => {
    expect(SPEED_CYCLE).toEqual([1, 1.5, 2, 0.5, 0.75]);
    expect(SPEED_LABELS).toEqual(['1×', '1.5×', '2×', '0.5×', '0.75×']);
    expect(DEFAULT_SPEED_IDX).toBe(0);
  });

  it('cycles through speeds in the exact specified order: 1× → 1.5× → 2× → 0.5× → 0.75× → 1×', () => {
    let idx = 0;
    expect(getSpeed(idx)).toBe(1);
    expect(getSpeedLabel(idx)).toBe('1×');

    idx = nextSpeedIdx(idx);
    expect(getSpeed(idx)).toBe(1.5);
    expect(getSpeedLabel(idx)).toBe('1.5×');

    idx = nextSpeedIdx(idx);
    expect(getSpeed(idx)).toBe(2);
    expect(getSpeedLabel(idx)).toBe('2×');

    idx = nextSpeedIdx(idx);
    expect(getSpeed(idx)).toBe(0.5);
    expect(getSpeedLabel(idx)).toBe('0.5×');

    idx = nextSpeedIdx(idx);
    expect(getSpeed(idx)).toBe(0.75);
    expect(getSpeedLabel(idx)).toBe('0.75×');

    idx = nextSpeedIdx(idx);
    expect(getSpeed(idx)).toBe(1);
    expect(getSpeedLabel(idx)).toBe('1×');
  });
});
