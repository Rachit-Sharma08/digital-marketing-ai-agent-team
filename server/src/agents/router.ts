// Rule-based router: one typed command -> which teammate takes it and which model tier it needs.
// Deterministic (keyword + length only) so the same command always picks the same agent, and the choice is
// explainable in the UI. Provider selection is env-aware, but never reads keys from files.
// The boss (Zara Khan, person id 'zara') always gets the strongest model tier ('deep').
export type AgentKind = 'seo' | 'ads' | 'content' | 'social' | 'email' | 'analytics' | 'design' | 'code' | 'general';

export type ModelTier = 'fast' | 'balanced' | 'deep';
export type ProviderId = 'zai' | 'mistral' | 'openrouter' | 'nvidia' | 'gemini';

export type ModelPick = { readonly tier: ModelTier; readonly provider: ProviderId; readonly id: string; readonly label: string; readonly why: string };

export type AgentPick = {
  readonly kind: AgentKind;
  readonly person: string; // desk id in shared/office/staff.ts, so the office lights up the right seat
  readonly title: string;
  readonly model: ModelPick;
  readonly reason: string; // one line the UI shows: why this agent and this model
};

export const PROVIDERS: ReadonlyArray<{ readonly id: ProviderId; readonly label: string; readonly keyNames: ReadonlyArray<string>; readonly models: Readonly<Record<ModelTier, string>> }> = [
  { id: 'zai', label: 'z.ai', keyNames: ['ZAI_API_KEY', 'Z_AI_API_KEY'], models: { fast: 'glm-4.5-air', balanced: 'glm-4.5', deep: 'glm-5' } },
  { id: 'mistral', label: 'Mistral', keyNames: ['MISTRAL_API_KEY'], models: { fast: 'mistral-small-latest', balanced: 'mistral-medium-latest', deep: 'mistral-large-latest' } },
  { id: 'openrouter', label: 'OpenRouter', keyNames: ['OPENROUTER_API_KEY'], models: { fast: 'google/gemini-2.5-flash-lite', balanced: 'google/gemini-2.5-flash', deep: 'google/gemini-2.5-pro' } },
  { id: 'nvidia', label: 'NVIDIA NIM', keyNames: ['NVIDIA_API_KEY', 'NVIDIA_NIM_API_KEY'], models: { fast: 'microsoft/phi-4-mini-instruct', balanced: 'nvidia/nemotron-3.5-bolt-e4b', deep: 'deepseek-ai/deepseek-v4-flash' } },
  { id: 'gemini', label: 'Gemini', keyNames: ['GEMINI_API_KEY'], models: { fast: 'gemini-3.5-flash-lite', balanced: 'gemini-3.8-flash', deep: 'gemini-3.8-flash' } },
];

const modelOverride = (provider: ProviderId, tier: ModelTier, env: NodeJS.ProcessEnv): string | undefined => env[`AKG_${provider.toUpperCase()}_${tier.toUpperCase()}_MODEL`]?.trim() || undefined;

export function providerHasKey(provider: ProviderId, env: NodeJS.ProcessEnv = process.env): boolean {
  const config = PROVIDERS.find((p) => p.id === provider);
  return Boolean(config?.keyNames.some((name) => env[name]?.trim()));
}

export function availableProviders(env: NodeJS.ProcessEnv = process.env): ProviderId[] {
  return PROVIDERS.filter((p) => providerHasKey(p.id, env)).map((p) => p.id);
}

function modelFor(tier: ModelTier, env: NodeJS.ProcessEnv): ModelPick {
  const provider = PROVIDERS.find((p) => providerHasKey(p.id, env)) ?? PROVIDERS[PROVIDERS.length - 1]!;
  const id = modelOverride(provider.id, tier, env) ?? provider.models[tier];
  const why = tier === 'fast' ? 'short, cheap copy work' : tier === 'deep' ? 'audit or multi-step work' : 'normal strategy and writing';
  return { tier, provider: provider.id, id, label: `${provider.label} · ${id}`, why };
}

// Order matters: the first kind whose keyword appears wins (ads before content, so "ad copy" is ads).
const RULES: ReadonlyArray<{ readonly kind: AgentKind; readonly person: string; readonly title: string; readonly words: ReadonlyArray<string> }> = [
  { kind: 'seo', person: 'neha', title: 'SEO analyst', words: ['seo', 'keyword', 'ranking', 'serp', 'backlink', 'meta tag', 'search console', 'schema'] },
  { kind: 'ads', person: 'meera', title: 'Campaigns lead', words: ['ads', 'ad copy', 'google ads', 'meta ads', 'campaign', 'roas', 'cpc', 'ctr', 'audience', 'retarget'] },
  { kind: 'email', person: 'aisha', title: 'Community & email', words: ['email', 'subject line', 'drip', 'sequence', 'newsletter', 'cold mail', 'follow-up'] },
  { kind: 'social', person: 'priya', title: 'Social media lead', words: ['instagram', 'linkedin', 'twitter', 'reel', 'social', 'caption', 'hashtag', 'post'] },
  { kind: 'analytics', person: 'fatima', title: 'Finance lead', words: ['analytics', 'ga4', 'report', 'metric', 'conversion rate', 'funnel', 'dashboard', 'tracking'] },
  { kind: 'design', person: 'tara', title: 'AI & research', words: ['design', 'banner', 'thumbnail', 'creative', 'layout', 'brand'] },
  { kind: 'code', person: 'sadiq', title: 'IT & deploy', words: ['code', 'bug', 'fix', 'react', 'api', 'next.js', 'typescript', 'html', 'css', 'deploy', 'website'] },
  { kind: 'content', person: 'aanya', title: 'Content writer', words: ['blog', 'article', 'content', 'copy', 'landing page', 'write'] },
];

const GENERAL = { kind: 'general' as const, person: 'zara', title: 'Boss — Marketing lead', words: [] as ReadonlyArray<string> };

/** Audit-shaped asks need the deeper tier: they read many things at once and reason across them. */
const DEEP_WORDS = ['audit', 'strategy', 'plan', 'analyse', 'analyze', 'compare', 'research', 'why', 'optimise', 'optimize', 'roadmap'];

const norm = (text: string): string => text.toLowerCase().replace(/\s+/g, ' ').trim();

export function pickAgent(text: string, env: NodeJS.ProcessEnv = process.env): AgentPick {
  const t = norm(text);
  const rule = RULES.find((r) => r.words.some((w) => t.includes(w))) ?? GENERAL;

  // The boss always gets the strongest model tier.
  const tier: ModelTier = rule.person === 'zara' ? 'deep' : deepOrNormal(t, rule.kind);

  const model = modelFor(tier, env);
  const by = rule.kind === 'general' ? 'no specific skill matched — handled by the boss' : `handled by ${rule.title}`;
  return {
    kind: rule.kind,
    person: rule.person,
    title: rule.title,
    model,
    reason: `${by}; ${model.label} because ${model.why}`,
  };
}

function deepOrNormal(t: string, kind: AgentKind): ModelTier {
  const deep = t.split(' ').length > 40 || DEEP_WORDS.some((w) => t.includes(w));
  return kind === 'general' || deep ? 'deep' : t.split(' ').length <= 12 ? 'fast' : 'balanced';
}
