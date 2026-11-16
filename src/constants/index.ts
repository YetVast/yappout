// src/constants/index.ts
// YappOut application constants and Yet Vast Solutions canonical design tokens

import { HighlightMode } from '@/types';

/** Canonical YVS Brand Colors */
export const COLOR_YELLOW = '#FFFF11';
export const COLOR_INDIGO_VIOLET = '#4B0084';

/** YappOut Playback Buffer & Gestures */
export const YAPPOUT_SCROLL_MARGIN = 80; // px buffer zone for scroll controller
export const YAPPOUT_DOUBLE_TAP_DELAY = 300; // ms tolerance for double tap
export const YAPPOUT_TAP_SLOP = 20; // px movement tolerance for double tap

/** YappOut Speech Playback Speeds */
export const SPEED_CYCLE = [1, 1.5, 2, 0.5, 0.75] as const;
export const SPEED_LABELS = ['1×', '1.5×', '2×', '0.5×', '0.75×'] as const;
export const DEFAULT_SPEED_IDX = 0; // index 0 = 1x

export type SpeedValue = (typeof SPEED_CYCLE)[number];

/** Reading Highlight Modes in exact cycle order */
export const HIGHLIGHT_MODES: readonly HighlightMode[] = [
  'box',
  'underline',
  'background',
  'bold',
] as const;

export const DEFAULT_HIGHLIGHT_MODE: HighlightMode = 'box';

export const HIGHLIGHT_MODE_LABELS: Record<HighlightMode, string> = {
  box: 'Box highlight',
  underline: 'Underline',
  background: 'Background',
  bold: 'Bold',
};

export const HIGHLIGHT_MODE_DESCRIPTIONS: Record<HighlightMode, string> = {
  box: 'Box highlight around active sentence',
  underline: 'Underline beneath active sentence',
  background: 'Background color across active sentence',
  bold: 'Bold typography for active sentence',
};

/**
 * Returns the next highlight mode cycling in the required order:
 * Box highlight -> Underline -> Background -> Bold -> Box highlight
 */
export function getNextHighlightMode(current: HighlightMode): HighlightMode {
  const currentIndex = HIGHLIGHT_MODES.indexOf(current);
  if (currentIndex === -1) return HIGHLIGHT_MODES[0];
  const nextIndex = (currentIndex + 1) % HIGHLIGHT_MODES.length;
  return HIGHLIGHT_MODES[nextIndex];
}
