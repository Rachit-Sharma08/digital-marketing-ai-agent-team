import { describe, expect, it } from 'vitest';
import { authorName, mergeMessages } from './chatModel';

const m = (id: string, authorId: string, text: string, at = '2026-10-13T15:00:00.000Z') => ({ id, roomId: 'r', authorId, text, at });

describe('mergeMessages', () => {
  it('keeps local messages the server has not echoed yet and drops the ones it has', () => {
    const server = [m('s1', 'you', 'hello'), m('s2', 'meera', 'hi')];
    const local = [m('l1', 'you', 'hello'), m('l2', 'you', 'still here?')];
    expect(mergeMessages(server, local).map((x) => x.id)).toEqual(['s1', 's2', 'l2']);
  });

  it('sorts by time', () => {
    const merged = mergeMessages([m('b', 'x', 'b', '2026-10-13T15:02:00.000Z')], [m('a', 'you', 'a', '2026-10-13T15:01:00.000Z')]);
    expect(merged.map((x) => x.id)).toEqual(['a', 'b']);
  });
});

describe('authorName', () => {
  const people = [{ id: 'meera', name: 'Meera Kaur', bot: { profile: 'campaigns', role: '' } }];
  it('names you, people by id and bots by profile', () => {
    expect(authorName('you', people)).toBe('You');
    expect(authorName('meera', people)).toBe('Meera Kaur');
    expect(authorName('campaigns', people)).toBe('Meera Kaur');
    expect(authorName('ghost', people)).toBe('ghost');
  });
});
