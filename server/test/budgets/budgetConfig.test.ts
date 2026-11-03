// `budgets:` in ~/.agents-ka-ghar/config.yaml: per-person daily/monthly USD limits plus autoPause (default false).
import { describe, expect, it } from 'vitest';
import { parseBudgets } from '../../src/budgets/config.ts';
import { parseOfficeConfig } from '../../src/officeConfig.ts';

describe('parseBudgets', () => {
  it('reads limits per person, autoPause off by default', () => {
    expect(parseBudgets({ meera: { monthly: 20 }, priya: { daily: 1.5, monthly: 30 } })).toEqual({
      ok: true, value: { autoPause: false, limits: { meera: { monthly: 20 }, priya: { daily: 1.5, monthly: 30 } } },
    });
    expect(parseBudgets({ autoPause: true, meera: { daily: 2 } })).toEqual({ ok: true, value: { autoPause: true, limits: { meera: { daily: 2 } } } });
  });

  it('accepts temps (agents at spare desks) by their person id', () => {
    expect(parseBudgets({ 'temp-webhook-deploy-bot': { monthly: 5 } })).toMatchObject({ ok: true });
  });

  it('refuses mistakes with the field named', () => {
    expect(parseBudgets([])).toEqual({ ok: false, error: 'budgets: expected a mapping like { meera: { monthly: 20 } }' });
    expect(parseBudgets({ autoPause: 'yes' })).toEqual({ ok: false, error: 'budgets.autoPause: true or false' });
    expect(parseBudgets({ dwigth: { monthly: 20 } })).toEqual({ ok: false, error: 'budgets.dwigth: "dwigth" is not a character (see shared/office/staff.ts)' });
    expect(parseBudgets({ meera: 20 })).toEqual({ ok: false, error: 'budgets.meera: expected { daily, monthly } in USD' });
    expect(parseBudgets({ meera: {} })).toEqual({ ok: false, error: 'budgets.meera: give a daily or a monthly limit (USD)' });
    expect(parseBudgets({ meera: { weekly: 5 } })).toEqual({ ok: false, error: 'budgets.meera: unknown field "weekly" (expected daily, monthly)' });
    for (const bad of [0, -1, Number.NaN, '20', 2_000_000]) {
      expect(parseBudgets({ meera: { monthly: bad } })).toEqual({ ok: false, error: 'budgets.meera.monthly: a number of USD above 0 (at most 1000000)' });
    }
  });
});

describe('budgets in config.yaml', () => {
  it('are optional and parsed with the rest of the config', () => {
    expect(parseOfficeConfig({ adapters: ['hermes'] }, 'config.yaml').budgets).toBeUndefined();
    expect(parseOfficeConfig({ budgets: { autoPause: true, meera: { monthly: 20 } } }, 'config.yaml').budgets)
      .toEqual({ autoPause: true, limits: { meera: { monthly: 20 } } });
    expect(() => parseOfficeConfig({ budgets: { meera: { monthly: -5 } } }, 'config.yaml')).toThrow('config.yaml: budgets.meera.monthly');
  });
});
