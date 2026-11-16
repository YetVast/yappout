// src/core/speedController.ts
// Speed cycle configuration and controller for YappOut

import {
  SPEED_CYCLE,
  SPEED_LABELS,
  DEFAULT_SPEED_IDX,
  SpeedValue,
} from '@/constants';

export { SPEED_CYCLE, SPEED_LABELS, DEFAULT_SPEED_IDX };
export type { SpeedValue };

/**
 * Returns the human-readable speed label for the given cycle index.
 */
export function getSpeedLabel(cycleIdx: number): string {
  return SPEED_LABELS[cycleIdx % SPEED_CYCLE.length];
}

/**
 * Returns the numeric speech playback rate for the given cycle index.
 */
export function getSpeed(cycleIdx: number): number {
  return SPEED_CYCLE[cycleIdx % SPEED_CYCLE.length];
}

/**
 * Calculates the next speed cycle index in the progression:
 * 1× -> 1.5× -> 2× -> 0.5× -> 0.75× -> 1×
 */
export function nextSpeedIdx(cycleIdx: number): number {
  return (cycleIdx + 1) % SPEED_CYCLE.length;
}
