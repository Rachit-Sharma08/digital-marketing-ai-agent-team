import { describe, expect, it } from 'vitest';
import type { AgentCapabilities, OfficeSnapshot } from '@shared/contract';
import { DEMO_SNAPSHOT } from '@shared/fixtures/demo-snapshot';
import { withDemoControls } from '../budgets/demoCorporate';
import { controlItems } from './controlItems';
import { buildAanyaItems } from './items';
import { searchAanya } from './search';

const WEBHOOK: AgentCapabilities = { chat: false, createTask: false, approvals: true, pause: true, stop: true, runJob: false, reassign: false };
const DEMO = withDemoControls(DEMO_SNAPSHOT);
const withWebhookPriya: OfficeSnapshot = {
  ...DEMO, people: DEMO.people.map((p) => (p.id === 'priya' ? { ...p, bot: { ...p.bot!, adapter: 'webhook', capabilities: WEBHOOK } } : p)),
};

describe('Ask Aanya control verbs', () => {
  it('offers run-now for jobs, stop for running cards and reassign for open cards, each opening a confirmation', () => {
    const items = controlItems(DEMO, true);
    const meera = items.filter((i) => i.personId === 'meera');
    expect(meera.map((i) => i.label)).toEqual([
      'Stop “Audit the Q4 campaign report”', 'Reassign “Audit the Q4 campaign report”…', 'Run “Weekly campaign report” now',
    ]);
    expect(meera[2]).toMatchObject({ kind: 'control', action: { type: 'control', personId: 'meera', request: { action: 'run-job', args: { jobId: 'demo-meera-0' } } } });
    expect(meera[1]?.action).toEqual({ type: 'control', personId: 'meera', request: { action: 'reassign', args: { taskId: 'task-q4-audit', to: '' } } });
    expect(items.some((i) => i.label.startsWith('Pause'))).toBe(false); // Hermes bots can't be paused
    expect(items.some((i) => i.label === 'Run “Nightly backup verify” now')).toBe(false); // paused job
  });

  it('offers pause, resume and stop for an adapter that can pause', () => {
    const priya = controlItems(withWebhookPriya, true).filter((i) => i.personId === 'priya').map((i) => i.label);
    expect(priya).toEqual(['Pause Priya', 'Resume Priya', 'Stop Priya’s current run', 'Stop “Thursday content calendar”']);
  });

  it('offers nothing on a read-only server', () => {
    expect(controlItems(DEMO, false)).toEqual([]);
    expect(buildAanyaItems(DEMO, { filter: 'all', view: 'map', writable: false }).some((i) => i.kind === 'control')).toBe(false);
  });

  it('can be found by verb and name', () => {
    const items = buildAanyaItems(withWebhookPriya, { filter: 'all', view: 'map', writable: true });
    const found = searchAanya(items, 'pause pri', []).flatMap((s) => s.items).map((i) => i.label);
    expect(found[0]).toBe('Pause Priya');
  });
});
