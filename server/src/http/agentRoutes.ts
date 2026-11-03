// The teammate command line: GET /api/agents lists who is on the team, POST /api/agents/command hands one typed
// command to the router (router.ts) and the picked model (command.ts). POST is a write, so it needs DMOS_ALLOW_WRITES
// like every other write; the answer is never stored.
import type { IncomingMessage, ServerResponse } from 'node:http';
import { createRateLimiter } from './rateLimit.ts';
import { sendError, sendJson } from './respond.ts';
import { availableProviders, pickAgent, PROVIDERS } from '../agents/router.ts';
import { hasKey, runCommand } from '../agents/command.ts';

type Ctx = { req: IncomingMessage; res: ServerResponse; cors: Record<string, string>; params: ReadonlyArray<string> };
export type AgentRoute = { method: 'GET' | 'POST'; pattern: RegExp; handler: (ctx: Ctx) => Promise<void> };

const COMMAND = /^\/api\/agents\/command$/;
const MAX_TEXT = 4000;

export function agentRoutes(jsonBody: (ctx: Ctx) => Promise<Record<string, unknown> | null>): AgentRoute[] {
  const limiter = createRateLimiter({ max: 20, windowMs: 60_000 });
  return [
    {
      method: 'GET', pattern: /^\/api\/agents$/,
      handler: async ({ res, cors }) => {
        const sample = pickAgent('');
        sendJson(res, 200, {
          ready: hasKey(),
          fallback: 'Add a provider API key to the environment to run commands.',
          providers: PROVIDERS.map((provider) => ({ id: provider.id, label: provider.label, ready: availableProviders().includes(provider.id) })),
          team: [
            'seo', 'ads', 'email', 'social', 'analytics', 'design', 'code', 'content', 'general',
          ].map((kind) => {
            const p = pickAgent(kind);
            return { kind, person: p.person, title: p.title };
          }),
          defaultAgent: { kind: sample.kind, person: sample.person, title: sample.title },
        }, cors);
      },
    },
    {
      method: 'POST', pattern: COMMAND,
      handler: async (ctx) => {
        if (!limiter.take()) return sendError(ctx.res, 429, 'Too many commands. Wait a minute.', ctx.cors);
        const body = await jsonBody(ctx);
        if (!body) return;
        const text = typeof body.text === 'string' ? body.text.trim() : '';
        if (!text) return sendError(ctx.res, 400, 'text is required', ctx.cors);
        if (text.length > MAX_TEXT) return sendError(ctx.res, 400, `text must be at most ${MAX_TEXT} characters`, ctx.cors);

        const pick = pickAgent(text);
        const started = Date.now();
        const out = await runCommand(pick, text);
        if (!out.ok) return sendError(ctx.res, out.status, out.error, ctx.cors);
        sendJson(ctx.res, 200, {
          agent: { kind: pick.kind, person: pick.person, title: pick.title, reason: pick.reason },
          model: { tier: out.tier, provider: out.provider, id: out.model, label: out.label },
          answer: out.answer,
          tookMs: Date.now() - started,
        }, ctx.cors);
      },
    },
  ];
}
