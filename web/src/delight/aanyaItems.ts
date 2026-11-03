// Ask Aanya's way into the delight layer: the Highlights ceremony (the Weekly review in Sarah mode) and Naina's corner
// (Unattributed activity). Both are actions, so they show in the palette's empty state too.
import type { AanyaItem } from '../aanya/items';
import { creedWords } from './naina/unattributed';

export function delightAanyaItems({ sarah, creedCount }: { sarah: boolean; creedCount: number }): AanyaItem[] {
  const naina = creedWords(creedCount, sarah);
  const known = creedCount ? naina.label.split(': ')[1] ?? '' : 'Nothing unattributed';
  return [
    {
      id: 'action:highlights', kind: 'action', label: sarah ? 'Weekly review' : 'The Highlights',
      detail: sarah ? 'Most cards done, zero errors, fastest approvals: the last 7 days' : 'This week’s awards',
      fields: [[sarah ? 'Weekly review' : 'The Highlights', 1], ['awards weekly review highlights winners trophy digest', 0.8]], action: { type: 'highlights' },
    },
    {
      id: 'action:naina', kind: 'action', label: naina.title, detail: known,
      fields: [[naina.title, 1], ['unattributed anomalies orphaned cards unknown agents drift naina', 0.8]], action: { type: 'naina' },
    },
  ];
}
