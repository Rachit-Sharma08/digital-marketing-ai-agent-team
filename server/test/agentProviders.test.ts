import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { runCommand } from '../src/agents/command.ts';
import { availableProviders, pickAgent, providerHasKey } from '../src/agents/router.ts';

// The machine running the suite may have real provider keys, so start every test from an empty board.
const PROVIDER_KEYS = ['ZAI_API_KEY', 'Z_AI_API_KEY', 'MISTRAL_API_KEY', 'OPENROUTER_API_KEY', 'NVIDIA_API_KEY', 'NVIDIA_NIM_API_KEY', 'GEMINI_API_KEY'];

beforeEach(() => {
  for (const key of PROVIDER_KEYS) vi.stubEnv(key, '');
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe('multi-provider model routing', () => {
  it('detects configured providers without exposing key values', () => {
    const env = { ZAI_API_KEY: 'z-secret', MISTRAL_API_KEY: 'm-secret' };
    expect(availableProviders(env)).toEqual(['mistral', 'zai']);
    expect(providerHasKey('zai', env)).toBe(true);
    expect(providerHasKey('gemini', env)).toBe(false);
  });

  it('gives the general lead the strongest deep model available', () => {
    const pick = pickAgent('hello', { MISTRAL_API_KEY: 'present' });
    expect(pick).toMatchObject({ kind: 'general', person: 'zara', model: { provider: 'mistral', tier: 'deep', id: 'mistral-large-latest' } });
  });

  it('uses an OpenAI-compatible provider payload and returns provider metadata', async () => {
    vi.stubEnv('MISTRAL_API_KEY', 'present');
    vi.stubEnv('GEMINI_API_KEY', '');
    vi.stubGlobal('fetch', vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body)) as { model: string; messages: Array<{ role: string; content: string }> };
      expect(body.model).toBe('mistral-large-latest');
      expect(body.messages[0]?.role).toBe('system');
      return new Response(JSON.stringify({ choices: [{ message: { content: 'Mistral answer' } }] }), { status: 200 });
    }));
    const out = await runCommand(pickAgent('hello'), 'hello');
    expect(out).toMatchObject({ ok: true, answer: 'Mistral answer', provider: 'mistral', model: 'mistral-large-latest' });
  });

  it('falls through to the next configured provider when the first is unavailable', async () => {
    vi.stubEnv('ZAI_API_KEY', 'present');
    vi.stubEnv('GEMINI_API_KEY', 'present');
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: { message: 'busy' } }), { status: 503 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ choices: [{ message: { content: 'z.ai fallback' } }] }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const out = await runCommand(pickAgent('hello'), 'hello');
    expect(out).toMatchObject({ ok: true, answer: 'z.ai fallback', provider: 'zai' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('adds the week planner and human-voice rules only in plan mode', async () => {
    vi.stubEnv('MISTRAL_API_KEY', 'present');
    const systems: string[] = [];
    vi.stubGlobal('fetch', vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body)) as { messages: Array<{ role: string; content: string }> };
      systems.push(body.messages[0]?.content ?? '');
      return new Response(JSON.stringify({ choices: [{ message: { content: 'A plan' } }] }), { status: 200 });
    }));
    await runCommand(pickAgent('content plan'), 'next week ka content plan banao', { plan: true });
    await runCommand(pickAgent('content plan'), 'next week ka content plan banao');
    expect(systems[0]).toContain('content director');
    expect(systems[0]).toContain('7-day plan');
    expect(systems[0]).toContain('Banned:');
    expect(systems[1]).not.toContain('content director');
    expect(systems[1]).toContain('Banned:');
  });
});
