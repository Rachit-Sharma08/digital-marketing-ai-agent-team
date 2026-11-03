// Runs one typed command through the picked teammate's model. Free tier only: the Gemini API key comes from the
// environment (GEMINI_API_KEY, never config files, never logged). No key or a rejected key is a plain error the UI
// shows, not a crash.
import type { AgentPick } from './router.ts';

const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';
const TIMEOUT_MS = 60_000;

export type CommandResult =
  | { readonly ok: true; readonly answer: string }
  | { readonly ok: false; readonly status: number; readonly error: string };

const ROLE_PROMPTS: Readonly<Record<string, string>> = {
  seo: 'You are an SEO analyst. Give concrete, checkable steps: keywords, titles, internal links, technical fixes.',
  ads: 'You are a paid ads manager. Give campaign structure, audiences, ad copy variants and what to measure.',
  email: 'You are an email marketer. Write subject lines, body copy and the send cadence.',
  social: 'You are a social media lead. Write platform-ready posts and hooks.',
  analytics: 'You are an analytics lead. Say which metric answers the question and how to track it (GA4 events).',
  design: 'You are a creative director. Describe the visual direction, layout and copy hierarchy.',
  code: 'You are a web developer. Give working code or an exact fix, with the file and the reason.',
  content: 'You are a content writer. Write the actual draft, in the language the user wrote in.',
  general: 'You are a digital marketing lead. Answer directly and practically.',
};

export function hasKey(): boolean {
  return Boolean(process.env.GEMINI_API_KEY?.trim());
}

export async function runCommand(pick: AgentPick, text: string): Promise<CommandResult> {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) return { ok: false, status: 501, error: 'GEMINI_API_KEY is not set, so no model can run. Add it and restart.' };

  const body = {
    systemInstruction: { parts: [{ text: `${ROLE_PROMPTS[pick.kind]}\nReply in the user's language (Hindi/Hinglish if they wrote so). Be brief: no preamble, no filler.` }] },
    contents: [{ role: 'user', parts: [{ text }] }],
    generationConfig: { temperature: 0.7, maxOutputTokens: 1024 },
  };

  try {
    const res = await fetch(`${ENDPOINT}/${pick.model.id}:generateContent?key=${encodeURIComponent(key)}`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body), signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const json = (await res.json().catch(() => null)) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>; error?: { message?: string } } | null;
    if (!res.ok) {
      if (res.status === 429) return { ok: false, status: 429, error: 'Free model limit hit for this minute. Wait about 30 seconds and try again.' };
      if (res.status === 503) return { ok: false, status: 503, error: 'The model is busy right now. Try again in a moment.' };
      return { ok: false, status: 502, error: json?.error?.message ?? `Model returned ${res.status}` };
    }
    const answer = (json?.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? '').join('').trim();
    if (!answer) return { ok: false, status: 502, error: 'The model returned an empty answer.' };
    return { ok: true, answer };
  } catch (err) {
    const msg = err instanceof Error && err.name === 'TimeoutError' ? 'The model took too long. Try a shorter command.' : 'Could not reach the model. Check the internet connection.';
    return { ok: false, status: 504, error: msg };
  }
}
