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
  ]),
]);

export default eslintConfig;
