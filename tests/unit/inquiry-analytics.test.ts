import { afterEach, describe, expect, it, vi } from 'vitest';
import { queueInquiryAnalyticsEvent } from '../../app/lib/inquiry/analytics';

const parameters = { contact_method: 'telegram', project_direction: 'Ангари та склади' };
const lead = { ...parameters, lead_submission_id: '0b7c4f3e-2d1a-4c5b-9e8f-7a6b5c4d3e2f' };
afterEach(() => vi.unstubAllGlobals());
function browser(granted = true, dataLayer?: unknown[], hostname = 'rubikonbuild.com') {
  const target = { dataLayer, location: { hostname }, localStorage: { getItem: () => JSON.stringify({
    analytics: granted ? 'granted' : 'denied', advertising: 'denied',
  }) } };
  vi.stubGlobal('window', target);
  return target;
}
describe('inquiry analytics queue', () => {
  it('queues without gtag and preserves previous queue entries', () => {
    const target = browser(true, [['consent', 'update', {}]]);
    expect(queueInquiryAnalyticsEvent('generate_lead', lead)).toBe(true);
    expect(target.dataLayer?.[0]).toEqual(['consent', 'update', {}]);
    expect(Object.prototype.toString.call(target.dataLayer?.[1])).toBe('[object Arguments]');
    expect(Array.from(target.dataLayer?.[1] as ArrayLike<unknown>)).toEqual(['event', 'generate_lead', lead]);
  });
  it('initializes a missing queue', () => {
    const target = browser();
    expect(queueInquiryAnalyticsEvent('generate_lead', lead)).toBe(true);
    expect(target.dataLayer).toHaveLength(1);
  });
  it('does not queue without analytics consent', () => {
    const target = browser(false);
    expect(queueInquiryAnalyticsEvent('generate_lead', lead)).toBe(false);
    expect(target.dataLayer).toBeUndefined();
  });
  it.each(['localhost', '127.0.0.1', 'rubikon-build.leusd100.workers.dev', 'www.rubikonbuild.com'])(
    'queues nothing off the production host, even with consent (%s)',
    (hostname) => {
      const target = browser(true, undefined, hostname);
      expect(queueInquiryAnalyticsEvent('inquiry_contact_attempt', parameters)).toBe(false);
      expect(target.dataLayer).toBeUndefined();
    },
  );
  it('does not throw or report success if the queue rejects the event', () => {
    browser(true, Object.freeze([]) as unknown as unknown[]);
    expect(queueInquiryAnalyticsEvent('generate_lead', lead)).toBe(false);
  });
});
