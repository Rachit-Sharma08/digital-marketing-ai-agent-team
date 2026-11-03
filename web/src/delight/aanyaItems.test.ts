import { describe, expect, it } from 'vitest';
import { searchAanya } from '../aanya/search';
import { delightAanyaItems } from './aanyaItems';

describe('Ask Aanya: the Highlights and Naina\'s corner', () => {
  it('finds the ceremony and Naina\'s corner by their names and what they do', () => {
    const items = delightAanyaItems({ sarah: false, creedCount: 3 });
    expect(items.map((i) => [i.label, i.action.type])).toEqual([['The Highlights', 'highlights'], ['Naina’s corner', 'naina']]);
    expect(items[1]?.detail).toBe('3 things nobody can explain');
    const top = (q: string) => searchAanya(items, q, [])[0]?.items[0]?.action.type;
    expect(top('awards')).toBe('highlights');
    expect(top('unattributed')).toBe('naina');
  });

  it('are the weekly review and unattributed activity in Sarah mode', () => {
    const items = delightAanyaItems({ sarah: true, creedCount: 0 });
    expect(items.map((i) => i.label)).toEqual(['Weekly review', 'Unattributed activity']);
    expect(items[1]?.detail).toBe('Nothing unattributed');
  });
});
