import { describe, expect, it } from 'vitest';
import { DEMO_OFFICE } from '@shared/fixtures/demo-approvals';
import { finishedRun } from './bobble';

const jobs = DEMO_OFFICE.jobs!;
const withMeeraJob = (lastRunAt: string, lastStatus: string) => ({
  ...DEMO_OFFICE, jobs: { ...jobs, meera: [{ ...jobs.meera![0]!, lastRunAt, lastStatus }] },
});

describe('finishedRun (Meera\'s bobblehead nods)', () => {
  it('nods when a scheduled job at the desk finishes a new run, or one of its cards is done', () => {
    const before = withMeeraJob('2026-10-13T14:00:00.000Z', 'ok');
    expect(finishedRun(before, withMeeraJob('2026-10-13T15:00:00.000Z', 'ok'), 'meera')).toBe(true);
    expect(finishedRun(before, withMeeraJob('2026-10-13T15:00:00.000Z', 'error: boom'), 'meera')).toBe(true);
    const running = withMeeraJob('2026-10-13T15:00:00.000Z', 'running');
    expect(finishedRun(running, withMeeraJob('2026-10-13T15:00:00.000Z', 'ok'), 'meera')).toBe(true); // the run it was doing ended
    const done = { ...before, tasks: before.tasks.map((t) => (t.ownerId === 'meera' ? { ...t, status: 'done' as const } : t)) };
    expect(finishedRun(before, done, 'meera')).toBe(true);
  });

  it('nods when the bot goes from working to idle (a run ended), not when it crashes', () => {
    const at = (status: 'working' | 'idle' | 'error') => ({ ...DEMO_OFFICE, presence: { ...DEMO_OFFICE.presence, meera: { status } } });
    expect(finishedRun(at('working'), at('idle'), 'meera')).toBe(true);
    expect(finishedRun(at('working'), at('error'), 'meera')).toBe(false);
    expect(finishedRun(at('idle'), at('idle'), 'meera')).toBe(false);
  });

  it('stays still for a run in progress, someone else\'s run, nothing new, or the first look', () => {
    const before = withMeeraJob('2026-10-13T14:00:00.000Z', 'ok');
    expect(finishedRun(before, withMeeraJob('2026-10-13T15:00:00.000Z', 'running'), 'meera')).toBe(false);
    expect(finishedRun(before, before, 'meera')).toBe(false);
    expect(finishedRun(before, withMeeraJob('2026-10-13T15:00:00.000Z', 'ok'), 'priya')).toBe(false);
    expect(finishedRun(null, before, 'meera')).toBe(false);
  });
});
