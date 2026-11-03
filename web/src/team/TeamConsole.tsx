// The team console: type one command, the server picks the teammate and the model (server/src/agents/router.ts) and
// answers. A plain fetch to the app's own origin; nothing is stored. Read-only servers answer 403, shown as-is.
import { useEffect, useRef, useState } from 'react';

type Reply = {
  agent: { kind: string; person: string; title: string; reason: string };
  model: { tier: string; id: string; label: string };
  answer: string;
  tookMs: number;
};

const EXAMPLES = ['Isko 3 Instagram caption likho', 'Audit my landing page SEO', 'Google Ads copy for a Diwali sale'];

export function TeamConsole({ onClose }: { onClose: () => void }) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [reply, setReply] = useState<Reply | null>(null);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { input.current?.focus(); }, []);

  async function send() {
    const value = text.trim();
    if (!value || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/agents/command', {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text: value }),
      });
      const body = (await res.json().catch(() => null)) as Reply | { error?: string } | null;
      if (!res.ok) throw new Error((body as { error?: string } | null)?.error ?? `Request failed (${res.status})`);
      setReply(body as Reply);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reach the server.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="team-console" role="dialog" aria-modal="false" aria-label="Team console">
      <header>
        <strong>Team console</strong>
        <button type="button" className="team-close" aria-label="Close the team console" onClick={onClose}>×</button>
      </header>

      <form onSubmit={(e) => { e.preventDefault(); void send(); }}>
        <textarea
          ref={input}
          rows={2}
          value={text}
          placeholder="Kaam likho… (jaise: mere bakery ke liye 3 Instagram caption likho)"
          aria-label="Your command"
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send(); } }}
        />
        <button type="submit" disabled={busy || !text.trim()}>{busy ? 'Working…' : 'Send'}</button>
      </form>

      {!reply && !busy && !error && (
        <p className="team-hint">{EXAMPLES.map((e) => <button key={e} type="button" onClick={() => setText(e)}>{e}</button>)}</p>
      )}

      {reply && (
        <div className="team-reply">
          <p className="team-route">
            <span className="team-agent">{reply.agent.title}</span>
            <span className="team-model">{reply.model.label}</span>
          </p>
          <p className="team-why">{reply.agent.reason} · {reply.tookMs} ms</p>
          <div className="team-answer">{reply.answer}</div>
        </div>
      )}

      {error && <p className="team-error" role="alert">{error}</p>}
    </section>
  );
}
