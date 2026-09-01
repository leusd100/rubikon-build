import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      'cloudflare:workers': fileURLToPath(
        new URL('./tests/stubs/cloudflare-workers.ts', import.meta.url),
      ),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.ts'],
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      reporter: ['lcov', 'text-summary'],
      reportsDirectory: './coverage',
      // Scope matches this project's actual test architecture, not an aspiration: .ts
      // logic (API routes, app/lib, app/data, robots.ts/sitemap.ts) runs fine in this
      // suite's plain node environment and gets real coverage here. React components
      // (.tsx) and hooks (need a component-rendering context to invoke, same problem as
      // .tsx despite the .ts extension) are deliberately covered by Playwright e2e
      // instead — this repo has no jsdom/testing-library, and adding one just to render
      // components for a coverage number isn't the goal. app/types is type-only, no
      // runtime code to instrument. sonar-project.properties' coverage.exclusions mirrors
      // this same boundary so Sonar's coverage metric reflects it too, not just this report.
      include: ['app/**/*.ts'],
      exclude: ['app/**/*.tsx', 'app/hooks/**', 'app/types/**'],
    },
  },
});
