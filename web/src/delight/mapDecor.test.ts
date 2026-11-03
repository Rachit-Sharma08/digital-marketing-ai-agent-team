import { describe, expect, it } from 'vitest';
import type { ChipInfo } from '../map/Overlay';
import type { Occupant } from '../map/SeatView';
import { DEMO_SNAPSHOT } from '@shared/fixtures/demo-snapshot';
import { decorateChips, decorateOccupants } from './mapDecor';

const chip = (personId: string, text: string, status: ChipInfo['status']): ChipInfo =>
  ({ personId, x: 0, y: 0, name: personId, text, status, figure: { x: 0, y: 0, w: 1, h: 1 } });

describe('decorateChips', () => {
  const chips = [chip('aisha', 'Idle', 'idle'), chip('naina', 'No bot yet', 'no-bot'), chip('meera', 'Working', 'working')];

  it('says where an idle bot went, and what Naina knows', () => {
    const out = decorateChips(chips, new Map([['aisha', 'coffee']]), { count: 3, sarah: false });
    expect(out.map((c) => c.text)).toEqual(['Idle · getting coffee', 'Knows something (3)', 'Working']);
    expect(decorateChips(chips, new Map(), { count: 2, sarah: true })[1]?.text).toBe('2 unattributed');
  });

  it('changes nothing when there is nothing to say', () => {
    expect(decorateChips(chips, new Map(), { count: 0, sarah: false })).toBe(chips);
  });
});

describe('decorateOccupants', () => {
  const naina = DEMO_SNAPSHOT.people.find((p) => p.id === 'naina')!;
  const occ: Occupant = { person: naina, presence: { status: 'no-bot' }, label: 'Naina Desai — no bot yet', away: false, walking: false };
  it('adds Naina\'s corner to his label', () => {
    const out = decorateOccupants(new Map([['seat.naina', occ]]), { count: 3, sarah: false });
    expect(out.get('seat.naina')?.label).toBe('Naina Desai — no bot yet — Naina’s corner: 3 things nobody can explain');
    expect(decorateOccupants(new Map([['seat.naina', occ]]), { count: 0, sarah: false }).get('seat.naina')?.label).toBe('Naina Desai — no bot yet');
  });
});
