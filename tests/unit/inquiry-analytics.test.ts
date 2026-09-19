import { afterEach, describe, expect, it, vi } from 'vitest';
import { queueInquiryAnalyticsEvent } from '../../app/lib/inquiry/analytics';

const parameters = { contact_method: 'telegram', project_direction: 'Ангари та склади' };
afterEach(() => vi.unstubAllGlobals());
function browser(granted = true, dataLayer?: unknown[]) {
  const target = { dataLayer, localStorage: { getItem: () => JSON.stringify({
    analytics: granted ? 'granted' : 'denied', advertising: 'denied',
  }) } };
  vi.stubGlobal('window', target);
  return target;
}
describe('inquiry analytics queue', () => {
  it('queues without gtag and preserves previous queue entries', () => {
    const target = browser(true, [['consent', 'update', {}]]);
    expect(queueInquiryAnalyticsEvent('generate_lead', parameters)).toBe(true);
    expect(target.dataLayer?.[0]).toEqual(['consent', 'update', {}]);
    expect(Object.prototype.toString.call(target.dataLayer?.[1])).toBe('[object Arguments]');
    expect(Array.from(target.dataLayer?.[1] as ArrayLike<unknown>)).toEqual(['event', 'generate_lead', parameters]);
  });
  it('initializes a missing queue', () => {
    const target = browser();
    expect(queueInquiryAnalyticsEvent('generate_lead', parameters)).toBe(true);
    expect(target.dataLayer).toHaveLength(1);
  });
  it('does not queue without analytics consent', () => {
    const target = browser(false);
    expect(queueInquiryAnalyticsEvent('generate_lead', parameters)).toBe(false);
    expect(target.dataLayer).toBeUndefined();
  });
  it('does not throw or report success if the queue rejects the event', () => {
    browser(true, Object.freeze([]) as unknown as unknown[]);
    expect(queueInquiryAnalyticsEvent('generate_lead', parameters)).toBe(false);
  });
});
