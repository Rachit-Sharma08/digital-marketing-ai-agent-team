import { describe, expect, it } from 'vitest';
import { buildOffice, defaultOfficeSetup } from '../src/office/office.ts';
import { mergeSeatRules } from '../src/office/seating.ts';
import type { AdapterReading } from '../src/office/compose.ts';
import type { AdapterSnapshot } from '../src/adapters/types.ts';
import { DEFAULT_SEATS } from '../src/roster.ts';

const NOW = 1_800_000_000;
const iso = (s: number) => new Date(s * 1000).toISOString();
const HERMES_CAPS = { chat: true, createTask: true, approvals: false, pause: false, stop: false };
const NONE = { chat: false, createTask: false, approvals: false, pause: false, stop: false };

const hermesSnapshot: AdapterSnapshot = {
  agents: [{ id: 'campaigns', name: 'Meera Kaur', role: 'Campaigns' }, { id: 'health', name: 'Hank', role: 'Personal health' }],
  presence: { campaigns: { status: 'working', activity: 'Selling paper' }, health: { status: 'idle' } },
  tasks: [{ id: 't_1', title: 'Old card', status: 'todo', ownerAgentId: 'campaigns', shared: false, updatedAt: iso(NOW - 600) }],
  rooms: [
    { id: 'ops', name: 'Ops', kind: 'ops', areaId: 'conference', hermesRoom: 'Ops', memberAgentIds: ['campaigns'] },
    { id: 'dm-campaigns', name: 'Direct line', kind: 'dm', hermesRoom: 'DM', memberAgentIds: ['campaigns'] },
    { id: 'dm-health', name: 'Direct line', kind: 'dm', hermesRoom: 'DM', memberAgentIds: ['health'] },
  ],
  jobs: { campaigns: [{ name: 'Daily outreach', schedule: '0 9 * * *', enabled: true }] },
};
const webhookSnapshot: AdapterSnapshot = {
  agents: [{ id: 'deploy-bot', name: 'Deploy Bot', role: 'Ships releases' }, { id: 'nightly', role: 'Webhook agent' }],
  presence: {
    'deploy-bot': { status: 'needs-input', activity: 'Approve deploy? token sk-ant-abcdefghijklmnop1234 in /Users/someone/x' },
    nightly: { status: 'working' },
  },
  tasks: [{ id: 'webhook:deploy-bot:42', title: 'Deploy v1.2', status: 'doing', ownerAgentId: 'deploy-bot', shared: false, updatedAt: iso(NOW - 60) }],
  rooms: [
    { id: 'webhook-deploy-bot', name: 'Direct line', kind: 'dm', memberAgentIds: ['deploy-bot'] },
    { id: 'webhook-nightly', name: 'Direct line', kind: 'dm', memberAgentIds: ['nightly'] },
    { id: 'ops', name: 'Not the real Ops', kind: 'ops', memberAgentIds: ['deploy-bot'] },
  ],
};
const readings: AdapterReading[] = [
  { adapter: { id: 'hermes', kind: 'hermes', label: 'Hermes', capabilities: HERMES_CAPS }, snapshot: hermesSnapshot },
  { adapter: { id: 'webhook', kind: 'webhook', label: 'Webhook', capabilities: NONE }, snapshot: webhookSnapshot },
];

