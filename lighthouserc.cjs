const median = 'median';

module.exports = {
  ci: {
    collect: {
      startServerCommand: 'pnpm start --hostname 127.0.0.1 --port 4174',
      startServerReadyPattern: 'Production server running',
      startServerReadyTimeout: 120_000,
      url: ['http://127.0.0.1:4174/', 'http://127.0.0.1:4174/angary'],
      numberOfRuns: 3,
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
          { maxNumericValue: 900_000, aggregationMethod: median },
        ],
        'errors-in-console': ['error', { minScore: 1, aggregationMethod: median }],
        'uses-responsive-images': ['error', { minScore: 0.5, aggregationMethod: median }],
      },
    },
  },
};
