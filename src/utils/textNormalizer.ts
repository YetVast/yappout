// src/utils/textNormalizer.ts
// Tokenizes text for YappOut reading sequence, segment tracking, and word tracking

import { WordToken, SegmentToken } from '@/types';
import { stripMarkdown } from './markdownExtractor';

// Re-export stripMarkdown to eliminate duplicate logic
export { stripMarkdown };

// Sentence and clause-ending delimiters
const DELIMITERS = new Set([
  '.', '?', '!', ',', ':', ';',
  '…', '—', '–',
  '。', '，', '、', '！', '？', '：', '；',
]);

// Trailing punctuation / quote marks that stay attached to the preceding segment
const CLOSING_MARKS = new Set([
  '"', "'", '”', '’', '»', ')', ']', '}', '›',
]);

const ABBREVIATIONS = ['mr', 'mrs', 'ms', 'dr', 'prof', 'sr', 'jr', 'vs', 'etc', 'dept', 'est', 'approx', 'st'];

/**
 * Checks whether a dot character at dotIdx is part of a common English abbreviation.
 */
function isAbbreviation(text: string, dotIdx: number): boolean {
  let wStart = dotIdx - 1;
  while (wStart >= 0 && /[a-zA-Z]/.test(text[wStart])) {
    wStart--;
  }
  const word = text.slice(wStart + 1, dotIdx).toLowerCase();
  if (ABBREVIATIONS.includes(word)) return true;

  // Handle e.g. and i.e.
  if (word === 'g' && dotIdx >= 3 && text.slice(dotIdx - 3, dotIdx).toLowerCase() === 'e.g') return true;
  if (word === 'e' && dotIdx >= 3 && text.slice(dotIdx - 3, dotIdx).toLowerCase() === 'i.e') return true;
  if (word === 'e' && dotIdx + 2 < text.length && text.slice(dotIdx, dotIdx + 3).toLowerCase() === '.g.') return true;
  if (word === 'i' && dotIdx + 2 < text.length && text.slice(dotIdx, dotIdx + 3).toLowerCase() === '.e.') return true;

  return false;
}

/**
 * Normalizes and cleans whitespace while preserving contractions and punctuation.
 */
export function normalizeWhitespace(text: string): string {
  return text.trim().replace(/\s+/g, ' ');
}

/**
 * Tokenizes plain text into sequential WordTokens.
 * Splits on whitespace, keeping punctuation and apostrophes attached to words.
 */
export function tokenizeText(
  text: string,
  section: 'title' | 'body',
  startIndex: number,
): WordToken[] {
  const tokens: WordToken[] = [];
  const parts = text.split(/\s+/);
  let idx = startIndex;
  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed.length === 0) continue;
    tokens.push({ index: idx++, text: trimmed, section });
  }
  return tokens;
}

/**
 * Splits continuous text into SegmentTokens based on sentence/clause delimiters:
 * . , ? ! : ; line breaks, paragraph breaks, and other equivalent sentence boundaries.
 * Preserves punctuation attached to the segment.
 */
export function segmentText(
  text: string,
  section: 'title' | 'body',
  startIndex: number,
): SegmentToken[] {
  const segments: SegmentToken[] = [];
  if (!text) return segments;

  let i = 0;
  const n = text.length;
  let currentStart = -1;
  let currIdx = startIndex;

  while (i < n) {
    if (currentStart === -1) {
      if (/\s/.test(text[i])) {
        i++;
        continue;
      }
      currentStart = i;
    }

    const ch = text[i];

    // Line break boundary
    if (ch === '\r' || ch === '\n') {
      const segText = text.slice(currentStart, i).trim();
      if (segText.length > 0) {
        segments.push({ index: currIdx++, text: segText, section });
      }
      currentStart = -1;
      i++;
      continue;
    }

    // Punctuation delimiter boundary
    if (DELIMITERS.has(ch)) {
      // Decimal point, thousand separator, or time between digits (e.g. 3.14, 10,000, 10:30)
      if (
        (ch === '.' || ch === ',' || ch === ':') &&
        i > 0 &&
        i + 1 < n &&
        /\d/.test(text[i - 1]) &&
        /\d/.test(text[i + 1])
      ) {
        i++;
        continue;
      }

      // Abbreviation full stop (e.g. Dr., Mr., e.g., etc.)
      if (ch === '.' && isAbbreviation(text, i)) {
        i++;
        continue;
      }

      // Consume the delimiter
      i++;
      // Consume any consecutive delimiters or trailing closing quotes/brackets
      while (i < n && (DELIMITERS.has(text[i]) || CLOSING_MARKS.has(text[i]))) {
        i++;
      }

      const segText = text.slice(currentStart, i).trim();
      if (segText.length > 0) {
        segments.push({ index: currIdx++, text: segText, section });
      }
      currentStart = -1;
      continue;
    }

    i++;
  }

  // Handle trailing text not followed by a delimiter
  if (currentStart !== -1) {
    const segText = text.slice(currentStart, n).trim();
    if (segText.length > 0) {
      segments.push({ index: currIdx++, text: segText, section });
    }
  }

  return segments;
}
