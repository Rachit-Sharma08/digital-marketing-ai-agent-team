import { describe, expect, it } from 'vitest';
import { DEMO_SNAPSHOT } from '@shared/fixtures/demo-snapshot';
import { parseEvent, parseMessages, parseSnapshot } from './guards';

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));

describe('parseSnapshot', () => {
  it('accepts a valid snapshot unchanged', () => {
    expect(parseSnapshot(clone(DEMO_SNAPSHOT))).toEqual(DEMO_SNAPSHOT);
  });

  it('rejects things that are not snapshots', () => {
    expect(parseSnapshot(null)).toBeNull();
    expect(parseSnapshot('nope')).toBeNull();
    expect(parseSnapshot({ people: 'x', presence: {}, rooms: [], tasks: [] })).toBeNull();
  });

  it('drops invalid people, presence entries, rooms and tasks instead of failing', () => {
    const raw = clone(DEMO_SNAPSHOT) as unknown as Record<string, unknown>;
    (raw.people as unknown[]).push({ id: 'ghost' });
    (raw.presence as Record<string, unknown>).meera = { status: 'partying' };
    (raw.rooms as unknown[]).push({ id: 7 });
    (raw.tasks as unknown[]).push({ id: 'bad', status: 'later' });
    const snap = parseSnapshot(raw)!;
    expect(snap.people).toHaveLength(23);
    expect(snap.presence.meera).toBeUndefined();
    expect(snap.rooms).toHaveLength(DEMO_SNAPSHOT.rooms.length);
    expect(snap.tasks).toHaveLength(DEMO_SNAPSHOT.tasks.length);
  });

  it('keeps a valid belt colour on a look and drops a bad one', () => {
    const raw = clone(DEMO_SNAPSHOT);
    const isabella = raw.people.findIndex((p) => p.id === 'isabella');
    const neha = raw.people.findIndex((p) => p.id === 'neha');
    raw.people[isabella].look = { ...raw.people[isabella].look, belt: '#111111' };
    raw.people[neha].look = { ...raw.people[neha].look, belt: 'url(#x)' };
    const snap = parseSnapshot(raw)!;
    expect(snap.people[isabella].look.belt).toBe('#111111');
    expect(snap.people[neha].look).not.toHaveProperty('belt');
  });

  it('passes a Hermes persona name through, capped', () => {
    const raw = clone(DEMO_SNAPSHOT);
    const isabella = raw.people.findIndex((p) => p.id === 'isabella');
    raw.people[isabella] = { ...raw.people[isabella], persona: 'Hank' };
    expect(parseSnapshot(raw)!.people[isabella].persona).toBe('Hank');
    raw.people[isabella] = { ...raw.people[isabella], persona: 'K'.repeat(500) };
    expect(parseSnapshot(raw)!.people[isabella].persona!.length).toBeLessThanOrEqual(120);
  });

  it('caps over-long display strings', () => {
    const raw = clone(DEMO_SNAPSHOT);
    raw.presence.meera = { status: 'working', activity: 'a'.repeat(5000) };
    expect(parseSnapshot(raw)!.presence.meera.activity!.length).toBeLessThanOrEqual(500);
  });
});

describe('parseSnapshot capabilities', () => {
  it('keeps what the server allows', () => {
    expect(parseSnapshot({ ...clone(DEMO_SNAPSHOT), capabilities: { writes: true } })?.capabilities).toEqual({ writes: true });
    expect(parseSnapshot({ ...clone(DEMO_SNAPSHOT), capabilities: { writes: false } })?.capabilities).toEqual({ writes: false });
  });

  it('treats anything but a literal true as read-only, and leaves it out when absent', () => {
    expect(parseSnapshot({ ...clone(DEMO_SNAPSHOT), capabilities: { writes: 'yes' } })?.capabilities).toEqual({ writes: false });
    expect(parseSnapshot({ ...clone(DEMO_SNAPSHOT), capabilities: 'all' })?.capabilities).toBeUndefined();
    expect(parseSnapshot(clone(DEMO_SNAPSHOT))).not.toHaveProperty('capabilities');
  });
});

