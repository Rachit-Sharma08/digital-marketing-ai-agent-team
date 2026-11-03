import { describe, expect, it } from 'vitest';
import { DEMO_SNAPSHOT } from '@shared/fixtures/demo-snapshot';
import { buildAanyaItems } from './items';
import { parseQuery, searchAanya } from './search';

const items = buildAanyaItems(DEMO_SNAPSHOT, { filter: 'all', view: 'map', writable: true });
const ids = (query: string, recents: string[] = []) => searchAanya(items, query, recents).flatMap((s) => s.items.map((i) => i.id));

describe('parseQuery', () => {
  it('pulls out an s: status filter, matching a status by prefix', () => {
    expect(parseQuery('  Meera  ')).toEqual({ tokens: ['meera'] });
    expect(parseQuery('s:err sad')).toEqual({ tokens: ['sad'], status: 'error' });
    expect(parseQuery('s:needs')).toEqual({ tokens: [], status: 'needs-input' });
    expect(parseQuery('s:needs-you')).toEqual({ tokens: [], status: 'needs-input' });
    expect(parseQuery('s:party')).toEqual({ tokens: [], status: 'party' });
  });
});

describe('searchAanya', () => {
  it('with no query, shows recent items then actions', () => {
    const sections = searchAanya(items, '', ['room:ops', 'person:gone', 'person:meera']);
    expect(sections.map((s) => s.id)).toEqual(['recent', 'actions']);
    expect(sections[0].items.map((i) => i.id)).toEqual(['room:ops', 'person:meera']);
    expect(sections[1].items.every((i) => i.kind === 'action')).toBe(true);
    expect(searchAanya(items, '  ', []).map((s) => s.id)).toEqual(['actions']);
  });

  it('finds a person first, then their chat', () => {
    expect(ids('mee').slice(0, 2)).toEqual(['person:meera', 'bot:meera']);
    expect(ids('chat mee')[0]).toBe('bot:meera');
  });

  it('searches rooms, tasks and jobs', () => {
    expect(ids('council')).toContain('room:council');
    expect(ids('q4 pricing')[0]).toBe('task:task-q4-pricing');
    expect(ids('backup')).toEqual([expect.stringMatching(/^job:sadiq:/)]);
    expect(ids('conference').slice(0, 3)).toContain('action:conference');
  });

  it('finds people by bot profile, role and status words', () => {
    expect(ids('campaigns')[0]).toBe('person:meera');
    expect(ids('council advisor')).toContain('person:zara');
  });

  it('filters by status with s:', () => {
    expect(ids('s:error')).toEqual(['person:sadiq', 'bot:sadiq']);
    expect(ids('s:work pri')).toEqual(['person:priya', 'bot:priya']);
    expect(ids('s:party')).toEqual([]);
  });

  it('nudges recent items up among equal matches and caps the list', () => {
    expect(ids('room', ['room:skool'])[0]).toBe('room:skool');
    expect(searchAanya(items, 'e', [], 6)[0].items).toHaveLength(6);
  });

  it('returns an empty results section when nothing matches', () => {
    expect(searchAanya(items, 'zzzz', [])).toEqual([{ id: 'results', title: 'Results', items: [] }]);
  });
});
