import { describe, expect, it } from 'vitest';
import { DEMO_SNAPSHOT } from '@shared/fixtures/demo-snapshot';
import { titleOf } from './titles';
import { INITIAL_WINDOWS, openWindow, windowId } from './windowState';

describe('the Highlights and Naina\'s corner windows', () => {
  it('there is one of each', () => {
    expect(windowId({ kind: 'highlights' })).toBe('highlights');
    expect(windowId({ kind: 'naina' })).toBe('naina');
    expect(openWindow(openWindow(INITIAL_WINDOWS, { kind: 'naina' }), { kind: 'naina' }).windows).toHaveLength(1);
  });

  it('are titled with the joke, or plainly in Sarah mode', () => {
    const highlights = openWindow(INITIAL_WINDOWS, { kind: 'highlights' }).windows[0]!;
    const naina = openWindow(INITIAL_WINDOWS, { kind: 'naina' }).windows[0]!;
    expect(titleOf(highlights, DEMO_SNAPSHOT)).toBe('The Highlights');
    expect(titleOf(highlights, DEMO_SNAPSHOT, true)).toBe('Weekly review');
    expect(titleOf(naina, DEMO_SNAPSHOT)).toBe('Naina’s corner');
    expect(titleOf(naina, DEMO_SNAPSHOT, true)).toBe('Unattributed activity');
  });
});
