import { describe, it, expect } from 'vitest';
import { stripMarkdown, extractMarkdownParagraphs } from '@/utils/markdownExtractor';
import { segmentText } from '@/utils/textNormalizer';
import { buildReadingSequence } from '@/core/readingSequence';

describe('Reading Sequence & Text Normalization', () => {
  it('strips markdown syntax while preserving readable words and punctuation', () => {
    const md = `# Main Title
This is **bold text** and *italic text* with a [link](https://example.com) and \`inline code\`.
> A wise quote
\`\`\`ts
const x = 42;
\`\`\`
- Item 1
- Item 2
`;
    const stripped = stripMarkdown(md);
    expect(stripped).not.toContain('#');
    expect(stripped).not.toContain('**');
    expect(stripped).not.toContain('```');
    expect(stripped).not.toContain('`');
    expect(stripped).not.toContain('>');
    expect(stripped).toContain('Main Title');
    expect(stripped).toContain('bold text');
    expect(stripped).toContain('italic text');
    expect(stripped).toContain('link');
    expect(stripped).toContain('A wise quote');
  });

  it('extracts paragraphs from markdown content', () => {
    const md = `Paragraph 1 line a.
Paragraph 1 line b.

Paragraph 2 is here.

Paragraph 3 is final.`;
    const paragraphs = extractMarkdownParagraphs(md);
    expect(paragraphs.length).toBe(3);
    expect(paragraphs[0]).toContain('Paragraph 1');
    expect(paragraphs[1]).toBe('Paragraph 2 is here.');
    expect(paragraphs[2]).toBe('Paragraph 3 is final.');
  });

  it('segments text on sentence and clause punctuation while preserving order', () => {
    const text = 'Hello world. How are you today? I am fine, thank you! Here is more: item one; item two.';
    const segments = segmentText(text, 'body', 0);

    expect(segments.length).toBe(7);
    expect(segments[0].text).toBe('Hello world.');
    expect(segments[1].text).toBe('How are you today?');
    expect(segments[2].text).toBe('I am fine,');
    expect(segments[3].text).toBe('thank you!');
    expect(segments[4].text).toBe('Here is more:');
    expect(segments[5].text).toBe('item one;');
    expect(segments[6].text).toBe('item two.');
  });

  it('preserves decimals, time formats, and thousands separators without splitting', () => {
    const text = 'Pi is approximately 3.14. The price is $10,000 and the meeting is at 10:30 today.';
    const segments = segmentText(text, 'body', 0);

    expect(segments.length).toBe(2);
    expect(segments[0].text).toBe('Pi is approximately 3.14.');
    expect(segments[1].text).toBe('The price is $10,000 and the meeting is at 10:30 today.');
  });

  it('preserves English abbreviations without premature sentence termination', () => {
    const text = 'Dr. Watson met Mr. Holmes at 221B Baker St. for an interview, e.g., to discuss cases, etc.';
    const segments = segmentText(text, 'body', 0);

    expect(segments.length).toBe(4);
    expect(segments[0].text).toBe('Dr. Watson met Mr. Holmes at 221B Baker St. for an interview,');
    expect(segments[1].text).toBe('e.g.,');
    expect(segments[2].text).toBe('to discuss cases,');
    expect(segments[3].text).toBe('etc.');
  });

  it('builds reading sequence reading Title first, followed by Body segments', () => {
    const title = 'Document Header';
    const body = 'First sentence of body. Second sentence of body.';
    const sequence = buildReadingSequence(title, body);

    expect(sequence.titleSegmentCount).toBe(1);
    expect(sequence.segments[0].text).toBe('Document Header');
    expect(sequence.segments[0].section).toBe('title');
    expect(sequence.segments[0].index).toBe(0);

    expect(sequence.segments[1].text).toBe('First sentence of body.');
    expect(sequence.segments[1].section).toBe('body');
    expect(sequence.segments[1].index).toBe(1);

    expect(sequence.segments[2].text).toBe('Second sentence of body.');
    expect(sequence.segments[2].section).toBe('body');
    expect(sequence.segments[2].index).toBe(2);
  });

  it('handles large documents sequentially without arbitrary application caps', () => {
    const paragraphCount = 500;
    const paragraphs = Array.from({ length: paragraphCount }, (_, i) => `Sentence number ${i + 1} is being read.`);
    const largeBody = paragraphs.join('\n\n');

    const sequence = buildReadingSequence('Large Document Test', largeBody);
    expect(sequence.segments.length).toBe(paragraphCount + 1);
    expect(sequence.segments[0].section).toBe('title');
    expect(sequence.segments[paragraphCount].index).toBe(paragraphCount);
  });
});
