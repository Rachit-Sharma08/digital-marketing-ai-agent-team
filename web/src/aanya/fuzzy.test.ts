import { describe, expect, it } from 'vitest';
import { fuzzyScore, normalize } from './fuzzy';

describe('normalize', () => {
  it('lower-cases and strips accents', () => {
    expect(normalize('José Ñúñez')).toBe('jose nunez');
  });
});

describe('fuzzyScore', () => {
  it('returns null when the letters are not all there, in order', () => {
    expect(fuzzyScore('xyz', 'Meera Kaur')).toBeNull();
    expect(fuzzyScore('thgiwd', 'Meera')).toBeNull();
  });

  it('matches an empty query with a neutral score', () => {
    expect(fuzzyScore('', 'Anything')).toBe(0);
  });

  it('ranks exact > prefix > word start > substring > scattered letters', () => {
    const exact = fuzzyScore('aanya', 'Aanya')!;
    const prefix = fuzzyScore('aanya', 'Aanya Sharma')!;
    const wordStart = fuzzyScore('sha', 'Aanya Sharma')!;
    const inside = fuzzyScore('arm', 'Aanya Sharma')!;
    const scattered = fuzzyScore('as', 'Aanya Sharma')!;
    expect(exact).toBeGreaterThan(prefix);
    expect(prefix).toBeGreaterThan(wordStart);
    expect(wordStart).toBeGreaterThan(inside);
    expect(inside).toBeGreaterThan(scattered);
    expect(scattered).toBeGreaterThan(0);
  });

  it('ignores case and accents', () => {
    expect(fuzzyScore('MEE', 'meera')).not.toBeNull();
    expect(fuzzyScore('jose', 'José')).not.toBeNull();
  });

  it('prefers initials at word starts over letters buried in a word', () => {
    expect(fuzzyScore('mk', 'Meera Kaur')!).toBeGreaterThan(fuzzyScore('mk', 'remarkable')!);
  });
});
