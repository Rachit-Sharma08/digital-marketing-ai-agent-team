// Rule-based router: one typed command -> which teammate takes it and which model tier it needs.
// Deterministic (keyword + length only) so the same command always picks the same agent, and the choice is
// explainable in the UI. Model ids are Gemini free-tier models; no key, no call (command.ts refuses).
export type AgentKind = 'seo' | 'ads' | 'content' | 'social' | 'email' | 'analytics' | 'design' | 'code' | 'general';

export type ModelTier = 'fast' | 'balanced' | 'deep';

export type ModelPick = { readonly tier: ModelTier; readonly id: string; readonly label: string; readonly why: string };

export type AgentPick = {
  readonly kind: AgentKind;
  readonly person: string; // desk id in shared/office/staff.ts, so the office lights up the right seat
  readonly title: string;
  readonly model: ModelPick;
  readonly reason: string; // one line the UI shows: why this agent and this model
};

const MODELS: Readonly<Record<ModelTier, ModelPick>> = {
  fast: { tier: 'fast', id: 'gemini-3.5-flash-lite', label: 'Gemini 3.5 Flash-Lite', why: 'short, cheap copy work' },
  balanced: { tier: 'balanced', id: 'gemini-3.5-flash', label: 'Gemini 3.5 Flash', why: 'normal strategy and writing' },
  deep: { tier: 'deep', id: 'gemini-3.5-flash', label: 'Gemini 3.5 Flash (long)', why: 'audit or multi-step work' },
};

// Order matters: the first kind whose keyword appears wins (ads before content, so "ad copy" is ads).
const RULES: ReadonlyArray<{ readonly kind: AgentKind; readonly person: string; readonly title: string; readonly words: ReadonlyArray<string> }> = [
  { kind: 'seo', person: 'oscar', title: 'SEO analyst', words: ['seo', 'keyword', 'ranking', 'serp', 'backlink', 'meta tag', 'search console', 'schema'] },
  { kind: 'ads', person: 'dwight', title: 'Paid ads manager', words: ['ads', 'ad copy', 'google ads', 'meta ads', 'campaign', 'roas', 'cpc', 'ctr', 'audience', 'retarget'] },
  { kind: 'email', person: 'andy', title: 'Email marketer', words: ['email', 'subject line', 'drip', 'sequence', 'newsletter', 'cold mail', 'follow-up'] },
  { kind: 'social', person: 'kelly', title: 'Social media lead', words: ['instagram', 'linkedin', 'twitter', 'reel', 'social', 'caption', 'hashtag', 'post'] },
  { kind: 'analytics', person: 'angela', title: 'Analytics lead', words: ['analytics', 'ga4', 'report', 'metric', 'conversion rate', 'funnel', 'dashboard', 'tracking'] },
  { kind: 'design', person: 'ryan', title: 'Creative director', words: ['design', 'banner', 'thumbnail', 'creative', 'layout', 'brand'] },
  { kind: 'code', person: 'sadiq', title: 'Web developer', words: ['code', 'bug', 'fix', 'react', 'api', 'next.js', 'typescript', 'html', 'css', 'deploy', 'website'] },
  { kind: 'content', person: 'pam', title: 'Content writer', words: ['blog', 'article', 'content', 'copy', 'landing page', 'write'] },
];

const GENERAL = { kind: 'general' as const, person: 'michael', title: 'Marketing lead', words: [] as ReadonlyArray<string> };

/** Audit-shaped asks need the deeper tier: they read many things at once and reason across them. */
const DEEP_WORDS = ['audit', 'strategy', 'plan', 'analyse', 'analyze', 'compare', 'research', 'why', 'optimise', 'optimize', 'roadmap'];

const norm = (text: string): string => text.toLowerCase().replace(/\s+/g, ' ').trim();

export function pickAgent(text: string): AgentPick {
  const t = norm(text);
  const rule = RULES.find((r) => r.words.some((w) => t.includes(w))) ?? GENERAL;
  const deep = t.split(' ').length > 40 || DEEP_WORDS.some((w) => t.includes(w));
  const tier: ModelTier = deep ? 'deep' : t.split(' ').length <= 12 ? 'fast' : 'balanced';
  const model = MODELS[tier];
  const by = rule.kind === 'general' ? 'no specific skill matched' : `matched "${rule.kind}"`;
  return {
    kind: rule.kind,
    person: rule.person,
    title: rule.title,
    model,
    reason: `${by}; ${model.label} because ${model.why}`,
  };
}
