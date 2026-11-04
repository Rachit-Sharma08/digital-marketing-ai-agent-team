// The dispatch desk: one brief, handed to the boss or straight to a teammate. The server routes it (or takes the
// chosen desk), answers with that desk's model, and still names the assignee when the model is unavailable.
import { useEffect, useRef, useState } from 'react';
import { STAFF_BY_ID } from '@shared/office';

type TeamMember = { kind: string; person: string; title: string };
type AssignedBy = 'boss' | 'direct' | 'self';

type Reply = {
  agent: { kind: string; person: string; title: string; reason: string; assignedBy?: AssignedBy };
  model: { tier: string; provider: string; id: string; label: string };
  answer: string;
  tookMs: number;
};
type ErrorBody = { error?: string; agent?: Reply['agent'] };

type Entry = {
  id: string;
  text: string;
  person: string;
  title: string;
  assignedBy: AssignedBy;
  status: 'done' | 'waiting';
  at: number;
};

type Result = Reply['agent'] & { answer?: string; error?: string; modelLabel?: string; tookMs?: number };

const EXAMPLES = ['Instagram par Diwali sale ke 3 captions likho', 'Meri bakery landing page ka SEO audit karo', 'Next month ka content plan banao'];
const STORE = 'akg.dispatch.log';
const MAX_LOG = 4;

const nameOf = (id: string) => STAFF_BY_ID.get(id)?.name ?? id;

function loadLog(): Entry[] {
  try {
    const raw = JSON.parse(localStorage.getItem(STORE) ?? '[]') as unknown;
    if (!Array.isArray(raw)) return [];
    return raw.filter((e): e is Entry => {
      const v = e as Partial<Entry> | null;
      return Boolean(v && typeof v.text === 'string' && typeof v.person === 'string' && typeof v.title === 'string'
        && (v.status === 'done' || v.status === 'waiting'));
    }).slice(0, MAX_LOG);
  } catch {
    return [];
  }
}

function saveLog(entries: Entry[]): void {
  try { localStorage.setItem(STORE, JSON.stringify(entries.slice(0, MAX_LOG))); } catch { /* private mode */ }
}

