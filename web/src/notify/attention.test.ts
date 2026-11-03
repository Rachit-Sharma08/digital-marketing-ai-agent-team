import { describe, expect, it } from 'vitest';
import type { Presence } from '@shared/contract';
import { DEMO_SNAPSHOT } from '@shared/fixtures/demo-snapshot';
import { addUnseen, attentionEvents, attentionOf, notificationText, pruneUnseen } from './attention';

const people = DEMO_SNAPSHOT.people;
const base = DEMO_SNAPSHOT.presence;
const with_ = (patch: Record<string, Presence>) => ({ ...base, ...patch });

describe('attentionOf', () => {
  it('needs-input means needs-you, error means error; anything else needs no attention', () => {
    expect(attentionOf({ status: 'needs-input' })).toBe('needs-you');
    expect(attentionOf({ status: 'error' })).toBe('error');
    expect(attentionOf({ status: 'working' })).toBeNull();
    expect(attentionOf(undefined)).toBeNull();
  });
});

describe('attentionEvents', () => {
  it('fires when a bot changes to error or starts needing you', () => {
    const next = with_({ meera: { status: 'error', activity: 'Ad account locked' }, priya: { status: 'needs-input', activity: 'Approve Thursday posts?' } });
    const events = attentionEvents(people, base, next);
    expect(events).toEqual([
      { personId: 'meera', kind: 'error', name: 'Meera Kaur', text: 'Ad account locked' },
      { personId: 'priya', kind: 'needs-you', name: 'Priya Singh', text: 'Approve Thursday posts?' },
    ]);
  });

  it('stays quiet for a bot already in that state, for recoveries and for people without bots', () => {
    expect(attentionEvents(people, base, with_({ sadiq: { status: 'error', activity: 'Still broken' } }))).toEqual([]);
    expect(attentionEvents(people, base, with_({ sadiq: { status: 'idle' } }))).toEqual([]);
    expect(attentionEvents(people, base, with_({ simran: { status: 'error' } }))).toEqual([]);
  });
});

describe('unseen attention', () => {
  it('adds events and forgets bots that recovered before you looked', () => {
    const events = attentionEvents(people, base, with_({ meera: { status: 'error' }, priya: { status: 'needs-input' } }));
    const unseen = addUnseen(new Map(), events);
    expect([...unseen.keys()]).toEqual(['meera', 'priya']);
    const pruned = pruneUnseen(unseen, with_({ meera: { status: 'working' }, priya: { status: 'needs-input' } }));
    expect([...pruned.keys()]).toEqual(['priya']);
    expect([...unseen.keys()]).toEqual(['meera', 'priya']); // not mutated
  });
});

describe('notificationText', () => {
  it('reads like a message from the office', () => {
    expect(notificationText({ personId: 'sadiq', kind: 'error', name: 'Sadiq', text: 'Gateway timeout' }))
      .toEqual({ title: 'Sadiq hit an error', body: 'Gateway timeout' });
    expect(notificationText({ personId: 'aanya', kind: 'needs-you', name: 'Aanya Sharma', text: '' }))
      .toEqual({ title: 'Aanya needs you', body: 'Open Agents Ka Ghar to answer.' });
  });
});
