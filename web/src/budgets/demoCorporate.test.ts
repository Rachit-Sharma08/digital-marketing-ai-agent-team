import { describe, expect, it } from 'vitest';
import { DEMO_SNAPSHOT } from '@shared/fixtures/demo-snapshot';
import { interpretControl } from '../data/controlsApi';
import { demoBudgets, demoControlReply, withDemoControls } from './demoCorporate';

describe('demo mode: controls and Corporate', () => {
  it('gives demo bots the Hermes control flags and their jobs ids, without touching people who have no bot', () => {
    const s = withDemoControls(DEMO_SNAPSHOT);
    expect(s.people.find((p) => p.id === 'meera')?.bot?.capabilities).toMatchObject({ pause: false, stop: true, runJob: true, reassign: true });
    expect(s.people.find((p) => p.id === 'simran')?.bot).toBeUndefined();
    expect(s.jobs?.meera?.[0]?.id).toBe('demo-meera-0');
    expect(withDemoControls(s)).toEqual(s); // idempotent
    expect(DEMO_SNAPSHOT.jobs?.meera?.[0]?.id).toBeUndefined(); // not mutated
  });

  it('has a fictional budget report: one near, one over, one unpriced', () => {
    const r = demoBudgets(DEMO_SNAPSHOT);
    expect(r.generatedAt).toBe(DEMO_SNAPSHOT.generatedAt);
    expect(r.budgets.map((b) => [b.personId, b.level, b.action])).toEqual([['priya', 'over', 'alert'], ['meera', 'warn', 'none'], ['aisha', 'unpriced', 'none']]);
    expect(r.budgets.find((b) => b.personId === 'aisha')?.lines[0]?.unpricedModels).toEqual(['pretzel-7b-local']);
  });

  it('answers a demo verb locally, saying nothing was sent', () => {
    expect(demoControlReply('Pause Meera?')).toBe('Demo: nothing was sent. Live, this would: pause Meera.');
  });
});

describe('interpretControl', () => {
  it('reads the server\'s answer', () => {
    expect(interpretControl(200, { ok: true, action: 'stop', message: 'Stopped it.' })).toEqual({ ok: true, message: 'Stopped it.' });
    expect(interpretControl(200, { nonsense: true })).toEqual({ ok: false, error: 'The server returned an unexpected answer' });
    expect(interpretControl(401, null)).toEqual({ ok: false, error: 'Sign in again to do this (your session ended).' });
    expect(interpretControl(409, { error: 'That card is not running' })).toEqual({ ok: false, error: 'That card is not running' });
    expect(interpretControl(503, {})).toEqual({ ok: false, error: 'Request failed (503)' });
  });
});