export function DispatchDock({ writable, open, onClose, onOpenPerson }: {
  writable: boolean; open: boolean; onClose: () => void; onOpenPerson: (id: string) => void;
}) {
  const [text, setText] = useState('');
  const [target, setTarget] = useState('');
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [log, setLog] = useState<Entry[]>(loadLog);
  const input = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    let alive = true;
    fetch('/api/agents', { headers: { accept: 'application/json' } })
      .then((r) => (r.ok ? r.json() : null))
      .then((body: { team?: TeamMember[] } | null) => {
        if (!alive || !body || !Array.isArray(body.team)) return;
        const list = body.team.filter((m) => m && typeof m.person === 'string' && typeof m.title === 'string');
        setTeam([...list].sort((a, b) => (a.person === 'zara' ? -1 : b.person === 'zara' ? 1 : 0)));
      })
      .catch(() => { /* the dock still works in auto mode */ });
    return () => { alive = false; };
  }, []);

  useEffect(() => { if (open) input.current?.focus(); }, [open]);

  async function send() {
    const value = text.trim();
    if (!value || busy || !writable) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch('/api/agents/command', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text: value, ...(target ? { person: target } : {}) }),
      });
      const body = (await res.json().catch(() => null)) as Reply | ErrorBody | null;
      if (!res.ok) {
        const agent = (body as ErrorBody | null)?.agent;
        const message = (body as ErrorBody | null)?.error ?? `Request failed (${res.status})`;
        if (agent) {
          const assignedBy = agent.assignedBy ?? (target ? 'direct' : 'boss');
          setResult({ ...agent, assignedBy, error: message });
          const entry: Entry = { id: `${Date.now()}`, text: value, person: agent.person, title: agent.title, assignedBy, status: 'waiting', at: Date.now() };
          setLog((old) => { const next = [entry, ...old].slice(0, MAX_LOG); saveLog(next); return next; });
        } else {
          setError(message);
        }
        return;
      }
      const reply = body as Reply;
      setResult({ ...reply.agent, assignedBy: reply.agent.assignedBy ?? (target ? 'direct' : 'boss'), answer: reply.answer, modelLabel: reply.model.label, tookMs: reply.tookMs });
      const entry: Entry = {
        id: `${Date.now()}`, text: value, person: reply.agent.person, title: reply.agent.title,
        assignedBy: reply.agent.assignedBy ?? (target ? 'direct' : 'boss'), status: 'done', at: Date.now(),
      };
      setLog((old) => { const next = [entry, ...old].slice(0, MAX_LOG); saveLog(next); return next; });
      setText('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reach the server.');
    } finally {
      setBusy(false);
    }
  }

  const note = result?.assignedBy === 'direct'
    ? 'You sent this straight to the desk.'
    : result?.assignedBy === 'self'
      ? 'The boss model did not answer, so this desk took the brief itself.'
      : 'Zara reviewed the brief and handed it to this desk.';

  return (
    <aside className={`dispatch${open ? ' is-open' : ''}`} aria-label="Dispatch desk">
      <header className="dispatch-head">
        <div className="dispatch-head-row">
          <p className="dispatch-kicker">Dispatch desk</p>
          <button type="button" className="dispatch-close" aria-label="Close the dispatch desk" onClick={onClose}>×</button>
        </div>
        <h2>Give the team a job</h2>
        <p className="dispatch-sub">One brief. Zara reads it and picks the right desk — and if her desk is down, the specialist takes it directly.</p>
      </header>

      <form className="dispatch-form" onSubmit={(e) => { e.preventDefault(); void send(); }}>
        <label className="sr-only" htmlFor="dispatch-text">The task</label>
        <textarea
          id="dispatch-text"
          ref={input}
          rows={3}
          value={text}
          placeholder="Kaam likho… (jaise: mere bakery ke liye 3 Instagram caption likho)"
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send(); } }}
        />
        <div className="dispatch-target">
          <label htmlFor="dispatch-person">Assign to</label>
          <select id="dispatch-person" value={target} onChange={(e) => setTarget(e.target.value)}>
            <option value="">Auto — Zara decides</option>
            {team.map((m) => <option key={m.person} value={m.person}>{nameOf(m.person)} — {m.title}</option>)}
          </select>
        </div>
        <button className="dispatch-send" type="submit" disabled={!writable || busy || !text.trim()}>
          {busy ? 'Handing over…' : 'Hand it over'}
        </button>
        {!writable && <p className="dispatch-note">Read-only server: start it with <code>--allow-writes</code> to dispatch tasks.</p>}
        {!result && !error && writable && (
          <p className="dispatch-examples">{EXAMPLES.map((e) => <button key={e} type="button" onClick={() => setText(e)}>{e}</button>)}</p>
        )}
      </form>

      {result && (
        <section className="dispatch-card" aria-live="polite">
          <p className="dispatch-flow">
            <span className="flow-node">{result.assignedBy === 'direct' ? 'You' : 'Zara'}</span>
            <span className="flow-arrow" aria-hidden="true">→</span>
            <span className="flow-node flow-worker">{nameOf(result.person)}</span>
          </p>
          <p className="dispatch-flow-sub">{result.title}</p>
          <p className="dispatch-why">{note}</p>
          <button type="button" className="link-btn dispatch-open" onClick={() => onOpenPerson(result.person)}>Open {nameOf(result.person)}’s desk</button>
          {result.answer && <div className="dispatch-answer">{result.answer}</div>}
          {result.error && <p className="dispatch-error" role="alert">{result.error} — the brief stays on {nameOf(result.person)}’s desk.</p>}
          {result.modelLabel && <p className="dispatch-meta">{result.modelLabel} · {result.tookMs} ms</p>}
        </section>
      )}

      {error && <p className="dispatch-error dispatch-error-alone" role="alert">{error}</p>}

      {log.length > 0 && (
        <section className="dispatch-log" aria-label="Recent dispatches">
          <h3>Dispatch log</h3>
          <ol>
            {log.map((entry, i) => (
              <li key={entry.id} className={`dispatch-entry is-${entry.status}`}>
                <span className="dispatch-no">{String(log.length - i).padStart(2, '0')}</span>
                <span className="dispatch-entry-main">
                  <span className="dispatch-entry-text">{entry.text}</span>
                  <span className="dispatch-entry-meta">{nameOf(entry.person)} · {entry.status === 'done' ? 'answered' : 'waiting for the model'}</span>
                </span>
              </li>
            ))}
          </ol>
        </section>
      )}
    </aside>
  );
}
