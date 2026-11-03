// Demo-mode Conference Room minutes (no server): invented meetings around `now`, shaped exactly like
// GET /api/meetings. A Council session in progress, a blocked and a waiting shared card, and two adjourned meetings.
import type { Meeting, MeetingsView, MinutesLine } from '../contract';

type L = readonly [minutesAgo: number, kind: MinutesLine['kind'], who: string, text: string];
const LABELS = new Set(['You', 'Council', 'Agents Ka Ghar']);

function meeting(now: number, m: Omit<Meeting, 'startedAt' | 'endedAt' | 'lines'> & { start: number; end?: number; lines: readonly L[] }): Meeting {
  const iso = (minutesAgo: number) => new Date(now - minutesAgo * 60_000).toISOString();
  const { start, end, lines, ...rest } = m;
  return {
    ...rest, startedAt: iso(start), ...(end === undefined ? {} : { endedAt: iso(end) }),
    lines: lines.map(([ago, kind, who, text]) => ({ at: iso(ago), kind, ...(LABELS.has(who) ? { author: who } : who ? { personId: who } : {}), text })),
  };
}

const DAY = 24 * 60;
const pricing = (title: string) => `Q4 pricing: ${title}`;
const highlights = (title: string) => `Highlights budget: ${title}`;

export function demoMeetings(now: number): MeetingsView {
  const iso = (ms: number) => new Date(ms).toISOString();
  const meetings: Meeting[] = [
    meeting(now, {
      id: 'demo-council-q4', kind: 'council', title: 'Council 2026-10-13', roomId: 'council', status: 'in-session', start: 18,
      participantIds: ['aanya', 'zara', 'fatima', 'sadiq', 'sophia', 'tara'],
      agenda: [
        { taskId: 'demo-c1', title: pricing('round 1 marketing'), ownerId: 'zara', status: 'done' },
        { taskId: 'demo-c2', title: pricing('round 1 finance'), ownerId: 'fatima', status: 'doing' },
        { taskId: 'demo-c3', title: pricing('round 1 technology'), ownerId: 'sadiq', status: 'blocked' },
        { taskId: 'demo-c4', title: pricing('round 1 strategy'), ownerId: 'sophia', status: 'done' },
        { taskId: 'demo-c5', title: pricing('round 1 AI'), ownerId: 'tara', status: 'todo' },
        { taskId: 'demo-c6', title: pricing('chair'), ownerId: 'aanya', status: 'todo' },
      ],
      lines: [
        [30, 'opened', 'Council', 'Session opened with 6 items on the agenda'],
        [18, 'started', 'zara', 'Picked up “Q4 pricing: round 1 marketing”'],
        [18, 'started', 'fatima', 'Picked up “Q4 pricing: round 1 finance”'],
        [17, 'started', 'sophia', 'Picked up “Q4 pricing: round 1 strategy”'],
        [17, 'started', 'sadiq', 'Picked up “Q4 pricing: round 1 technology”'],
        [12, 'result', 'zara', 'Raise prices 5%. Nobody ever lost money charging more for great paper.'],
        [12, 'status', 'zara', 'Finished “Q4 pricing: round 1 marketing”'],
        [10, 'result', 'sophia', 'Corporate can live with 3%. Anything above that needs a call with the board.'],
        [10, 'status', 'sophia', 'Finished “Q4 pricing: round 1 strategy”'],
        [9, 'status', 'sadiq', 'The run on “Q4 pricing: round 1 technology” timed out'],
        [8, 'comment', 'aanya', 'Fatima, your numbers are the last ones we need before I sum up.'],
        [5, 'comment', 'fatima', 'Margins support 3%, not 5%. I have prepared a binder.'],
      ],
    }),
    meeting(now, {
      id: 'demo-task-fleet', kind: 'shared-task', title: 'Weekly fleet health check', roomId: 'ops', status: 'blocked', start: 55,
      participantIds: ['sadiq', 'aanya'], agenda: [{ taskId: 'task-fleet-health', title: 'Weekly fleet health check', ownerId: 'sadiq', status: 'blocked' }],
      lines: [
        [70, 'opened', 'Agents Ka Ghar', 'Card opened'],
        [55, 'started', 'sadiq', 'Picked it up'],
        [12, 'status', 'sadiq', 'The run crashed'],
        [9, 'status', '', 'Blocked: Gateway timeout on the deploy check'],
        [7, 'comment', 'aanya', 'Sadiq, can you look at this before the Council wraps up?'],
        [4, 'comment', 'sadiq', 'On it. The gateway restarted at 10:51; checking the deploy logs.'],
      ],
    }),
    meeting(now, {
      id: 'demo-task-stamford', kind: 'shared-task', title: 'Hand off the Nashua leads to Outreach', roomId: 'ops', status: 'scheduled', start: 30,
      participantIds: ['aanya', 'meera'], agenda: [{ taskId: 'task-ops-handoffs', title: 'Hand off the Nashua leads to Outreach', ownerId: 'aanya', status: 'todo' }],
      lines: [
        [30, 'opened', 'You', 'Card opened'],
        [26, 'comment', 'meera', 'Send them over. I will qualify every one of them by end of day. Bears will not be involved.'],
      ],
    }),
    meeting(now, {
      id: 'demo-task-paper', kind: 'shared-task', title: 'Restock the conference room paper', roomId: 'ops', status: 'adjourned',
      start: 2 * DAY + 55, end: 2 * DAY + 20, participantIds: ['meera', 'priya'],
      agenda: [{ taskId: 'demo-paper', title: 'Restock the conference room paper', ownerId: 'meera', status: 'done' }],
      lines: [
        [2 * DAY + 60, 'opened', 'Agents Ka Ghar', 'Card opened'],
        [2 * DAY + 55, 'started', 'meera', 'Picked it up'],
        [2 * DAY + 40, 'comment', 'priya', 'Can we get the pastel copy paper this time?? It is so much cuter.'],
        [2 * DAY + 21, 'result', 'meera', 'Restocked 12 reams of 20 lb bright white. Pastel is not a business colour.'],
        [2 * DAY + 20, 'status', 'meera', 'Finished'],
        [2 * DAY + 20, 'closed', '', 'Adjourned'],
      ],
    }),
    meeting(now, {
      id: 'demo-council-highlights', kind: 'council', title: 'Council 2026-10-09', roomId: 'council', status: 'adjourned',
      start: 4 * DAY + 60, end: 4 * DAY + 12, participantIds: ['aanya', 'zara', 'fatima', 'sophia', 'tara'],
      agenda: [
        { taskId: 'demo-d1', title: highlights('round 1 marketing'), ownerId: 'zara', status: 'done' },
        { taskId: 'demo-d2', title: highlights('round 1 finance'), ownerId: 'fatima', status: 'done' },
        { taskId: 'demo-d3', title: highlights('round 1 strategy'), ownerId: 'sophia', status: 'done' },
        { taskId: 'demo-d4', title: highlights('round 1 AI'), ownerId: 'tara', status: 'done' },
        { taskId: 'demo-d5', title: highlights('minutes'), ownerId: 'aanya', status: 'done' },
      ],
      lines: [
        [4 * DAY + 62, 'opened', 'Council', 'Session opened with 5 items on the agenda'],
        [4 * DAY + 60, 'started', 'zara', 'Picked up “Highlights budget: round 1 marketing”'],
        [4 * DAY + 60, 'started', 'fatima', 'Picked up “Highlights budget: round 1 finance”'],
        [4 * DAY + 50, 'result', 'zara', 'Bigger venue, bigger trophies. Chili’s is a classic for a reason.'],
        [4 * DAY + 46, 'result', 'fatima', 'Approved at $250. No limbo, no streamers, no exceptions.'],
        [4 * DAY + 41, 'result', 'sophia', 'Keep it under two hours and nobody drives home after the margaritas.'],
        [4 * DAY + 38, 'result', 'tara', 'Livestream it. The engagement would be insane.'],
        [4 * DAY + 30, 'comment', 'fatima', 'Tara, no.'],
        [4 * DAY + 14, 'result', 'aanya', 'Agreed: Chili’s, $250, two hours, no livestream. Zara hosts.'],
        [4 * DAY + 12, 'closed', '', 'Adjourned'],
      ],
    }),
  ];
  const newestFirst = [...meetings].sort((a, b) => (a.startedAt < b.startedAt ? 1 : -1));
  return { from: iso(now - 14 * DAY * 60_000), to: iso(now + DAY * 60_000), generatedAt: iso(now), meetings: newestFirst };
}
