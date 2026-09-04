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
      // Hooks live inline next to the components that use them (app/components/**/use*.ts
      // — useLayerLifecycle.ts, useWebglSupport.ts, useBuildProgress.ts, etc.), not under a
      // single app/hooks/ directory — app/hooks/** alone only ever matched the two
      // top-level, non-component-scoped hooks (useDeferredMedia.ts, useViewportVariant.ts).
      // The five component-scoped hooks were previously INCLUDED by include's blanket
      // 'app/**/*.ts' with no matching exclude, silently contradicting this comment's own
      // stated policy — caught when a new one (useBuildProgress.ts, Phase 3B) needed
      // @react-three/fiber's useThree/useFrame and so, like its siblings, genuinely cannot
      // run outside a mounted <Canvas>. app/components/**/use*.ts closes that gap for all
      // five, not just the new one — a real, pre-existing miscategorisation this happened
      // to surface, not a carve-out invented for one PR. React's own naming convention
      // (every hook is named use*) is what makes this pattern safe to be broad rather than
      // a per-file list: confirmed by hand that no non-hook app/components/**/*.ts file
      // matches it.
      //
      // app/data/** is excluded because it is declarative content only: exported const
      // literals (directions, page copy, manifests, navigation) with no exported
      // executable logic. The only code left in there is a couple of module-private
      // template-string builders used to author those literals, which have no behaviour a
      // test could assert beyond restating the literal values. Every helper that did have
      // behaviour — getDirection, getDirectionPage, createDirectionMetadata, webpSrcSet —
      // now lives in app/lib and is covered by real behavioural tests. Keep that boundary:
      // if a function needs writing, it belongs in app/lib, not next to the data it reads.
      //
      // proceduralTextures.ts (Phase 3F.1) is the newest instance of this same "needs a real
      // browser, not jsdom" rule, just via a different DOM API: it calls
      // `document.createElement('canvas').getContext('2d')`, which this repo's plain-node Vitest
      // environment cannot provide without a canvas polyfill this project deliberately doesn't
      // carry (identical reasoning to .tsx/hooks above — not a new exception, the same one).
      // Critically, the actual algorithmic content (the PRNG, the noise field, the per-pixel
      // byte-encoding formulas) was deliberately pulled OUT into noiseField.ts, a pure module with
      // no canvas dependency at all — that file carries full, real unit tests and stays IN this
      // metric. What's excluded here is only the thin remaining shell: canvas creation,
      // `getContext('2d')`, and THREE.Texture/CanvasTexture wiring — verified live in-browser and
      // by the Phase 3F/3F.1 visual-regression suite instead.
      // sonar-project.properties' coverage.exclusions mirrors this list exactly.
      include: ['app/**/*.ts'],
      exclude: [
        'app/**/*.tsx',
        'app/hooks/**',
        'app/components/**/use*.ts',
        'app/types/**',
        'app/data/**',
        'app/components/configurator/three/proceduralTextures.ts',
      ],
    },
  },
});
