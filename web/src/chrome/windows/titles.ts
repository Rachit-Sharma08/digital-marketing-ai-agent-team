// Window titles: a person's name, "<Area> — <Room> room", "Conference Room — Minutes", HR · Approvals (Sarah's desk),
// Fatima's ledger, the Party Planning Committee calendar, the Highlights or Naina's corner.
import type { OfficeSnapshot } from '@shared/contract';
import { AREAS } from '@shared/office';
import { selectedRoom } from './AreaWindow';
import { MINUTES_TAB, type WindowInfo } from './windowState';

export const APPROVALS_TITLE = 'HR · Approvals';

/** `sarah`: Sarah mode's plain titles for the delight layer's windows. */
export function titleOf(w: WindowInfo, s: OfficeSnapshot | null, sarah = false): string {
  if (w.ref.kind === 'highlights') return sarah ? 'Weekly review' : 'The Highlights';
  if (w.ref.kind === 'naina') return sarah ? 'Unattributed activity' : 'Naina’s corner';
  if (w.ref.kind === 'ledger') return 'Fatima’s ledger';
  if (w.ref.kind === 'approvals') return APPROVALS_TITLE;
  if (w.ref.kind === 'person') {
    const id = w.ref.personId;
    return s?.people.find((p) => p.id === id)?.name ?? id;
  }
  if (w.ref.kind === 'calendar') return 'Party Planning Committee';
  const area = AREAS.find((a) => a.id === (w.ref.kind === 'area' ? w.ref.areaId : ''));
  if (w.ref.kind === 'area' && w.ref.roomId === MINUTES_TAB) return `${area?.name ?? 'Conference Room'} — Minutes`;
  const room = s && w.ref.kind === 'area' ? selectedRoom(s, w.ref.areaId, w.ref.roomId) : undefined;
  return room ? `${area?.name ?? room.areaId} — ${room.name} room` : area?.name ?? 'Room';
}
