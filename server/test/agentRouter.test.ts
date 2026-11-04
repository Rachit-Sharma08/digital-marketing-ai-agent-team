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

  it('can be pointed at one teammate directly', () => {
    const direct = pickAgent('please handle this', { MISTRAL_API_KEY: 'present' }, 'meera');
    expect(direct).toMatchObject({ kind: 'ads', person: 'meera' });
    expect(direct.reason).toContain('assigned directly');
    expect(pickAgent('please handle this', {}, 'zara')).toMatchObject({ kind: 'general', person: 'zara', model: { tier: 'deep' } });
  });

  it('ignores an unknown teammate id and routes normally', () => {
    expect(pickAgent('instagram caption', {}, 'nobody')).toMatchObject({ kind: 'social', person: 'priya' });
  });

  it('always explains itself and picks a real model id', () => {
    const pick = pickAgent('plan a launch campaign');
    expect(pick.reason).toContain(pick.model.label);
    expect(pick.model.provider).toMatch(/^(zai|mistral|openrouter|nvidia|gemini)$/);
    expect(pick.model.id.length).toBeGreaterThan(2);
  });
});
