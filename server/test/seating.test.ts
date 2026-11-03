import { describe, expect, it } from 'vitest';
import { assignSeats, mergeSeatRules, tempPersonId } from '../src/office/seating.ts';
import { DEFAULT_SEATS } from '../src/roster.ts';

const STAFF = ['aanya', 'meera', 'simran', 'diya'];
const SPARES = ['seat.spare.1', 'seat.spare.2'];
const hermes = (...agentIds: string[]) => ({ adapterId: 'hermes', agentIds });

describe('mergeSeatRules (config over the built-in seating)', () => {
  const defaults = { aanya: { adapter: 'hermes', agent: 'chief' }, meera: { adapter: 'hermes', agent: 'campaigns' } };

  it('lets a config entry replace a desk, or clear it with null', () => {
    const merged = mergeSeatRules(defaults, { aanya: { adapter: 'webhook', agent: 'deploy-bot' }, meera: null });
    expect(merged).toEqual({ aanya: { adapter: 'webhook', agent: 'deploy-bot', hard: true }, meera: null });
  });

  it('moving an agent to another desk frees its old one', () => {
    const merged = mergeSeatRules(defaults, { simran: { adapter: 'hermes', agent: 'campaigns' } });
    expect(merged).toEqual({ aanya: { adapter: 'hermes', agent: 'chief', hard: false }, simran: { adapter: 'hermes', agent: 'campaigns', hard: true } });
  });

  it('builds the defaults from the Hermes roster', () => {
    expect(DEFAULT_SEATS.meera).toEqual({ adapter: 'hermes', agent: 'campaigns' });
    expect(Object.keys(DEFAULT_SEATS)).toHaveLength(12);
  });
});

describe('assignSeats', () => {
  const rules = mergeSeatRules({ aanya: { adapter: 'hermes', agent: 'chief' }, meera: { adapter: 'hermes', agent: 'campaigns' } }, {});

  it('seats each reported agent at its character\'s desk', () => {
    const s = assignSeats({ rules, staffIds: STAFF, spareSeatIds: SPARES, agents: [hermes('chief', 'campaigns')] });
    expect(s.staff.get('aanya')).toEqual({ personId: 'aanya', adapterId: 'hermes', agentId: 'chief' });
    expect(s.personOf('hermes', 'campaigns')).toBe('meera');
    expect(s.staff.has('simran')).toBe(false);
    expect(s.temps).toEqual([]);
  });

  it('leaves a built-in desk without a bot when its agent is not reported', () => {
    const s = assignSeats({ rules, staffIds: STAFF, spareSeatIds: SPARES, agents: [hermes('chief')] });
    expect(s.staff.has('meera')).toBe(false);
  });

  it('keeps a configured desk for an agent that has not reported yet', () => {
    const merged = mergeSeatRules({}, { simran: { adapter: 'webhook', agent: 'deploy-bot', role: 'Ships releases' } });
    const s = assignSeats({ rules: merged, staffIds: STAFF, spareSeatIds: SPARES, agents: [{ adapterId: 'webhook', agentIds: [] }] });
    expect(s.staff.get('simran')).toEqual({ personId: 'simran', adapterId: 'webhook', agentId: 'deploy-bot', role: 'Ships releases' });
  });

  it('ignores desks for adapters that are not running', () => {
    const merged = mergeSeatRules({}, { simran: { adapter: 'webhook', agent: 'deploy-bot' } });
    const s = assignSeats({ rules: merged, staffIds: STAFF, spareSeatIds: SPARES, agents: [hermes('chief')] });
    expect(s.staff.size).toBe(0);
  });

  it('gives one agent one desk: the first character in staff order wins', () => {
    const merged = mergeSeatRules({}, { diya: { adapter: 'hermes', agent: 'chief' }, aanya: { adapter: 'hermes', agent: 'chief' } });
    const s = assignSeats({ rules: merged, staffIds: STAFF, spareSeatIds: SPARES, agents: [hermes('chief')] });
    expect([...s.staff.keys()]).toEqual(['aanya']);
  });

  it('sends unmapped agents to spare desks as temps, in adapter then agent order, and reports the overflow', () => {
    const s = assignSeats({
      rules, staffIds: STAFF, spareSeatIds: SPARES,
      agents: [hermes('chief', 'stamford'), { adapterId: 'claude-code', agentIds: ['paper-site', 'paper-api'] }],
    });
    expect(s.temps).toEqual([
      { personId: tempPersonId('hermes', 'stamford'), adapterId: 'hermes', agentId: 'stamford', seatId: 'seat.spare.1' },
      { personId: tempPersonId('claude-code', 'paper-site'), adapterId: 'claude-code', agentId: 'paper-site', seatId: 'seat.spare.2' },
    ]);
    expect(s.personOf('claude-code', 'paper-site')).toBe('temp-claude-code-paper-site');
    expect(s.unseated).toEqual([{ adapterId: 'claude-code', agentId: 'paper-api' }]);
  });
});
