// The Highlights ceremony card: Zara at the podium hands out this week's awards, each with the number that won it.
// In Sarah mode it is the same list as a plain "Weekly review" with neutral names and no Zara. The awards come in
// one after another (unless motion is reduced), but they are all there from the start: nothing waits on the show.
import { useEffect } from 'react';
import type { OfficeSnapshot } from '@shared/contract';
import { STAFF_BY_ID } from '@shared/office';
import { Character } from '../../chars/Character';
import { Portrait } from '../../chrome/Portrait';
import { FANFARE_NOTES, playNotes } from '../../notify/chime';
import { useDelight } from '../DelightContext';
import type { Digest, Highlight } from './awards';
import { Trophy } from './Trophy';

type Props = { snapshot: OfficeSnapshot; live: boolean; onOpenPerson: (id: string) => void };

const DAY = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' });
const span = (d: Digest) => `${DAY.format(new Date(d.from))} – ${DAY.format(new Date(d.to))}`;

function Zara() {
  const look = STAFF_BY_ID.get('zara')?.look;
  return (
    <svg className="highlights-podium" viewBox="-30 -46 60 62" aria-hidden="true">
      {look && <g transform="translate(-2 -2) scale(1.25)"><Character look={look} facing="s" /></g>}
      <path d="M-20 -6H20L17 16H-17Z" fill="#6b4a33" />
      <path d="M-22 -9H22V-5H-22Z" fill="#8a6244" />
      <g transform="translate(0 7) scale(0.7)"><Trophy count={1} /></g>
    </svg>
  );
}

function Award({ a, i, sarah, snapshot, live, onOpenPerson }: { a: Highlight; i: number; sarah: boolean } & Props) {
  const person = snapshot.people.find((p) => p.id === a.winnerId);
  return (
    <li className={`highlight${a.trophy ? '' : ' is-warning'}`} style={{ animationDelay: `${0.25 + i * 0.35}s` }} data-highlight={a.id}>
      {!sarah && <svg className="highlight-icon" viewBox="-8 -17 16 19" aria-hidden="true">{a.trophy ? <Trophy count={1} /> : <g><circle cx={0} cy={-8} r={6.5} fill="#d64545" /><text x={0} y={-4.4} textAnchor="middle" fontSize={10} fontWeight={800} fill="#fff">!</text></g>}</svg>}
      <div className="highlight-text">
        <h3>{sarah ? a.neutral : a.title}</h3>
        <button type="button" className="link-btn highlight-winner" onClick={() => onOpenPerson(a.winnerId)}>
          {person && <Portrait person={person} live={live} size="sm" decorative />}
          <strong>{a.winner}</strong>
        </button>
        <p className="highlight-reason">{sarah ? a.reason : `${a.neutral} · ${a.reason}`}</p>
      </div>
    </li>
  );
}

export function HighlightsWindow(props: Props) {
  const { mode, highlights } = useDelight();
  const sarah = mode.sarah;
  useEffect(() => { if (mode.sounds) playNotes(FANFARE_NOTES); }, [mode.sounds]);
  if (highlights.phase === 'loading') return <p className="muted" role="status">{sarah ? 'Counting the week…' : 'Zara is polishing the trophies…'}</p>;
  if (highlights.phase === 'error') return <p className="chat-error" role="alert">{highlights.error}</p>;
  const d = highlights.digest;
  return (
    <div className={`highlights${sarah ? ' is-plain' : ''}`} data-testid="highlights">
      {!sarah && (
        <div className="highlights-stage">
          <Zara />
          <p className="highlights-intro">Welcome to the Highlights! This week’s winners, as measured by actual data.</p>
        </div>
      )}
      <p className="highlights-week">{sarah ? 'The last 7 days' : 'Awards for the last 7 days'} · {span(d)}</p>
      {d.awards.length === 0
        ? <p className="muted">{sarah ? 'Nothing to review yet: no bot did anything this week.' : 'No Highlights this week: nobody did anything award-worthy. Not even Diya.'}</p>
        : <ol className="highlight-list" aria-label={sarah ? 'Weekly review' : 'The Highlights'}>{d.awards.map((a, i) => <Award key={a.id} a={a} i={i} sarah={sarah} {...props} />)}</ol>}
      <p className="highlights-foot muted">
        From {d.counted} bot{d.counted === 1 ? '’s' : 's’'} timelines, cards, scheduled jobs and the ledger
        {d.fromSnapshot ? ` (${d.fromSnapshot} without a timeline counted from the board)` : ''}. Just for fun: nothing here changes who gets work.
      </p>
    </div>
  );
}
