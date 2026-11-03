import { describe, expect, it } from 'vitest';
import { MAX_RECENTS, parseRecents, pushRecent } from './recents';

describe('recent items', () => {
  it('puts the newest first, without duplicates, capped', () => {
    const list = ['person:aanya', 'room:ops'];
    expect(pushRecent(list, 'room:ops')).toEqual(['room:ops', 'person:aanya']);
    expect(pushRecent(list, 'person:meera')).toEqual(['person:meera', 'person:aanya', 'room:ops']);
    const full = Array.from({ length: MAX_RECENTS }, (_, i) => `task:${i}`);
    expect(pushRecent(full, 'person:simran')).toHaveLength(MAX_RECENTS);
    expect(pushRecent(full, 'person:simran')[0]).toBe('person:simran');
    expect(list).toEqual(['person:aanya', 'room:ops']); // not mutated
  });

  it('parses only a list of short strings from storage', () => {
    expect(parseRecents(undefined)).toEqual([]);
    expect(parseRecents({ a: 1 })).toEqual([]);
    expect(parseRecents(['person:aanya', 3, 'x'.repeat(500), 'room:ops'])).toEqual(['person:aanya', 'room:ops']);
    expect(parseRecents(Array.from({ length: 20 }, (_, i) => `task:${i}`))).toHaveLength(MAX_RECENTS);
  });
});
