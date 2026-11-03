import { describe, expect, it } from 'vitest';
import { delightMode, tobyFromUrl } from './mode';

const base = { tobyPref: false, search: '', chime: false, reduceMotion: false };

describe('delightMode', () => {
  it('defaults: jokes, ambient life and easter eggs on; sounds off; motion on', () => {
    expect(delightMode(base)).toEqual({ sarah: false, jokes: true, ambient: true, eggs: true, sounds: false, motion: true, trips: true });
  });

  it('Sarah mode (the switch or ?sarah=1) turns off every joke, ambient life, sound and easter egg', () => {
    const off = { sarah: true, jokes: false, ambient: false, eggs: false, sounds: false, motion: true, trips: false };
    expect(delightMode({ ...base, tobyPref: true, chime: true })).toEqual(off);
    expect(delightMode({ ...base, search: '?demo=1&sarah=1', chime: true })).toEqual(off);
  });

  it('sounds only when the chime setting is on', () => {
    expect(delightMode({ ...base, chime: true }).sounds).toBe(true);
  });

  it('reduced motion keeps the jokes still: no motion and no trips to the kitchen', () => {
    expect(delightMode({ ...base, reduceMotion: true })).toMatchObject({ jokes: true, ambient: true, motion: false, trips: false });
  });
});

describe('tobyFromUrl', () => {
  it('reads ?sarah=1 (or true / on) and nothing else', () => {
    expect(tobyFromUrl('?sarah=1')).toBe(true);
    expect(tobyFromUrl('?x=2&sarah=true')).toBe(true);
    expect(tobyFromUrl('?sarah=on')).toBe(true);
    expect(tobyFromUrl('?sarah=0')).toBe(false);
    expect(tobyFromUrl('?tobias=1')).toBe(false);
    expect(tobyFromUrl('')).toBe(false);
  });
});
