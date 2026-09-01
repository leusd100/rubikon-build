import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    // Isolated prototype with its own tsconfig.json/build — not part of the app's TypeScript
    // project, so the app's type-aware lint rules shouldn't try to check it. Lint it separately
    // via radar-prototype's own tooling if/when that's wanted.
    'radar-prototype/**',
    // Vitest's coverage report — self-contained generated HTML/JS, not source. Already
    // gitignored, but that's a separate mechanism from this list; without this entry a
    // local `pnpm test:unit:coverage && pnpm lint` picks up the report's own bundled JS
    // and floods the output with bogus findings on minified code.
    'coverage/**',
  ]),
]);

export default eslintConfig;
