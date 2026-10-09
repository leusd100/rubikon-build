import { afterEach, describe, expect, it, vi } from 'vitest';
import { queueProofEvent } from '../../app/lib/proofAnalytics';

afterEach(() => vi.unstubAllGlobals());
function browser(granted = true, dataLayer?: unknown[]) {
  const target = { dataLayer, localStorage: { getItem: () => JSON.stringify({
    analytics: granted ? 'granted' : 'denied', advertising: 'denied',
  }) } };
  vi.stubGlobal('window', target);
  return target;
}
const sent = (entry: unknown) => Array.from(entry as ArrayLike<unknown>);

describe('HOME proof block analytics (proof_interaction)', () => {
  it('queues the action and its detail as gtag arguments, after what the queue holds', () => {
    const target = browser(true, [['consent', 'update', {}]]);
    expect(queueProofEvent('node_open', 'base')).toBe(true);
    expect(target.dataLayer?.[0]).toEqual(['consent', 'update', {}]);
    expect(Object.prototype.toString.call(target.dataLayer?.[1])).toBe('[object Arguments]');
    expect(sent(target.dataLayer?.[1])).toEqual(['event', 'proof_interaction', { proof_action: 'node_open', proof_detail: 'base' }]);
  });
  it('sends an empty detail when the action has none, and starts a missing queue', () => {
    const target = browser();
    expect(queueProofEvent('tour_start')).toBe(true);
    expect(target.dataLayer).toHaveLength(1);
    expect(sent(target.dataLayer?.[0])).toEqual(['event', 'proof_interaction', { proof_action: 'tour_start', proof_detail: '' }]);
  });
  it('queues nothing without analytics consent', () => {
    const target = browser(false);
    expect(queueProofEvent('brief_click')).toBe(false);
    expect(target.dataLayer).toBeUndefined();
  });
  it('never throws: a queue that rejects the event reports false', () => {
    browser(true, Object.freeze([]) as unknown as unknown[]);
    expect(queueProofEvent('layer', 'load')).toBe(false);
  });
});
