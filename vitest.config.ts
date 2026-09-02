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
      // logic (API routes, app/lib, robots.ts/sitemap.ts) runs fine in this suite's plain
      // node environment and gets real coverage here. React components (.tsx) and hooks
      // (need a component-rendering context to invoke, same problem as .tsx despite the
      // .ts extension) are deliberately covered by Playwright e2e instead — this repo has
      // no jsdom/testing-library, and adding one just to render components for a coverage
      // number isn't the goal. app/types is type-only, no runtime code to instrument.
      //
      // app/data/** is excluded because it is declarative content only: exported const
      // literals (directions, page copy, manifests, navigation) with no exported
      // executable logic. The only code left in there is a couple of module-private
      // template-string builders used to author those literals, which have no behaviour a
      // test could assert beyond restating the literal values. Every helper that did have
      // behaviour — getDirection, getDirectionPage, createDirectionMetadata, webpSrcSet —
      // now lives in app/lib and is covered by real behavioural tests. Keep that boundary:
      // if a function needs writing, it belongs in app/lib, not next to the data it reads.
      // sonar-project.properties' coverage.exclusions mirrors this list exactly.
      include: ['app/**/*.ts'],
      exclude: ['app/**/*.tsx', 'app/hooks/**', 'app/types/**', 'app/data/**'],
    },
  },
});
