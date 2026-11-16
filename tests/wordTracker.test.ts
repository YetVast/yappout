import { describe, it, expect, beforeEach } from 'vitest';
import {
  buildSegmentDOMMap,
  findSegmentIndexFromCaretRange,
  buildWordDOMMap,
  findWordIndexFromCaretRange,
} from '@/core/wordTracker';
import { SegmentToken, WordToken } from '@/types';

describe('DOM TreeWalker Range Mapping & Caret Seeking', () => {
  let titleEl: HTMLElement;
  let bodyEl: HTMLElement;

  beforeEach(() => {
    document.body.innerHTML = '';
    titleEl = document.createElement('h1');
    titleEl.textContent = 'Speech Architecture';

    bodyEl = document.createElement('div');
    bodyEl.innerHTML = `
      <p>YappOut uses non-mutating highlighting overlays.</p>
      <p>It traverses the DOM text nodes using standard TreeWalker APIs.</p>
      <p>Double-clicking any sentence seeks directly to that position.</p>
    `;

    document.body.appendChild(titleEl);
    document.body.appendChild(bodyEl);
  });

  it('maps segment ranges accurately across multiple paragraphs without mutating DOM innerHTML', () => {
    const originalBodyHTML = bodyEl.innerHTML;

    const segments: SegmentToken[] = [
      { index: 0, text: 'Speech Architecture', section: 'title' },
      { index: 1, text: 'YappOut uses non-mutating highlighting overlays.', section: 'body' },
      { index: 2, text: 'It traverses the DOM text nodes using standard TreeWalker APIs.', section: 'body' },
      { index: 3, text: 'Double-clicking any sentence seeks directly to that position.', section: 'body' },
    ];

    const map = buildSegmentDOMMap(titleEl, bodyEl, segments);

    expect(map.length).toBe(4);
    expect(map[0].segmentIndex).toBe(0);
    expect(map[0].range.toString()).toBe('Speech Architecture');
    expect(map[1].segmentIndex).toBe(1);
    expect(map[1].range.toString()).toBe('YappOut uses non-mutating highlighting overlays.');
    expect(map[2].segmentIndex).toBe(2);
    expect(map[3].segmentIndex).toBe(3);

    // CRITICAL INVARIANT: Never mutate innerHTML or inject spans
    expect(bodyEl.innerHTML).toBe(originalBodyHTML);
    expect(bodyEl.querySelectorAll('mark, span').length).toBe(0);
  });

  it('resolves caret range to the correct segment index for seeking', () => {
    const segments: SegmentToken[] = [
      { index: 0, text: 'Speech Architecture', section: 'title' },
      { index: 1, text: 'YappOut uses non-mutating highlighting overlays.', section: 'body' },
      { index: 2, text: 'It traverses the DOM text nodes using standard TreeWalker APIs.', section: 'body' },
    ];

    const map = buildSegmentDOMMap(titleEl, bodyEl, segments);

    // Target the second paragraph: "It traverses the DOM text nodes..."
    const secondP = bodyEl.querySelectorAll('p')[1];
    const textNode = secondP.firstChild as Text;

    // Simulate a caret placed at character offset 5 ("averse")
    const caretRange = document.createRange();
    caretRange.setStart(textNode, 5);
    caretRange.collapse(true);

    const foundSegmentIndex = findSegmentIndexFromCaretRange(caretRange, map);
    expect(foundSegmentIndex).toBe(2);
  });

  it('resolves caret range to word tokens for word tracking compatibility', () => {
    const words: WordToken[] = [
      { index: 0, text: 'Speech', section: 'title' },
      { index: 1, text: 'Architecture', section: 'title' },
      { index: 2, text: 'YappOut', section: 'body' },
      { index: 3, text: 'uses', section: 'body' },
    ];

    const map = buildWordDOMMap(titleEl, bodyEl, words);
    expect(map.length).toBe(4);

    const firstP = bodyEl.querySelector('p')!;
    const textNode = firstP.firstChild as Text;

    const caretRange = document.createRange();
    caretRange.setStart(textNode, 1);
    caretRange.collapse(true);

    const foundWordIndex = findWordIndexFromCaretRange(caretRange, map);
    expect(foundWordIndex).toBe(2); // 'YappOut'
  });
});
