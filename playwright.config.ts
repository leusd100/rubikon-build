import { defineConfig, devices } from '@playwright/test';

const externalBaseURL = process.env.PLAYWRIGHT_BASE_URL;
const baseURL = externalBaseURL ?? 'http://127.0.0.1:4173';
const useProductionBuild = process.env.PLAYWRIGHT_USE_PRODUCTION_BUILD === 'true';
const useBlobReporter = process.env.PLAYWRIGHT_BLOB_REPORT === 'true';

// Specs that skip every test on the phone project at file level, in a top-level `test.skip(({ isMobile }) => …)` or
// a top-level `beforeEach` that calls `test.skip(isMobile, …)`, so any test added to one is skipped there too.
// `--shard` splits the listed tests by count, skipped ones included, and these 166 left Main Regression shards
// half-empty (CI-06). The phone project ignores the files instead; the in-file skip stays as the reason. Specs that
// skip per describe or per test are left out: a test added outside those runs on phones, and ignoring the file would
// drop it silently. tests/unit/e2e-project-ignore.test.ts holds this list to exactly the specs with a file-level skip.
const phoneSkippedSpecs = [
  'angary-cost-lines.spec.ts',
  'angary-route-phone.spec.ts',
  'consent-pending-hero.spec.ts',
  'decor-backgrounds.spec.ts',
  'direction-phone-template.spec.ts',
  'direction-tablet-template.spec.ts',
  'direction-texts.spec.ts',
  'drawing-tour-framing.spec.ts',
  'grain-builder-phone.spec.ts',
  'header-tablet-nav.spec.ts',
  'home-landscape.spec.ts',
  'inquiry-error-focus.spec.ts',
  'inquiry-select.spec.ts',
  'links-buttons-focus.spec.ts',
  'section-rhythm.spec.ts',
  'shorter-pro-nas-yak.spec.ts',
  'yak-pro-nas-touch.spec.ts',
];

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  // Retries retain diagnostic evidence, but a test that passed only after failing must still block CI.
  failOnFlakyTests: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI
    ? useBlobReporter
      ? // `list` prints every finished test and retry to the job log as it goes, so a shard cut off by the job
        // limit (which uploads no blob) still names the test it was failing.
        [['blob'], ['list']]
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
      // grain-planner-mobile skips every test off the phone project at file level: the mirror of the list above.
      testIgnore: /visual\.spec\.ts|grain-planner-mobile\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
      },
    },
    {
      name: 'mobile-chromium',
      testIgnore: [/form\.spec\.ts|visual\.spec\.ts/, ...phoneSkippedSpecs],
      use: { ...devices['Pixel 7'] },
    },
    {
      name: 'visual-chromium',
      testMatch: /visual\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    // The keyboard's checks in the other two engines (cross-browser-keyboard.yml); run only when asked for by name
    {
      name: 'firefox',
      testMatch: /responsive-a11y-phase1\.spec\.ts/,
      use: { ...devices['Desktop Firefox'], viewport: { width: 1440, height: 900 } },
    },
    {
      name: 'webkit',
      testMatch: /responsive-a11y-phase1\.spec\.ts/,
      use: { ...devices['Desktop Safari'], viewport: { width: 1440, height: 900 } },
    },
  ],
});
