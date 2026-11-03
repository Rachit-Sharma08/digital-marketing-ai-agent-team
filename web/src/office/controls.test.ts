import { describe, expect, it } from 'vitest';
import type { AgentCapabilities, OfficeSnapshot, Person } from '@shared/contract';
import { DEMO_SNAPSHOT } from '@shared/fixtures/demo-snapshot';
import { confirmCopy, offeredControls, reassignTargets, runningTasks, stopsCardsOnly } from './controls';

const HERMES: AgentCapabilities = { chat: true, createTask: true, approvals: true, pause: false, stop: true, runJob: true, reassign: true };
const WEBHOOK: AgentCapabilities = { chat: false, createTask: false, approvals: true, pause: true, stop: true, runJob: false, reassign: false };
const meera = DEMO_SNAPSHOT.people.find((p) => p.id === 'meera')!;
const withCaps = (p: Person, capabilities: AgentCapabilities, adapter = 'hermes'): Person => ({ ...p, bot: { ...p.bot!, adapter, capabilities } });
const snapshotWith = (people: Person[]): OfficeSnapshot => ({ ...DEMO_SNAPSHOT, people: DEMO_SNAPSHOT.people.map((p) => people.find((x) => x.id === p.id) ?? p) });

describe('offeredControls', () => {
  it('offers exactly what the bot\'s adapter declares, when writes are on', () => {
    expect(offeredControls(withCaps(meera, HERMES), true)).toEqual({ pause: false, stop: true, runJob: true, reassign: true });
    expect(offeredControls(withCaps(meera, WEBHOOK, 'webhook'), true)).toEqual({ pause: true, stop: true, runJob: false, reassign: false });
  });

  it('offers nothing read-only, without a bot, or for data that predates control verbs', () => {
    const none = { pause: false, stop: false, runJob: false, reassign: false };
    expect(offeredControls(withCaps(meera, HERMES), false)).toEqual(none);
    expect(offeredControls(DEMO_SNAPSHOT.people.find((p) => p.id === 'simran')!, true)).toEqual(none);
    expect(offeredControls(meera, true)).toEqual(none); // no capability flags at all
  });
});

describe('reassignTargets and runningTasks', () => {
  it('hands cards only to other bots of the same adapter', () => {
    const snap = snapshotWith([withCaps(meera, HERMES), withCaps(DEMO_SNAPSHOT.people.find((p) => p.id === 'priya')!, WEBHOOK, 'webhook')]);
    const targets = reassignTargets(snap.people.find((p) => p.id === 'meera')!, snap).map((p) => p.id);
    expect(targets).not.toContain('meera');
    expect(targets).not.toContain('priya'); // another adapter
    expect(targets).not.toContain('simran'); // no bot
    expect(targets).toContain('aanya');
  });

  it('lists the bot\'s running cards', () => {
    expect(runningTasks(meera, DEMO_SNAPSHOT).map((t) => t.id)).toEqual(['task-q4-audit']);
  });
});

describe('confirmCopy', () => {
  const ctx = { person: withCaps(meera, HERMES), snapshot: DEMO_SNAPSHOT };
  it('says what each verb will do before you confirm it', () => {
    expect(confirmCopy({ action: 'pause' }, ctx)).toMatchObject({ title: 'Pause Meera?', confirm: 'Pause', tone: 'danger' });
    expect(confirmCopy({ action: 'resume' }, ctx)).toMatchObject({ title: 'Resume Meera?', confirm: 'Resume', tone: 'normal' });
    expect(confirmCopy({ action: 'stop', args: { taskId: 'task-q4-audit' } }, ctx))
      .toMatchObject({ title: 'Stop “Audit the Q4 campaign report”?', confirm: 'Stop it', tone: 'danger' });
    expect(confirmCopy({ action: 'stop' }, ctx)).toMatchObject({ title: 'Stop Meera’s current run?' });
    expect(confirmCopy({ action: 'run-job', args: { jobId: 'x' } }, { ...ctx, snapshot: { ...DEMO_SNAPSHOT, jobs: { meera: [{ id: 'x', name: 'Weekly campaign report', schedule: 'Fridays 16:00', enabled: true }] } } }))
      .toMatchObject({ title: 'Run “Weekly campaign report” now?', detail: expect.stringContaining('Fridays 16:00'), confirm: 'Run now' });
    expect(confirmCopy({ action: 'reassign', args: { taskId: 'task-q4-audit', to: 'aanya' } }, ctx))
      .toMatchObject({ title: 'Hand “Audit the Q4 campaign report” to Aanya?', confirm: 'Reassign' });
    expect(confirmCopy({ action: 'reassign', args: { taskId: 'task-q4-audit', to: '' } }, ctx)).toMatchObject({ title: 'Hand “Audit the Q4 campaign report” to…' });
  });

  it('explains Hermes stops in its own terms (the card is parked, unblock to rerun)', () => {
    expect(confirmCopy({ action: 'stop', args: { taskId: 'task-q4-audit' } }, ctx).detail).toMatch(/parked as blocked/);
    const hook = { person: withCaps(meera, WEBHOOK, 'claude-code'), snapshot: DEMO_SNAPSHOT };
    expect(confirmCopy({ action: 'stop' }, hook).detail).toMatch(/next step/);
  });
});

describe('stopsCardsOnly', () => {
  it('is true for Hermes and the demo day, which stop kanban cards only', () => {
    expect(stopsCardsOnly(withCaps(meera, HERMES))).toBe(true);
    expect(stopsCardsOnly(withCaps(meera, HERMES, 'demo'))).toBe(true);
    expect(stopsCardsOnly(withCaps(meera, WEBHOOK, 'webhook'))).toBe(false);
  });
});
