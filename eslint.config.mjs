import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

// Planner layers: the universal core knows no domain and no framework, the grain domain is pure
// TypeScript, and universal planner UI never reaches into a specific domain — it gets grain data
// through props. Regex patterns so relative paths (`../grain`) are caught as well as aliases.
const plannerCoreBoundary = [
  { regex: '^react(-dom)?(/|$)', message: 'Planner core is framework-free: no React.' },
  { regex: '(^|/)grain(/|$)', message: 'Planner core must not depend on a domain such as grain.' },
  { regex: '(^|/)components(/|$)', message: 'Planner core must not depend on UI components.' },
];
const plannerGrainBoundary = [
  { regex: '^react(-dom)?(/|$)', message: 'The grain domain is pure TypeScript: no React.' },
  { regex: '(^|/)components(/|$)', message: 'The grain domain must not depend on UI components.' },
];
const plannerUiBoundary = [
  { regex: '(^|/)lib/planner/grain(/|$)', message: 'Universal planner UI must not import a domain; pass grain data in through props.' },
];
// The inquiry form and its attachment UI read the shared InquiryAttachment only. What is attached
// — a hangar configuration, a grain brief — is the page source's business, never the form's.
const inquiryBoundary = [
  { regex: '(^|/)lib/(planner|configurator)(/|$)', message: 'Shared inquiry UI is kind-agnostic: read InquiryAttachment (app/lib/inquiry), not a planner or configurator.' },
  { regex: '(^|/)(configurator|grain-planner|angary|planner)(/|$)', message: 'Shared inquiry UI must not import a source’s components; the source publishes through InquiryAttachmentProvider.' },
];

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ['app/lib/planner/core/**/*.{ts,tsx}'],
    rules: { 'no-restricted-imports': ['error', { patterns: plannerCoreBoundary }] },
  },
  {
    files: ['app/lib/planner/grain/**/*.{ts,tsx}'],
    rules: { 'no-restricted-imports': ['error', { patterns: plannerGrainBoundary }] },
  },
  {
    files: ['app/components/planner/**/*.{ts,tsx}'],
    rules: { 'no-restricted-imports': ['error', { patterns: plannerUiBoundary }] },
  },
  {
    files: ['app/components/inquiry/**/*.{ts,tsx}', 'app/components/ProjectInquiryForm.tsx', 'app/components/InquirySection.tsx'],
    rules: { 'no-restricted-imports': ['error', { patterns: inquiryBoundary }] },
  },
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
    // Playwright's own generated report/output — same reasoning as coverage/** above.
    // Already gitignored, but a local `pnpm test:e2e && pnpm lint` (or `test:visual`)
    // otherwise lints Playwright's bundled trace-viewer JS in playwright-report/ and
    // floods the output with bogus findings on minified code.
    'playwright-report/**',
    'test-results/**',
  ]),
]);

export default eslintConfig;
