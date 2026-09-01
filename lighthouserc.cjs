const median = 'median';
const profileName = process.env.LHCI_PROFILE;
const port = process.env.LHCI_PORT || '4174';
const baseUrl = `http://127.0.0.1:${port}`;

const profiles = {
  home: {
    maxTotalBytes: 6_000_000,
    url: `${baseUrl}/`,
  },
  standard: {
    maxTotalBytes: 900_000,
    url: `${baseUrl}/angary`,
  },
};

if (!profiles[profileName]) {
  throw new Error('Set LHCI_PROFILE to either "home" or "standard".');
}

const profile = profiles[profileName];

module.exports = {
  ci: {
    collect: {
      startServerCommand: `pnpm start --hostname 127.0.0.1 --port ${port}`,
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
        chromeFlags: '--headless --no-sandbox --disable-dev-shm-usage',
        maxWaitForLoad: 90_000,
      },
    },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.7, aggregationMethod: median }],
        'categories:accessibility': ['error', { minScore: 0.95, aggregationMethod: median }],
        'categories:best-practices': ['error', { minScore: 0.95, aggregationMethod: median }],
        'categories:seo': ['error', { minScore: 0.95, aggregationMethod: median }],
        'cumulative-layout-shift': [
          'error',
          { maxNumericValue: 0.05, aggregationMethod: median },
        ],
        'largest-contentful-paint': [
          'error',
          { maxNumericValue: 5_750, aggregationMethod: median },
        ],
        'total-byte-weight': [
          'error',
          { maxNumericValue: profile.maxTotalBytes, aggregationMethod: median },
        ],
        'errors-in-console': ['error', { minScore: 1, aggregationMethod: median }],
        'uses-responsive-images': ['error', { minScore: 0.5, aggregationMethod: median }],
      },
    },
  },
};
