import { afterEach, describe, expect, it, vi } from 'vitest';
import { PRODUCTION_ANALYTICS_HOSTNAME, canMeasureAnalytics, isProductionAnalyticsHost } from '../../app/lib/analyticsHost';
import { company } from '../../app/data/company';

afterEach(() => vi.unstubAllGlobals());

function browser(hostname: string, analytics: 'granted' | 'denied') {
  vi.stubGlobal('window', {
    location: { hostname },
    localStorage: { getItem: () => JSON.stringify({ analytics, advertising: 'denied' }) },
  });
}

describe('production analytics host (DEC-06)', () => {
  it('is the canonical site host, from company.siteUrl', () => {
    expect(PRODUCTION_ANALYTICS_HOSTNAME).toBe(new URL(company.siteUrl).hostname);
    expect(PRODUCTION_ANALYTICS_HOSTNAME).toBe('rubikonbuild.com');
  });

  it.each([
    ['rubikonbuild.com', true],
    ['localhost', false],
    ['127.0.0.1', false],
    ['[::1]', false],
    ['www.rubikonbuild.com', false],
    ['rubikon-build.leusd100.workers.dev', false],
    ['rubikonbuild.com.example.net', false],
    ['RUBIKONBUILD.COM.', false],
    ['', false],
  ])('%s → %s', (hostname, expected) => {
    expect(isProductionAnalyticsHost(hostname)).toBe(expected);
  });

  it('reads the page host when none is given, and is false on the server', () => {
    expect(isProductionAnalyticsHost()).toBe(false);
    browser('rubikonbuild.com', 'denied');
    expect(isProductionAnalyticsHost()).toBe(true);
  });

  it('measures only with both the production host and Analytics consent', () => {
    browser('rubikonbuild.com', 'granted');
    expect(canMeasureAnalytics()).toBe(true);
    browser('rubikonbuild.com', 'denied');
    expect(canMeasureAnalytics()).toBe(false);
    browser('127.0.0.1', 'granted');
    expect(canMeasureAnalytics()).toBe(false);
  });
});