describe('buildOffice (adapters + seating -> OfficeSnapshot)', () => {
  const setup = defaultOfficeSetup(mergeSeatRules(DEFAULT_SEATS, { simran: { adapter: 'webhook', agent: 'deploy-bot', role: 'Release manager' } }));
  const { snapshot: snap, roomOwners } = buildOffice(readings, setup, NOW);
  const person = (id: string) => snap.people.find((p) => p.id === id);

  it('keeps all 23 characters, gives seated ones their bot and appends temps', () => {
    expect(snap.people.slice(0, 23).map((p) => p.id)).toEqual(setup.people.map((p) => p.id));
    expect(person('meera')).toMatchObject({ name: 'Meera Kaur', bot: { profile: 'campaigns', role: 'Campaigns', adapter: 'hermes', capabilities: HERMES_CAPS } });
    expect(person('simran')).toMatchObject({ name: 'Simran Gill', persona: 'Deploy Bot', bot: { profile: 'deploy-bot', role: 'Release manager', adapter: 'webhook', capabilities: NONE } });
    expect(person('aanya')?.bot).toBeUndefined(); // chief is not reported by this reading
    expect(snap.people.slice(23)).toEqual([expect.objectContaining({
      id: 'temp-webhook-nightly', name: 'nightly', title: 'Temp · Webhook', seatId: 'seat.spare.1', bot: expect.objectContaining({ profile: 'nightly', adapter: 'webhook' }),
    })]);
  });

  it('keeps a keepName character\'s own name and shows the agent\'s name as its persona', () => {
    expect(person('isabella')).toMatchObject({ name: 'Isabella D Costa', persona: 'Hank', bot: { profile: 'health' } });
  });

  it('lets only Hermes personas rename a character: other agents keep the character\'s name', () => {
    expect(person('meera')?.name).toBe('Meera Kaur'); // Hermes persona
    expect(person('simran')).toMatchObject({ name: 'Simran Gill', persona: 'Deploy Bot' });
    expect(snap.rooms.find((r) => r.id === 'webhook-deploy-bot')?.name).toBe('Direct line: Simran Gill');
  });

  it('gives presence by person: the agent\'s, no-bot for the rest, scrubbed', () => {
    expect(snap.presence.meera).toEqual({ status: 'working', activity: 'Selling paper' });
    expect(snap.presence.simran?.status).toBe('needs-input');
    expect(snap.presence.simran?.activity).not.toMatch(/sk-ant|\/Users\//);
    expect(snap.presence.aanya).toEqual({ status: 'no-bot' });
    expect(snap.presence['temp-webhook-nightly']).toEqual({ status: 'working' });
    expect(Object.keys(snap.presence)).toHaveLength(24);
  });

  it('shows a configured agent that has not reported as offline', () => {
    const silent = buildOffice(readings, defaultOfficeSetup(mergeSeatRules({}, { diya: { adapter: 'webhook', agent: 'late-bot' } })), NOW);
    expect(silent.snapshot.presence.diya).toEqual({ status: 'offline', activity: 'Not reporting yet' });
    expect(silent.snapshot.people.find((p) => p.id === 'diya')).toMatchObject({ name: 'Diya Patel', bot: { profile: 'late-bot', role: 'Webhook agent' } });
  });

  it('maps room members to people; direct lines sit at their member\'s desk and are named after them', () => {
    expect(snap.rooms.find((r) => r.id === 'dm-campaigns')).toEqual({
      id: 'dm-campaigns', name: 'Direct line: Meera Kaur', areaId: 'bullpen', kind: 'dm', hermesRoom: 'DM', memberIds: ['meera'],
      adapter: 'hermes', capabilities: HERMES_CAPS,
    });
    expect(snap.rooms.find((r) => r.id === 'webhook-deploy-bot')).toMatchObject({ areaId: 'bullpen', memberIds: ['simran'], capabilities: NONE });
    expect(snap.rooms.find((r) => r.id === 'webhook-nightly')).toMatchObject({ memberIds: ['temp-webhook-nightly'] });
  });

  it('keeps the first adapter\'s room when two claim the same id, and records who owns each room', () => {
    expect(snap.rooms.filter((r) => r.id === 'ops')).toEqual([expect.objectContaining({ name: 'Ops', adapter: 'hermes', memberIds: ['meera'] })]);
    expect(roomOwners.get('ops')).toBe('hermes');
    expect(roomOwners.get('webhook-deploy-bot')).toBe('webhook');
  });

  it('moves an agent whose desk was cleared to a spare desk, and drops its direct line when no desk is left', () => {
    const noIsabella = defaultOfficeSetup(mergeSeatRules(DEFAULT_SEATS, { isabella: null }));
    expect(buildOffice(readings, noIsabella, NOW).snapshot.rooms.find((r) => r.id === 'dm-health')?.memberIds).toEqual(['temp-hermes-health']);
    const full = buildOffice(readings, { ...noIsabella, spareSeatIds: [] }, NOW).snapshot;
    expect(full.rooms.find((r) => r.id === 'dm-health')).toBeUndefined();
    expect(full.people.find((p) => p.id === 'temp-hermes-health')).toBeUndefined();
  });

  it('merges tasks newest first with owners as people, and jobs by person', () => {
    expect(snap.tasks.map((t) => [t.id, t.ownerId])).toEqual([['webhook:deploy-bot:42', 'simran'], ['t_1', 'meera']]);
    expect(snap.tasks[0]).not.toHaveProperty('ownerAgentId');
    expect(snap.jobs).toEqual({ meera: [{ name: 'Daily outreach', schedule: '0 9 * * *', enabled: true }] });
  });

  it('lists the adapters with their capabilities', () => {
    expect(snap.adapters).toEqual([
      { id: 'hermes', kind: 'hermes', label: 'Hermes', capabilities: HERMES_CAPS, agents: 2 },
      { id: 'webhook', kind: 'webhook', label: 'Webhook', capabilities: NONE, agents: 2 },
    ]);
    expect(snap.generatedAt).toBe(iso(NOW));
  });
});
