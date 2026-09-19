import { describe, expect, it } from 'vitest';
import { classifyChanges } from '../../scripts/ci/classify-changes.mjs';

describe('CI change classification', () => {
  it.each(['vite.config.ts', 'worker.ts', 'worker/cache-policy.ts', 'wrangler.jsonc',
    'app/lib/security/csp.ts', 'app/lib/consent.ts', 'app/lib/attribution.ts'])(
    '%s runs all affected boundaries', (file) => {
      expect(classifyChanges([file])).toMatchObject({
        planner: true, inquiry: true, leads: true, configurator: true, wide_visual: true,
      });
    },
  );
  it('never selects an empty visual job for a standalone stylesheet', () => {
    expect(classifyChanges(['app/custom-page.css'])).toMatchObject({ visual: true, wide_visual: true });
  });
  it('includes consent endpoint tests and the actual angary composition', () => {
    expect(classifyChanges(['tests/e2e/analytics-consent.spec.ts']).inquiry).toBe(true);
    expect(classifyChanges(['app/angary/page.tsx']).configurator).toBe(true);
  });
  it('keeps documentation-only changes outside focused regression jobs', () => {
    expect(classifyChanges(['docs/audit.md']).risk_any).toBe(false);
  });
});
