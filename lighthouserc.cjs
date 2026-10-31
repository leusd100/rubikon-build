const median = 'median';
const profileName = process.env.LHCI_PROFILE;
const port = process.env.LHCI_PORT || '4174';
const baseUrl = `https://127.0.0.1:${port}`;

const profiles = {
  home: {
    maxLcp: 3_600,
    maxTotalBytes: 6_000_000,
    minPerformance: 0.85,
    url: `${baseUrl}/`,
    // Reported, not enforced, on HOME. Lighthouse 12 scores uses-responsive-images pass/fail: one image wasting more
    // than 12 KiB fails it, and it counts what object-fit: cover crops away as waste. HOME v2 crops on purpose (the
    // phone hero still into a band that follows the viewport height, the explanation cards to 4:3), so the
    // audit fails on the design, not on a wrong srcset. Byte weight and LCP stay gated below.
    responsiveImages: 'warn',
  },
  standard: {
    maxLcp: 4_700,
    maxTotalBytes: 900_000,
    minPerformance: 0.76,
    url: `${baseUrl}/angary`,
  },
  // The Grain Planner composition on its production route (Phase 5).
  grain: {
    maxLcp: 4_100,
    maxTotalBytes: 900_000,
    minPerformance: 0.82,
    url: `${baseUrl}/zernoskhovyshcha`,
  },
};

if (!profiles[profileName]) {
  throw new Error('Set LHCI_PROFILE to "home", "standard" or "grain".');
}

const profile = profiles[profileName];

module.exports = {
  ci: {
    collect: {
      // `vinext start` behind a compressing HTTP/2 proxy: Cloudflare serves JS and CSS with brotli and multiplexes them,
      // and the byte and LCP budgets below are only meaningful against what visitors receive (scripts/perf/lhci-server.mjs).
      startServerCommand: `node scripts/perf/lhci-server.mjs --port ${port} --http2`,
      startServerReadyPattern: 'Production server running',
      startServerReadyTimeout: 120_000,
      url: [profile.url],
      // 3 samples on a shared GitHub Actions runner leaves the performance-score median too
      // exposed to a single noisy run — e.g. one run at 0.46 pulled an otherwise-passing
      // 0.63/0.72 pair below the 0.7 gate even though nothing in the app changed. 5 runs keeps
      // the same median aggregation but now needs 3 of 5 runs to score low before it can fail,
      // which is the standard Lighthouse CI mitigation for this kind of CI-noise variance.
      numberOfRuns: 5,
      settings: {
        // The server's certificate is self-signed and lives for this run
        chromeFlags: '--headless --no-sandbox --disable-dev-shm-usage --ignore-certificate-errors',
        maxWaitForLoad: 90_000,
      },
    },
    assert: {
      assertions: {
        // Per page since the move to HTTP/2 (31.10.2026): the shared 0.7 and 6.1 s would catch nothing there. Each sits about
        // 6 % past the page's own medians on Linux CI, two runs of 32967214: performance 0.91 / 0.81 / 0.87, LCP 3.34 / 4.41 / 3.82 s
        'categories:performance': ['error', { minScore: profile.minPerformance, aggregationMethod: median }],
        'categories:accessibility': ['error', { minScore: 0.95, aggregationMethod: median }],
        'categories:best-practices': ['error', { minScore: 0.95, aggregationMethod: median }],
        'categories:seo': ['error', { minScore: 0.95, aggregationMethod: median }],
        'cumulative-layout-shift': [
          'error',
          { maxNumericValue: 0.05, aggregationMethod: median },
        ],
        'largest-contentful-paint': [
          'error',
          { maxNumericValue: profile.maxLcp, aggregationMethod: median },
        ],
        'total-byte-weight': [
          'error',
          { maxNumericValue: profile.maxTotalBytes, aggregationMethod: median },
        ],
        'errors-in-console': ['error', { minScore: 1, aggregationMethod: median }],
        'uses-responsive-images': [profile.responsiveImages ?? 'error', { minScore: 0.5, aggregationMethod: median }],
      },
    },
  },
};
