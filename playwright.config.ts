import { defineConfig, devices } from '@playwright/test';

const externalBaseURL = process.env.PLAYWRIGHT_BASE_URL;
const baseURL = externalBaseURL ?? 'http://127.0.0.1:4173';
const useProductionBuild = process.env.PLAYWRIGHT_USE_PRODUCTION_BUILD === 'true';
const useBlobReporter = process.env.PLAYWRIGHT_BLOB_REPORT === 'true';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI
    ? useBlobReporter
      ? [['blob']]
      : [['github'], ['html', { open: 'never' }]]
    : [['list'], ['html', { open: 'never' }]],
  snapshotPathTemplate: '{testDir}/{testFilePath}-snapshots/{arg}-{platform}{ext}',
  use: {
    baseURL,
    colorScheme: 'light',
    locale: 'uk-UA',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    timezoneId: 'Europe/Kyiv',
  },
  webServer: externalBaseURL
    ? undefined
    : {
        command: useProductionBuild
          ? 'pnpm start --hostname 127.0.0.1 --port 4173'
          : 'pnpm exec vinext dev --hostname 127.0.0.1 --port 4173',
        url: baseURL,
        // Deliberately false, including locally. `reuseExistingServer: true` only checks that
        // SOMETHING answers on the port — not that it is this checkout. A dev server left running
        // on 4173 by another worktree was silently adopted by the whole visual suite, so every
        // screenshot compared against a different codebase: a deliberate `STUDIO_BACKGROUND`
        // mutation still reported "5 passed" because the server under test never had it. A busy
        // port now fails loudly ("port is already used") instead of quietly testing a stranger.
        // Cost is a few seconds of server startup per run; the alternative is a suite that cannot
        // be trusted to be testing the code in front of you. Use PLAYWRIGHT_BASE_URL to point at
        // an already-running server on purpose.
        reuseExistingServer: false,
        timeout: 120_000,
        stdout: 'pipe',
        stderr: 'pipe',
      },
  projects: [
    {
      name: 'desktop-chromium',
      testIgnore: /visual\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
      },
    },
    {
      name: 'mobile-chromium',
      testIgnore: /form\.spec\.ts|visual\.spec\.ts/,
      use: { ...devices['Pixel 7'] },
    },
    {
      name: 'visual-chromium',
      testMatch: /visual\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
