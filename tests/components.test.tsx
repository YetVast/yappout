import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { YappOutButton } from '@/components/player/YappOutButton';
import { PlayerControls } from '@/components/player/PlayerControls';

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

  it('disables both YappOut and Speed buttons in PlayerControls when hasContent is false', () => {
    act(() => {
      root.render(
        <PlayerControls
          playbackState="idle"
          currentSegmentIndex={0}
          totalSegments={0}
          speedLabel="1×"
          hasContent={false}
          onPlay={vi.fn()}
          onStop={vi.fn()}
          onCycleSpeed={vi.fn()}
        />
      );
    });

    const buttons = container.querySelectorAll('button');
    expect(buttons.length).toBe(2);
    expect(buttons[0].disabled).toBe(true); // YappOut button
    expect(buttons[1].disabled).toBe(true); // Speed button
  });
});
