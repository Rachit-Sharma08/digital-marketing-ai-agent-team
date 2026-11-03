// What the delight layer adds to the map's words: an idle bot's chip says where it went, and Naina's chip and label
// say what he knows (plainly, in Sarah mode). Labels never change for trips, so a bot is always found by its status.
import type { ChipInfo } from '../map/Overlay';
import type { Occupant } from '../map/SeatView';
import { TRIP_WORDS, type TripKind } from './ambient/trips';
import { NAINA_DESK } from './naina/NainaNote';
import { creedWords } from './naina/unattributed';

type Naina = { count: number; sarah: boolean };

export function decorateChips(chips: readonly ChipInfo[], trips: ReadonlyMap<string, TripKind>, naina: Naina): readonly ChipInfo[] {
  if (!trips.size && !naina.count) return chips;
  return chips.map((c) => {
    const trip = trips.get(c.personId);
    if (trip) return { ...c, text: `Idle · ${TRIP_WORDS[trip]}` };
    if (c.personId === NAINA_DESK && naina.count) return { ...c, text: creedWords(naina.count, naina.sarah).chip };
    return c;
  });
}

export function decorateOccupants(occupants: ReadonlyMap<string, Occupant>, naina: Naina): ReadonlyMap<string, Occupant> {
  if (!naina.count) return occupants;
  return new Map([...occupants].map(([seatId, o]) => [seatId, o.person.id === NAINA_DESK ? { ...o, label: `${o.label} — ${creedWords(naina.count, naina.sarah).label}` } : o]));
}
