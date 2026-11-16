// src/core/readingSequence.ts
// Builds the ordered segment and word token sequence from title + markdown content

import { stripMarkdown } from '../utils/markdownExtractor';
import { tokenizeText, segmentText } from '../utils/textNormalizer';
import { ReadingSequence } from '@/types';

export type { ReadingSequence };

/**
 * Builds a flat reading sequence combining title and body segments and tokens.
 * Title segments come first (section: 'title'), followed sequentially by body segments (section: 'body').
 */
export function buildReadingSequence(
  title: string,
  markdownContent: string,
): ReadingSequence {
  const trimmedTitle = title.trim();
  const bodyText = stripMarkdown(markdownContent);

  // Segment tokens for continuous playback
  const titleSegments = trimmedTitle.length > 0 ? segmentText(trimmedTitle, 'title', 0) : [];
  const bodySegments = segmentText(bodyText, 'body', titleSegments.length);

  // Word tokens for word tracking
  const titleTokens = trimmedTitle.length > 0 ? tokenizeText(trimmedTitle, 'title', 0) : [];
  const bodyTokens = tokenizeText(bodyText, 'body', titleTokens.length);

  return {
    segments: [...titleSegments, ...bodySegments],
    titleSegmentCount: titleSegments.length,
    words: [...titleTokens, ...bodyTokens],
    titleWordCount: titleTokens.length,
  };
}
