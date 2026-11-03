import { describe, expect, it } from 'vitest';
import type { OfficeSnapshot } from '@shared/contract';
import type { TimelineResponse, UsageReport } from '@shared/observability';
import { DEMO_OFFICE } from '@shared/fixtures/demo-approvals';
import { DEMO_NOW } from '@shared/fixtures/demo-snapshot';
import { computeHighlights, trophyShelf } from './awards';
import { botWeeks, snapshotEvents, weekWindow } from './signals';

const NOW = Date.parse(DEMO_NOW);
const W = weekWindow(NOW);

describe('snapshotEvents (a bot without a timeline)', () => {
  it('counts its cards, its jobs\' last runs and what it is doing now, inside the week', () => {
    const kinds = snapshotEvents(DEMO_OFFICE, 'aanya', W).map((e) => `${e.kind}:${e.title}`);
    expect(kinds).toContain('task.finished:Morning handoff digest');
    expect(kinds).toContain('cron.ok:Morning handoff digest');
    const sadiq = snapshotEvents(DEMO_OFFICE, 'sadiq', W);
    expect(sadiq).toContainEqual(expect.objectContaining({ kind: 'cron.fail', title: 'Fleet health check', detail: 'error: gateway timeout' }));
    expect(sadiq.some((e) => e.kind === 'task.blocked')).toBe(true);
  });

  it('leaves out what is outside the week', () => {
    expect(snapshotEvents(DEMO_OFFICE, 'aanya', weekWindow(NOW + 30 * 86_400_000))).toEqual([]);
  });
});

describe('botWeeks', () => {
  const timeline: TimelineResponse = {
    personId: 'meera', available: true, since: W.from.toString(), truncated: false,
    events: [{ id: 'a', at: new Date(NOW - 60_000).toISOString(), kind: 'task.finished', title: 'From the timeline' }, { id: 'b', at: new Date(NOW - 9 * 86_400_000).toISOString(), kind: 'task.finished', title: 'Too old' }],
  };
  const usage = { rows: [{ personId: 'meera', usage: { cost: 1.5 } }, { personId: 'tara', usage: null }] } as unknown as UsageReport;
  const weeks = botWeeks(DEMO_OFFICE, { meera: timeline, neha: { ...timeline, personId: 'neha', available: false, events: [] } }, usage, W);
  const week = (id: string) => weeks.find((b) => b.personId === id)!;

  it('has every bot (and nobody without one), from its timeline when it has one', () => {
    expect(weeks.map((b) => b.personId).sort()).toEqual(DEMO_OFFICE.people.filter((p) => p.bot).map((p) => p.id).sort());
    expect(week('meera')).toMatchObject({ source: 'timeline', cost: 1.5 });
    expect(week('meera').events.map((e) => e.title)).toEqual(['From the timeline']);
    expect(week('neha').source).toBe('snapshot');
    expect(week('tara').cost).toBeUndefined();
  });

  it('marks a bot in error right now with its error text', () => {
    expect(week('sadiq').errorNow).toBe('Gateway timeout on the deploy check');
    expect(week('aanya').errorNow).toBeUndefined();
  });
});

describe('the demo office\'s Highlights', () => {
  it('hands out awards from the snapshot alone, and trophies to their winners', () => {
    const digest = computeHighlights(botWeeks(DEMO_OFFICE, {}, null, W), W);
    expect(digest.fromSnapshot).toBe(digest.counted);
    expect(digest.awards.find((a) => a.id === 'dont-go-in')).toMatchObject({ winnerId: 'sadiq' });
    const shelf = trophyShelf(digest);
    expect([...shelf.keys()].length).toBeGreaterThan(0);
    expect(shelf.has('sadiq') && shelf.get('sadiq')!.some((a) => a.id === 'dont-go-in')).toBe(false);
  });

  it('is empty for an office with no bots', () => {
    const empty: OfficeSnapshot = { ...DEMO_OFFICE, people: DEMO_OFFICE.people.map(({ bot: _b, ...p }) => p) };
    expect(computeHighlights(botWeeks(empty, {}, null, W), W).awards).toEqual([]);
    expect(trophyShelf(null).size).toBe(0);
  });
});