describe('parseSnapshot jobs', () => {
  it('keeps valid scheduled jobs per person and drops malformed ones', () => {
    const raw = clone(DEMO_SNAPSHOT) as unknown as Record<string, unknown>;
    raw.jobs = { aanya: [{ name: 'Digest', schedule: '0 8 * * *', enabled: true }, { name: 'bad' }], ghost: 'x' };
    const snap = parseSnapshot(raw)!;
    expect(snap.jobs).toEqual({ aanya: [{ name: 'Digest', schedule: '0 8 * * *', enabled: true }] });
  });

  it('leaves jobs out when the server sends none', () => {
    const raw = clone(DEMO_SNAPSHOT) as unknown as Record<string, unknown>;
    delete raw.jobs;
    expect(parseSnapshot(raw)!.jobs).toBeUndefined();
  });
});

describe('parseEvent', () => {
  it('parses a partial presence update', () => {
    expect(parseEvent({ presence: { meera: { status: 'idle' } } })).toEqual({ presence: { meera: { status: 'idle' } } });
  });

  it('parses a JSON string payload', () => {
    expect(parseEvent('{"tasks":[]}')).toEqual({ tasks: [] });
  });

  it('rejects junk', () => {
    expect(parseEvent('not json')).toBeNull();
    expect(parseEvent(42)).toBeNull();
    expect(parseEvent({ presence: 'x' })).toEqual({});
  });
});

describe('parseMessages', () => {
  it('keeps valid chat messages only', () => {
    const msgs = parseMessages([
      { id: 'm1', roomId: 'ops', authorId: 'you', text: 'hi', at: '2026-10-13T15:00:00.000Z' },
      { id: 'm2', roomId: 'ops', text: 'no author' },
    ]);
    expect(msgs.map((m) => m.id)).toEqual(['m1']);
    expect(parseMessages({ messages: [] })).toEqual([]);
  });
});

describe('parseSnapshot adapters and capabilities (agent adapter layer)', () => {
  const caps = { chat: false, createTask: false, approvals: false, pause: false, stop: false };

  it('accepts the needs-input status', () => {
    const raw = clone(DEMO_SNAPSHOT);
    raw.presence.meera = { status: 'needs-input', activity: 'Wants to use Bash' };
    expect(parseSnapshot(raw)!.presence.meera).toEqual({ status: 'needs-input', activity: 'Wants to use Bash' });
  });

  it('keeps a bot\'s adapter and capability flags, and a room\'s', () => {
    const raw = clone(DEMO_SNAPSHOT) as unknown as { people: Record<string, unknown>[]; rooms: Record<string, unknown>[] };
    const meera = raw.people.findIndex((p) => p.id === 'meera');
    raw.people[meera] = { ...raw.people[meera], bot: { profile: 'deploy-bot', role: 'Ships', adapter: 'webhook', capabilities: caps } };
    raw.rooms[0] = { ...raw.rooms[0], adapter: 'webhook', capabilities: caps };
    const snap = parseSnapshot(raw)!;
    expect(snap.people[meera]?.bot).toEqual({ profile: 'deploy-bot', role: 'Ships', adapter: 'webhook', capabilities: caps });
    expect(snap.rooms[0]).toMatchObject({ adapter: 'webhook', capabilities: caps });
  });

  it('drops malformed capability flags instead of guessing them', () => {
    const raw = clone(DEMO_SNAPSHOT) as unknown as { people: Record<string, unknown>[]; rooms: Record<string, unknown>[] };
    const meera = raw.people.findIndex((p) => p.id === 'meera');
    raw.people[meera] = { ...raw.people[meera], bot: { profile: 'campaigns', role: 'x', capabilities: { chat: 'yes' } } };
    raw.rooms[0] = { ...raw.rooms[0], capabilities: 'all' };
    const snap = parseSnapshot(raw)!;
    expect(snap.people[meera]?.bot).toEqual({ profile: 'campaigns', role: 'x' });
    expect(snap.rooms[0]).not.toHaveProperty('capabilities');
  });

  it('lists the adapters the server runs', () => {
    const raw = clone(DEMO_SNAPSHOT) as unknown as Record<string, unknown>;
    raw.adapters = [{ id: 'webhook', kind: 'webhook', label: 'Webhook', capabilities: caps, agents: 2 }, { id: 7 }];
    expect(parseSnapshot(raw)!.adapters).toEqual([{ id: 'webhook', kind: 'webhook', label: 'Webhook', capabilities: caps, agents: 2 }]);
  });
});
