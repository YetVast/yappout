// src/constants/index.ts
// YappOut application constants and Yet Vast Solutions canonical design tokens

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
