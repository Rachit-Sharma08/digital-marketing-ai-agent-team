import { describe, expect, it } from 'vitest';
import type { OfficeSnapshot } from '@shared/contract';
import { applyEvent } from './merge';

const deepFreeze = <T>(o: T): T => {
  if (o && typeof o === 'object') {
    Object.values(o as object).forEach(deepFreeze);
    Object.freeze(o);
  }
  return o;
};

const base = (): OfficeSnapshot => deepFreeze({
  generatedAt: '2026-10-13T15:00:00.000Z',
  people: [],
  presence: { meera: { status: 'working', activity: 'Auditing' }, aanya: { status: 'idle' } },
  rooms: [],
  tasks: [
    { id: 't1', title: 'One', status: 'doing', shared: false, updatedAt: '2026-10-13T14:00:00.000Z' },
    { id: 't2', title: 'Two', status: 'todo', shared: true, updatedAt: '2026-10-13T14:00:00.000Z' },
  ],
});

describe('applyEvent', () => {
  it('replaces presence per person without mutating the snapshot', () => {
    const snap = base();
    const next = applyEvent(snap, { presence: { meera: { status: 'idle' } } });
    expect(next.presence.meera).toEqual({ status: 'idle' });
    expect(next.presence.aanya).toBe(snap.presence.aanya);
    expect(snap.presence.meera.status).toBe('working');
    expect(next).not.toBe(snap);
  });

  it('adds presence for people it has not seen', () => {
    expect(applyEvent(base(), { presence: { priya: { status: 'working' } } }).presence.priya.status).toBe('working');
  });

  it('replaces the whole task list when an event carries tasks', () => {
    const next = applyEvent(base(), {
      tasks: [{ id: 't3', title: 'Three', status: 'todo', shared: false, updatedAt: '2026-10-13T15:00:00.000Z' }],
    });
    expect(next.tasks.map((t) => `${t.id}:${t.status}`)).toEqual(['t3:todo']);
  });

  it('treats an empty task list as "no tasks now"', () => {
    expect(applyEvent(base(), { tasks: [] }).tasks).toEqual([]);
  });

  it('keeps tasks untouched by a presence-only event', () => {
    const snap = base();
    expect(applyEvent(snap, { presence: { aanya: { status: 'working' } } }).tasks).toBe(snap.tasks);
  });

  it('returns the same snapshot for an empty event', () => {
    const snap = base();
    expect(applyEvent(snap, {})).toBe(snap);
  });
});
