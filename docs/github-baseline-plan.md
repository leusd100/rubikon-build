# GitHub Baseline Plan

Prepared 29.08.2026, in parallel with the Step 01 deployment/smoke-test wait. Design-only — no
`.github/workflows/*.yml` was created from this document; that step is deliberately left for an
explicit go-ahead, per scope boundary #9 below. `.github/PULL_REQUEST_TEMPLATE.md`, `README.md` and
`.gitignore` were created/updated for real, since they're inert until someone opens a PR or runs git.

## Branch strategy

Minimal, matches a single-maintainer-plus-review workflow — nothing this project needs justifies
more process than this yet:

- **`main`** — always production-ready. Direct pushes disabled once the repo is on GitHub;
  everything lands via PR.
- **`feature/<short-name>`** — new capability (e.g. `feature/lead-capture` for what became Step 01).
- **`fix/<short-name>`** — bug fixes that aren't part of an in-flight feature branch.
- PR required to merge into `main`. No `develop`/`staging` branch — this site doesn't have a staging
  environment to target, so an intermediate branch would just be ceremony.

## Step 01 commit boundary

Checked via `git status`/`git diff --stat` — the working tree currently contains **only** Step 01
changes, nothing unrelated is mixed in.

**Files in Step 01** (10 modified + 4 new):

```
Modified:
  app/components/AnalyticsConsent.tsx
  app/components/DirectionDetail.tsx
  app/components/ProjectInquiryForm.tsx
  app/data/company.ts
  app/data/navigation.ts
  app/globals.css
  app/napryamky/page.tsx
  app/page.tsx
  app/polityka-konfidentsiinosti/page.tsx
  app/pro-nas/page.tsx

New:
  app/api/leads/route.ts
  app/components/InquirySection.tsx
  app/lib/attribution.ts
  migrations/0001_create_leads.sql
```

**Unrelated files:** none. This repo-hygiene pass added `README.md`, `.gitignore` edits, and
`.github/PULL_REQUEST_TEMPLATE.md` — those are a **separate** logical change from Step 01 and should
not go in the same commit (see recommendation below).

**Recommended commit message for Step 01** (Conventional Commits style, matches the scope actually
shipped):

```
feat(leads): add server-side lead capture, local inquiry forms, and attribution tracking

- New POST /api/leads route handler backed by Cloudflare D1 (leads, lead_submit_log,
  lead_notify_failures tables) — idempotent via client-generated submission_id, server-side
  validation/allowlists, IP-hash rate limiting (salted, no raw IP stored).
- New InquirySection component: embeds a local, context-preserving inquiry form on all 5 direction
  pages, /pro-nas, and /napryamky instead of bouncing every CTA to the homepage.
- Hero CTA + playbackRate=0.85 added to all 5 direction-page heroes.
- UTM/gclid/gbraid/wbraid/landing_page/referrer captured once per session (app/lib/attribution.ts)
  and attached to each submitted lead.
- GA4 generate_lead now fires only after a confirmed server-side save (and only once per lead, even
  on idempotent retry) instead of on CTA click.
- Telegram notification is best-effort: failures are logged separately and never fail or duplicate
  the underlying lead.
- Privacy policy updated to match actual server-side storage (previously stated the opposite).
- siteRoutes.contact is now a page-relative #inquiry anchor instead of always bouncing to the
  homepage; regression-tested against every page including polityka-konfidentsiinosti.

Ref: Lead & Conversion Architecture spec (frozen 29.08.2026). No Step 02+ scope included.
```

Suggested branch name: `feature/lead-capture`.

## CI design (proposal — not yet created as a workflow file)

Based strictly on scripts that exist today in `package.json`. Anything not listed below does not
exist and should not be assumed.

| Job | Command | Exists today? |
|---|---|---|
| Install | `pnpm install --frozen-lockfile` | — (standard pnpm CI invocation) |
| Lint | `pnpm lint` | ✅ yes |
| Typecheck | — | ❌ **missing** — no `typecheck` script in `package.json`. Recommend adding `"typecheck": "tsc --noEmit"` before wiring this job, rather than inventing a command that doesn't exist yet. |
| Build | `pnpm build` | ✅ yes |
| Unit/static tests | — | ❌ **missing** — no test runner is configured in this project at all (no Vitest/Jest/Playwright dependency present) |

Proposed shape once someone approves actually creating the workflow file (trigger: PR against
`main`; no deploy step, no secrets, no Cloudflare credentials — install → lint → build only until
`typecheck`/tests exist):

```yaml
# .github/workflows/ci.yml — NOT created yet, shown here for review only
name: CI
on:
  pull_request:
    branches: [main]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm build
```

## Future quality gates (post-baseline, Phase 7 — design-only, no infra touched now)

None of these are connected, configured, or given credentials right now. Listed so the eventual
work is scoped, not to imply any of it exists yet:

- **Lighthouse CI** — needs a deploy-preview URL per PR to actually measure against; this project's
  Cloudflare Workers deploy pipeline doesn't currently produce one automatically (no `wrangler.jsonc`
  in-repo, deploy is external) — scoping that preview-URL mechanism is its own task before Lighthouse
  CI is meaningful, not just a checkbox to add.
- **Accessibility scanning** (e.g. axe-core against key pages).
- **Broken-link check** across the 9 public routes + sitemap.
- **SEO sanity** — title/H1/canonical presence, matches the manual checks already done in
  `docs/task-02-google-indexing-analytics-audit.md`.
- **Dependency/security scanning** — `pnpm audit` or Dependabot/Renovate, plus secret-scanning
  (e.g. GitHub's built-in secret scanning, trivial to enable once the repo is on GitHub — costs
  nothing, recommend enabling immediately on repo creation rather than deferring to Phase 7).
- **Preview deployments** — blocked on the same external-deploy-pipeline question as Lighthouse CI
  above; needs to be answered before any of these four items can actually run against something real.

## Scope boundaries respected in this pass

- No Step 02 (Cloudflare image delivery / cache headers) work started.
- No production CI/CD created — the CI section above is a reviewed proposal, not a live workflow.
- No Cloudflare connection, deploy token, or auto-deploy configuration added anywhere.
- No placeholder credentials added to any file.
- No content/design change outside this repo-hygiene pass.
