import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { YappOutButton } from '@/components/player/YappOutButton';
import { PlayerControls } from '@/components/player/PlayerControls';
import { HighlightModeSelector } from '@/components/player/HighlightModeSelector';
import { Header } from '@/components/layout/Header';
import { ContentEditor } from '@/components/input/ContentEditor';
import { ReadingCanvas } from '@/components/reader/ReadingCanvas';
import { YappoutHighlight } from '@/components/reader/YappoutHighlight';
import { HIGHLIGHT_MODES, getNextHighlightMode } from '@/constants';
import { HighlightMode } from '@/types';
import fs from 'node:fs';
import path from 'node:path';

// @ts-expect-error React act environment flag
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('Player UI Components', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it('disables YappOutButton when disabled prop is true (empty input state)', () => {
    const onPlay = vi.fn();
    const onStop = vi.fn();

    act(() => {
      root.render(
        <YappOutButton
          playbackState="idle"
          disabled={true}
          onPlay={onPlay}
          onStop={onStop}
        />
      );
    });

    const button = container.querySelector('button') as HTMLButtonElement;
    expect(button).not.toBeNull();
    expect(button.disabled).toBe(true);

    act(() => {
      button.click();
    });
    expect(onPlay).not.toHaveBeenCalled();
    expect(onStop).not.toHaveBeenCalled();
  });

  it('enables YappOutButton and calls onPlay when valid content is present', () => {
    const onPlay = vi.fn();
    const onStop = vi.fn();

    act(() => {
      root.render(
        <YappOutButton
          playbackState="idle"
          disabled={false}
          onPlay={onPlay}
          onStop={onStop}
        />
      );
    });

    const button = container.querySelector('button') as HTMLButtonElement;
    expect(button.disabled).toBe(false);
    expect(button.textContent).toContain('YappOut');

    act(() => {
      button.click();
    });
    expect(onPlay).toHaveBeenCalledTimes(1);
    expect(onStop).not.toHaveBeenCalled();
  });

  it('renders Stop state when playbackState is playing and triggers onStop when clicked', () => {
    const onPlay = vi.fn();
    const onStop = vi.fn();

    act(() => {
      root.render(
        <YappOutButton
          playbackState="playing"
          disabled={false}
          onPlay={onPlay}
          onStop={onStop}
        />
      );
    });

    const button = container.querySelector('button') as HTMLButtonElement;
    expect(button.textContent).toContain('Stop');

    act(() => {
      button.click();
    });
    expect(onStop).toHaveBeenCalledTimes(1);
    expect(onPlay).not.toHaveBeenCalled();
  });

  it('disables Highlight Mode, Speed, and YappOut buttons in PlayerControls when hasContent is false', () => {
    act(() => {
      root.render(
        <PlayerControls
          playbackState="idle"
          currentSegmentIndex={0}
          totalSegments={0}
          speedLabel="1×"
          highlightMode="box"
          wordCount={0}
          readingTime="0 min"
          hasContent={false}
          onPlay={vi.fn()}
          onStop={vi.fn()}
          onCycleSpeed={vi.fn()}
          onCycleHighlightMode={vi.fn()}
        />
      );
    });

    const buttons = container.querySelectorAll('button');
    expect(buttons.length).toBe(3);
    expect(buttons[0].disabled).toBe(true); // Highlight Mode button
    expect(buttons[1].disabled).toBe(true); // Speed button
    expect(buttons[2].disabled).toBe(true); // YappOut button
  });

  it('enables all three PlayerControls buttons when hasContent is true and displays stats', () => {
    act(() => {
      root.render(
        <PlayerControls
          playbackState="idle"
          currentSegmentIndex={0}
          totalSegments={5}
          speedLabel="1×"
          highlightMode="box"
          wordCount={120}
          readingTime="1 min"
          hasContent={true}
          onPlay={vi.fn()}
          onStop={vi.fn()}
          onCycleSpeed={vi.fn()}
          onCycleHighlightMode={vi.fn()}
        />
      );
    });

    const buttons = container.querySelectorAll('button');
    expect(buttons.length).toBe(3);
    expect(buttons[0].disabled).toBe(false); // Highlight Mode button
    expect(buttons[1].disabled).toBe(false); // Speed button
    expect(buttons[2].disabled).toBe(false); // YappOut button
    expect(container.textContent).toContain('5 segments');
    expect(container.textContent).toContain('120 words');
    expect(container.textContent).toContain('1 min');
    expect(container.textContent).toContain('Double-click or double-tap any sentence to seek');
  });

  it('cycles highlight modes in exact order: box -> underline -> background -> bold -> box', () => {
    const sequence: HighlightMode[] = [];
    let current: HighlightMode = 'box';
    for (let i = 0; i < HIGHLIGHT_MODES.length; i++) {
      sequence.push(current);
      current = getNextHighlightMode(current);
    }
    sequence.push(current);

    expect(sequence).toEqual(['box', 'underline', 'background', 'bold', 'box']);
  });

  it('renders HighlightModeSelector and calls onCycle when clicked', () => {
    const onCycle = vi.fn();
    act(() => {
      root.render(
        <HighlightModeSelector
          mode="underline"
          onCycle={onCycle}
          disabled={false}
        />
      );
    });

    const button = container.querySelector('button') as HTMLButtonElement;
    expect(button.getAttribute('title')).toContain('Underline');
    expect(button.getAttribute('aria-label')).toContain('Underline');

    act(() => {
      button.click();
    });
    expect(onCycle).toHaveBeenCalledTimes(1);
  });

  it('renders Header with v0 button and without subtitle, triggering onLoadSample on click', () => {
    const onLoadSample = vi.fn();
    act(() => {
      root.render(<Header onLoadSample={onLoadSample} />);
    });

    expect(container.textContent).toContain('YappOut');
    expect(container.textContent).toContain('v0');
    // Ensure subtitle is completely removed
    expect(container.textContent).not.toContain('Audio-first Synchronized Reader');

    const v0Button = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'v0'
    );
    expect(v0Button).not.toBeNull();

    act(() => {
      v0Button?.click();
    });
    expect(onLoadSample).toHaveBeenCalledTimes(1);
  });

  it('collapses ContentEditor when isMinimized is true, keeping title input visible', () => {
    const onToggleMinimize = vi.fn();
    act(() => {
      root.render(
        <ContentEditor
          title="Sample Title"
          content="Sample Content text here"
          isMinimized={true}
          onTitleChange={vi.fn()}
          onContentChange={vi.fn()}
          onToggleMinimize={onToggleMinimize}
          onClear={vi.fn()}
          onLoadSample={vi.fn()}
        />
      );
    });

    // Title input is visible
    const input = container.querySelector('input') as HTMLInputElement;
    expect(input).not.toBeNull();
    expect(input.value).toBe('Sample Title');

    // Textarea is hidden/not rendered when minimized
    const textarea = container.querySelector('textarea');
    expect(textarea).toBeNull();

    // Expand control is rendered
    const toggleBtn = container.querySelector('button[aria-label="Expand editor"]') as HTMLButtonElement;
    expect(toggleBtn).not.toBeNull();

    // Clear button is hidden when minimized
    const clearBtn = container.querySelector('button[aria-label="Clear all content"]');
    expect(clearBtn).toBeNull();

    act(() => {
      toggleBtn.click();
    });
    expect(onToggleMinimize).toHaveBeenCalledTimes(1);
  });

  it('shows full ContentEditor with Clear and collapse controls in order when expanded with content', () => {
    const onToggleMinimize = vi.fn();
    const onClear = vi.fn();
    act(() => {
      root.render(
        <ContentEditor
          title="Sample Title"
          content="Sample Content text here"
          isMinimized={false}
          onTitleChange={vi.fn()}
          onContentChange={vi.fn()}
          onToggleMinimize={onToggleMinimize}
          onClear={onClear}
          onLoadSample={vi.fn()}
        />
      );
    });

    // Textarea is visible
    const textarea = container.querySelector('textarea');
    expect(textarea).not.toBeNull();

    // Clear button is rendered on the title row immediately before Minimize
    const clearBtn = container.querySelector('button[aria-label="Clear all content"]') as HTMLButtonElement;
    expect(clearBtn).not.toBeNull();
    expect(clearBtn.textContent).toContain('Clear');

    // Minimize control is rendered
    const toggleBtn = container.querySelector('button[aria-label="Minimize editor"]') as HTMLButtonElement;
    expect(toggleBtn).not.toBeNull();

    // Verify ordering: Clear appears before Minimize
    const actionButtons = Array.from(container.querySelectorAll('button'));
    const clearIdx = actionButtons.indexOf(clearBtn);
    const toggleIdx = actionButtons.indexOf(toggleBtn);
    expect(clearIdx).toBeGreaterThanOrEqual(0);
    expect(toggleIdx).toBe(clearIdx + 1);

    act(() => {
      clearBtn.click();
    });
    expect(onClear).toHaveBeenCalledTimes(1);

    act(() => {
      toggleBtn.click();
    });
    expect(onToggleMinimize).toHaveBeenCalledTimes(1);
  });

  it('shows Load Sample action on the title row when expanded and content is empty', () => {
    const onLoadSample = vi.fn();
    act(() => {
      root.render(
        <ContentEditor
          title=""
          content=""
          isMinimized={false}
          onTitleChange={vi.fn()}
          onContentChange={vi.fn()}
          onToggleMinimize={vi.fn()}
          onClear={vi.fn()}
          onLoadSample={onLoadSample}
        />
      );
    });

    const sampleBtn = container.querySelector('button[aria-label="Load sample content"]') as HTMLButtonElement;
    expect(sampleBtn).not.toBeNull();
    expect(sampleBtn.textContent).toContain('Load Sample');

    act(() => {
      sampleBtn.click();
    });
    expect(onLoadSample).toHaveBeenCalledTimes(1);
  });

  it('renders YappoutHighlight with appropriate styles for each highlight mode', () => {
    const scrollContainer = document.createElement('div');
    document.body.appendChild(scrollContainer);
    const scrollRef = { current: scrollContainer };

    // Create a mock range with getClientRects
    const mockRange = {
      getClientRects: () => [
        { left: 10, top: 20, width: 100, height: 25 },
      ],
      getBoundingClientRect: () => ({ left: 10, top: 20, width: 100, height: 25 }),
    } as unknown as Range;

    // Mode 1: Box
    act(() => {
      root.render(
        <YappoutHighlight
          activeRange={mockRange}
          scrollContainerRef={scrollRef}
          highlightMode="box"
        />
      );
    });
    let overlays = container.querySelectorAll('div');
    expect(overlays.length).toBe(1);
    expect(overlays[0].style.outline).toContain('solid');

    // Mode 2: Underline
    act(() => {
      root.render(
        <YappoutHighlight
          activeRange={mockRange}
          scrollContainerRef={scrollRef}
          highlightMode="underline"
        />
      );
    });
    overlays = container.querySelectorAll('div');
    expect(overlays.length).toBe(1);
    expect(overlays[0].style.borderBottom).toContain('solid');

    // Mode 3: Background
    act(() => {
      root.render(
        <YappoutHighlight
          activeRange={mockRange}
          scrollContainerRef={scrollRef}
          highlightMode="background"
        />
      );
    });
    overlays = container.querySelectorAll('div');
    expect(overlays.length).toBe(1);
    expect(overlays[0].style.background).toContain('var(--highlight-bg');

    // Mode 4: Bold
    act(() => {
      root.render(
        <YappoutHighlight
          activeRange={mockRange}
          scrollContainerRef={scrollRef}
          highlightMode="bold"
        />
      );
    });
    overlays = container.querySelectorAll('div');
    expect(overlays.length).toBe(1);
    expect(overlays[0].style.background).toBe('transparent');

    scrollContainer.remove();
  });

  it('renders ReadingCanvas without visible Reading Canvas header label', () => {
    const titleRef = { current: null };
    const bodyRef = { current: null };
    const scrollContainerRef = { current: null };

    act(() => {
      root.render(
        <ReadingCanvas
          title="Test Title"
          content="Test content paragraph."
          titleRef={titleRef}
          bodyRef={bodyRef}
          scrollContainerRef={scrollContainerRef}
          activeRange={null}
        />
      );
    });

    expect(container.textContent).toContain('Test Title');
    expect(container.textContent).toContain('Test content paragraph.');
    expect(container.textContent).not.toContain('Reading Canvas');
  });

  it('validates public/yappout-info.json schema and required fields', () => {
    const filePath = path.join(process.cwd(), 'public', 'yappout-info.json');
    expect(fs.existsSync(filePath)).toBe(true);

    const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    expect(content.productName).toBe('YappOut');
    expect(content.version).toBe('V0');
    expect(content.shortDescription).toBeDefined();
    expect(content.productPurpose).toBeDefined();
    expect(Array.isArray(content.featureList)).toBe(true);
    expect(Array.isArray(content.currentCapabilities)).toBe(true);
    expect(content.technicalApproach).toBeDefined();
    expect(Array.isArray(content.currentLimitations)).toBe(true);
    expect(content.sampleTitle).toBeDefined();
    expect(content.sampleTitle.length).toBeGreaterThan(0);
    expect(content.sampleBody).toBeDefined();
    expect(content.sampleBody.length).toBeGreaterThan(0);
    expect(content.lastUpdated).toBe('2026-11-16');
  });
});
