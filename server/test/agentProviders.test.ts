import { afterEach, describe, expect, it, vi } from 'vitest';
import { runCommand } from '../src/agents/command.ts';
import { availableProviders, pickAgent, providerHasKey } from '../src/agents/router.ts';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe('multi-provider model routing', () => {
  it('detects configured providers without exposing key values', () => {
    const env = { ZAI_API_KEY: 'z-secret', MISTRAL_API_KEY: 'm-secret' };
    expect(availableProviders(env)).toEqual(['zai', 'mistral']);
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

  it('falls through to Gemini when the first configured provider is unavailable', async () => {
    vi.stubEnv('ZAI_API_KEY', 'present');
    vi.stubEnv('GEMINI_API_KEY', 'present');
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: { message: 'busy' } }), { status: 503 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: 'Gemini fallback' }] } }] }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const out = await runCommand(pickAgent('hello'), 'hello');
    expect(out).toMatchObject({ ok: true, answer: 'Gemini fallback', provider: 'gemini' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
