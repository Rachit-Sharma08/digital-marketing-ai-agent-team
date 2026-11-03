import { describe, expect, it } from 'vitest';
import { auditLogFrom } from '../src/config.ts';

describe('AKG_AUDIT_LOG', () => {
  it('defaults to ~/.agents-ka-ghar/audit.log and expands ~/', () => {
    expect(auditLogFrom(undefined, '/h/me')).toBe('/h/me/.agents-ka-ghar/audit.log');
    expect(auditLogFrom('  ', '/h/me')).toBe('/h/me/.agents-ka-ghar/audit.log');
    expect(auditLogFrom('~/logs/akg.log', '/h/me')).toBe('/h/me/logs/akg.log');
    expect(auditLogFrom('/var/log/akg/audit.log', '/h/me')).toBe('/var/log/akg/audit.log');
  });
});
