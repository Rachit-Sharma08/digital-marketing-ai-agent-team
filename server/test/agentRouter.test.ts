import { describe, expect, it } from 'vitest';
import { pickAgent } from '../src/agents/router.ts';

describe('pickAgent', () => {
  it('routes by keyword to the right teammate', () => {
    expect(pickAgent('audit my landing page seo').kind).toBe('seo');
    expect(pickAgent('write google ads copy for a sale').kind).toBe('ads');
    expect(pickAgent('instagram caption for a reel').kind).toBe('social');
    expect(pickAgent('fix the react bug on the pricing page').kind).toBe('code');
  });

  it('falls back to the marketing lead when nothing matches', () => {
    expect(pickAgent('hello')).toMatchObject({ kind: 'general', person: 'zara' });
  });

  it('gives short copy the fast model and long or audit work the deep one', () => {
    expect(pickAgent('write a caption').model.tier).toBe('fast');
    expect(pickAgent('audit the whole funnel and tell me why conversions dropped').model.tier).toBe('deep');
  });

  it('always explains itself and picks a real model id', () => {
    const pick = pickAgent('plan a launch campaign');
    expect(pick.reason).toContain(pick.model.label);
    expect(pick.model.provider).toMatch(/^(zai|mistral|openrouter|nvidia|gemini)$/);
    expect(pick.model.id.length).toBeGreaterThan(2);
  });
});
