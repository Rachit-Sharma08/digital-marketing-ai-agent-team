import { describe, expect, it } from 'vitest';
import type { Placement } from '../../office/placement';
import { SPOTS, TRIP_SLOT_MS, tripAt, tripsFor, withTrips } from './trips';

const T0 = Date.parse('2026-10-13T09:00:00.000Z');
const scan = (personId: string, seed = 1) => Array.from({ length: 24 * 60 }, (_, m) => tripAt(personId, T0 + m * 60_000, seed));

describe('tripAt (seeded, rare)', () => {
  it('is the same for the same person, minute and seed', () => {
    expect(scan('aisha')).toEqual(scan('aisha'));
    expect(scan('aisha', 2)).not.toEqual(scan('aisha', 1));
  });

  it('keeps an idle bot at its desk most of the time, with short trips of 3 to 5 minutes', () => {
    const minutes = scan('aisha');
    const away = minutes.filter(Boolean).length;
    expect(away).toBeGreaterThan(0);
    expect(away / minutes.length).toBeLessThan(0.12);
    for (const t of minutes) if (t) expect(t.end - t.start).toBeGreaterThanOrEqual(3 * 60_000);
    for (const t of minutes) if (t) expect(t.end - t.start).toBeLessThanOrEqual(5 * 60_000);
    for (const t of minutes) if (t) expect(Math.floor(t.start / TRIP_SLOT_MS)).toBe(Math.floor((t.end - 1) / TRIP_SLOT_MS));
  });

  it('goes for coffee, to the vending machine or to the water cooler', () => {
    const kinds = new Set(['aisha', 'neha', 'priya', 'tara', 'sophia', 'maya'].flatMap((p) => scan(p).flatMap((t) => (t ? [t.kind] : []))));
    expect([...kinds].sort()).toEqual(['coffee', 'cooler', 'vending']);
  });
});

describe('tripsFor / withTrips', () => {
  const placements: Placement[] = [
    { personId: 'aisha', seatId: 'seat.aisha', away: false },
    { personId: 'neha', seatId: 'seat.neha', away: false },
    { personId: 'zara', seatId: 'seat.conf.s1', away: true, roomId: 'council' },
  ];

  it('only idle bots take trips', () => {
    const at = Array.from({ length: 1440 }, (_, m) => T0 + m * 60_000).find((t) => tripAt('aisha', t));
    expect(at).toBeDefined();
    expect(tripsFor(['aisha'], at!).get('aisha')).toBe(tripAt('aisha', at!)?.kind);
    expect(tripsFor([], at!).size).toBe(0);
  });

  it('moves a bot on a trip to a free spot of the right kind, and leaves meetings alone', () => {
    const moved = withTrips(placements, new Map([['aisha', 'coffee'], ['neha', 'coffee'], ['zara', 'vending']]));
    const coffee = SPOTS.filter((s) => s.kind === 'coffee').map((s) => s.seat.id);
    expect(moved[0]).toEqual({ personId: 'aisha', seatId: coffee[0], away: true });
    expect(moved[1]).toEqual({ personId: 'neha', seatId: coffee[1], away: true });
    expect(moved[2]).toBe(placements[2]);
    const crowd = withTrips([...placements, { personId: 'priya', seatId: 'seat.priya', away: false }], new Map([['aisha', 'coffee'], ['neha', 'coffee'], ['priya', 'coffee']]));
    expect(crowd[3]).toEqual({ personId: 'priya', seatId: 'seat.priya', away: false }); // no spot left: stays put
  });

  it('spots stand on the floor (no chair) in the kitchen, the break room and by the coolers', () => {
    expect(SPOTS.every((s) => s.seat.chair === 'none' && s.seat.kind === 'spot')).toBe(true);
    expect(new Set(SPOTS.map((s) => s.seat.areaId))).toEqual(new Set(['kitchen', 'breakroom', 'annex']));
  });
});
