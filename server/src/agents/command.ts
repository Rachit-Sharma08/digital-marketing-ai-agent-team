// Runs one typed command through the picked teammate's model. Provider keys come only from the environment,
// never config files or logs. A failed provider is skipped in favour of the next configured provider.
import { PROVIDERS, availableProviders, providerHasKey, type AgentPick, type ModelTier, type ProviderId } from './router.ts';
import { BOSS_VOICE, HUMAN_VOICE, PLANNER } from './voice.ts';

const TIMEOUT_MS = 90_000;

export type CommandOptions = { readonly plan?: boolean };

export type CommandResult =
  | { readonly ok: true; readonly answer: string; readonly provider: ProviderId; readonly model: string; readonly label: string; readonly tier: ModelTier }
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
  return availableProviders().length > 0;
}

/** Every desk gets the human-voice rules; the boss also gets the decision rule, plan mode gets the week planner. */
function systemFor(pick: AgentPick, plan: boolean): string {
  const parts = [ROLE_PROMPTS[pick.kind] ?? ROLE_PROMPTS.general];
  if (pick.kind === 'general') parts.push(BOSS_VOICE);
  if (plan) parts.push(PLANNER);
  parts.push(HUMAN_VOICE);
  return parts.join('\n\n');
}

function keyFor(provider: ProviderId): string | undefined {
  return PROVIDERS.find((p) => p.id === provider)?.keyNames.map((name) => process.env[name]?.trim()).find(Boolean);
}

function errorResult(status: number, message?: string): CommandResult {
  if (status === 429) return { ok: false, status, error: 'The selected model is rate-limited. Trying the next available provider.' };
  if (status === 503) return { ok: false, status, error: 'The selected model is busy. Trying the next available provider.' };
  return { ok: false, status: status >= 500 ? 502 : status, error: message ?? `Model returned ${status}` };
}

async function callProvider(provider: ProviderId, pick: AgentPick, text: string, plan: boolean): Promise<CommandResult> {
  const config = PROVIDERS.find((p) => p.id === provider)!;
  const key = keyFor(provider);
  if (!key) return { ok: false, status: 501, error: `${config.label} is not configured.` };
  const model = process.env[`AKG_${provider.toUpperCase()}_${pick.model.tier.toUpperCase()}_MODEL`]?.trim() ?? config.models[pick.model.tier];
  const system = systemFor(pick, plan);
  const maxTokens = plan ? 4000 : 1200;
  const isGemini = provider === 'gemini';
  const body = isGemini
    ? { systemInstruction: { parts: [{ text: system }] }, contents: [{ role: 'user', parts: [{ text }] }], generationConfig: { temperature: 0.7, maxOutputTokens: maxTokens } }
    : { model, messages: [{ role: 'system', content: system }, { role: 'user', content: text }], temperature: 0.7, max_tokens: maxTokens, stream: false };
  const endpoint = isGemini
    ? `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`
    : provider === 'zai' ? 'https://api.z.ai/api/paas/v4/chat/completions'
      : provider === 'mistral' ? 'https://api.mistral.ai/v1/chat/completions'
        : provider === 'openrouter' ? 'https://openrouter.ai/api/v1/chat/completions'
          : 'https://integrate.api.nvidia.com/v1/chat/completions';
  try {
    const res = await fetch(endpoint, { method: 'POST', headers: { 'content-type': 'application/json', ...(isGemini ? {} : { authorization: `Bearer ${key}` }) }, body: JSON.stringify(body), signal: AbortSignal.timeout(TIMEOUT_MS) });
    const json = (await res.json().catch(() => null)) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>; choices?: Array<{ message?: { content?: string } }>; error?: { message?: string } } | null;
    if (!res.ok) return errorResult(res.status, json?.error?.message);
    const answer = isGemini ? (json?.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? '').join('').trim() : json?.choices?.[0]?.message?.content?.trim() ?? '';
    if (!answer) return { ok: false, status: 502, error: 'The model returned an empty answer.' };
    return { ok: true, answer, provider, model, label: `${config.label} · ${model}`, tier: pick.model.tier };
  } catch (err) {
    return { ok: false, status: 504, error: err instanceof Error && err.name === 'TimeoutError' ? 'The model timed out; trying the next available provider.' : 'Could not reach the provider; trying the next available provider.' };
  }
}

export async function runCommand(pick: AgentPick, text: string, options: CommandOptions = {}): Promise<CommandResult> {
  const providers = availableProviders();
  if (!providers.length) return { ok: false, status: 501, error: 'No model API key is set. Configure a provider key in the environment and restart.' };
  const start = providers.indexOf(pick.model.provider);
  const ordered = start >= 0 ? [...providers.slice(start), ...providers.slice(0, start)] : providers;
  let last: CommandResult = { ok: false, status: 502, error: 'All configured providers failed.' };
  for (const provider of ordered) {
    const out = await callProvider(provider, pick, text, Boolean(options.plan));
    if (out.ok) return out;
    last = out;
  }
  return last;
}
