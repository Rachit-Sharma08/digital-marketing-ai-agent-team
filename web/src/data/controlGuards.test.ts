import { describe, expect, it } from 'vitest';
import { DEMO_SNAPSHOT } from '@shared/fixtures/demo-snapshot';
import { parseSnapshot } from './guards';
import { parseBudgetsReport, parseControlReply } from './budgetGuards';

const FIVE = { chat: true, createTask: true, approvals: true, pause: false, stop: true };
const withBot = (capabilities: unknown, jobs: unknown[] = []) => parseSnapshot({
  ...DEMO_SNAPSHOT,
  people: DEMO_SNAPSHOT.people.map((p) => (p.id === 'meera' ? { ...p, bot: { ...p.bot, capabilities } } : p)),
  jobs: { meera: jobs },
});

describe('control capability flags and job ids from the server', () => {
  it('keeps runJob and reassign when the server sends them, and works without them', () => {
    const full = withBot({ ...FIVE, runJob: true, reassign: false });
    expect(full?.people.find((p) => p.id === 'meera')?.bot?.capabilities).toEqual({ ...FIVE, runJob: true, reassign: false });
    const older = withBot(FIVE);
    expect(older?.people.find((p) => p.id === 'meera')?.bot?.capabilities).toEqual(FIVE);
    const odd = withBot({ ...FIVE, runJob: 'yes' });
    expect(odd?.people.find((p) => p.id === 'meera')?.bot?.capabilities).toEqual(FIVE);
  });

  it('keeps a job\'s id when it has a safe shape', () => {
    const snap = withBot(FIVE, [
      { id: 'joba1b2c3', name: 'Report', schedule: 'daily', enabled: true },
      { id: '../../x', name: 'Odd', schedule: 'daily', enabled: true },
      { name: 'No id', schedule: 'daily', enabled: true },
    ]);
    expect(snap?.jobs?.meera?.map((j) => [j.name, j.id])).toEqual([['Report', 'joba1b2c3'], ['Odd', undefined], ['No id', undefined]]);
  });
});

const LINE = { period: 'monthly', limit: 20, spent: 21, ratio: 1.05, level: 'over', from: '2026-10-01T04:00:00.000Z', to: '2026-10-13T19:00:00.000Z', unpricedModels: [] };
const REPORT = {
  generatedAt: '2026-10-13T19:00:00.000Z', currency: 'USD', estimate: true, autoPause: true, warnAt: 0.8,
  budgets: [{ personId: 'meera', name: 'Meera Kaur', adapterLabel: 'Hermes', level: 'over', lines: [LINE], action: 'alert', note: "Hermes agents can't be paused" }],
};

describe('parseBudgetsReport', () => {
  it('accepts a well-formed report', () => {
    expect(parseBudgetsReport(REPORT)).toEqual(REPORT);
  });

  it('drops malformed budgets and lines but keeps the rest', () => {
    const report = parseBudgetsReport({
      ...REPORT,
      budgets: [...REPORT.budgets, { personId: 'diya', name: 'Diya', level: 'hungry', lines: [], action: 'none' },
        { personId: 'simran', name: 'Simran', level: 'ok', action: 'none', lines: [{ ...LINE, level: 'ok', limit: -1 }, { ...LINE, level: 'ok', spent: null, ratio: null }] }],
    });
    expect(report?.budgets.map((b) => [b.personId, b.lines.length])).toEqual([['meera', 1], ['simran', 1]]);
  });

  it('refuses something that is not a report', () => {
    expect(parseBudgetsReport(null)).toBeNull();
    expect(parseBudgetsReport({ budgets: 'all' })).toBeNull();
  });
});

describe('parseControlReply', () => {
  it('reads the server\'s sentence, or nothing', () => {
    expect(parseControlReply({ ok: true, action: 'pause', message: 'Paused Meera Kaur.' })).toEqual({ ok: true, action: 'pause', message: 'Paused Meera Kaur.' });
    expect(parseControlReply({ ok: true, action: 'nap', message: 'x' })).toBeNull();
  });
});
