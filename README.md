# Rubikon Build

Marketing and lead-generation site for **Rubikon Build** — a family-run industrial construction
company (hangars, grain storage, steel structures, concrete, roofing) based in Dnipro, Ukraine.
Production: **https://rubikonbuild.com**

## Stack

This is **not** a plain Next.js app on Vercel. The actual runtime is:

- **[vinext](https://www.npmjs.com/package/vinext)** — a Next.js-API-compatible framework built on
  Vite (App Router, `next/image`, Metadata API, Route Handlers, Server Actions). Next.js itself is
  present as a dependency for its type surface, not as the execution engine.
- **Vite** as the build tool, via `@vitejs/plugin-react` and `@vitejs/plugin-rsc`.
- **Cloudflare Workers** as the deploy target, via `@cloudflare/vite-plugin`. Bindings (D1, secrets)
  are accessed with `import { env } from 'cloudflare:workers'` — no `getPlatformProxy()` or custom
  worker entry needed.
- **Tailwind CSS v4** (via `@tailwindcss/postcss`) alongside a hand-written design-token stylesheet
  in `app/globals.css`.
- **TypeScript**, strict mode.

## Local development

Scripts that actually exist in `package.json` — nothing below is invented:

```bash
pnpm install   # install dependencies
pnpm dev       # vinext dev — local dev server
pnpm build     # vinext build — production build
pnpm start     # vinext start — run a production build locally
pnpm lint      # eslint . --ignore-pattern dist --ignore-pattern .next
pnpm test:unit # Vitest tests for lead validation, idempotency, and rate limiting
pnpm test:e2e  # Playwright route, form-flow, and visual regression tests
pnpm test:lighthouse # Lighthouse mobile quality budgets for / and /angary (requires pnpm build)
```

Install the Chromium browser once before the first local smoke-test run with
`pnpm exec playwright install chromium`. There is currently **no `typecheck` script** in
`package.json`. If one is added later (e.g. `"typecheck": "tsc --noEmit"`), update this section and
the CI workflow together.

Visual baselines cover the homepage hero, directions, team and inquiry sections, plus the
directions hub and representative cost/FAQ sections at 375, 768 and 1440px. After an intentional
visual change, review the rendered diff before updating them with
`pnpm exec playwright test tests/e2e/visual.spec.ts --project=visual-chromium --update-snapshots=all`.

Lighthouse CI runs three mobile-emulated passes per route against the production build, then
evaluates their median results. The homepage has an intentional responsive autoplay hero and a
6 MB transfer ceiling; `/angary` retains the strict 900 kB ceiling used for standard pages. Both
profiles fail on regressions below the current quality floor: performance 70,
accessibility/SEO/best practices 95, CLS 0.05, LCP 5.75 seconds, or any browser console error. Unit
tests additionally cap each responsive Home hero video asset at 5 MB. The LCP and transfer budgets
remain regression guards on the local uncompressed server while production measurements continue
to target LCP below 3 seconds.
The route smoke suite also decodes every page image, rejects failed image requests, and confirms
that pages with responsive media actually select a generated `/media-responsive/` variant.

Requires Node.js `>=22.13.0` (see `engines` in `package.json`).

## Project structure

```
app/
  <route>/page.tsx        Next.js App Router pages (9 public routes + /logo-variants, an internal
                           noindex design-review page — see app/robots.ts)
  api/leads/route.ts       Lead-capture API route (POST → Cloudflare D1)
  components/              Shared UI: SiteChrome (header/footer), ProjectInquiryForm,
                            InquirySection, DirectionDetail (shared template for the 5 direction
                            pages), DirectionHeroVideo, MobileMenu, AnalyticsConsent
  data/                    Typed content: company info, the 5 directions, navigation routes,
                            per-direction page content, contact-method options
  lib/                     seo.ts (metadata helpers), attribution.ts (UTM/click-ID capture)
  hooks/                   useDeferredMedia — lazy-loads hero video respecting
                            prefers-reduced-motion and Save-Data
  types/                   Shared TypeScript types for direction-page content
  globals.css               Design tokens + all component styles (no CSS-in-JS)
migrations/                D1 schema (plain SQL, applied manually — see Deployment below)
public/                    Static assets: images, video, icons, brand marks
docs/                      Prior audit notes (e.g. Google indexing/analytics check)
proxy.ts                   Next.js 16 "proxy" (middleware): www→apex redirect, security headers
next.config.ts              CSP/security headers for page routes, dev/build config
vite.config.ts               vinext + Cloudflare Workers plugin wiring
```

## Runtime bindings

The lead-capture endpoint (`app/api/leads/route.ts`) expects these Cloudflare Worker bindings to
exist in production. **Names only** — see the Lead & Conversion Architecture spec for schema and
rationale; actual values are never committed to this repo.

| Binding | Type | Purpose |
|---|---|---|
| `DB` | D1 database | `leads`, `lead_submit_log`, `lead_notify_failures` tables |
| `IP_HASH_SALT` | Secret | Salts the rate-limit IP hash — the raw IP is never stored |
| `TELEGRAM_BOT_TOKEN` | Secret | Sends new-lead notifications |
| `TELEGRAM_CHAT_ID` | Secret | Where those notifications are sent |

## Deployment

**Production deployment is currently managed externally**, not from a `wrangler deploy` run out of
this checkout — there is no `wrangler.jsonc` in this repo, and Worker bindings are attached directly
via the Cloudflare Dashboard rather than declared in version control. Don't assume a `wrangler`
command works here without first confirming how the live deployment pipeline actually resolves
bindings.

To apply a new D1 migration: run the SQL file in `migrations/` against the `rubikon-leads` database
via the Cloudflare Dashboard's D1 console, or `wrangler d1 execute rubikon-leads --file=migrations/<file>.sql`
if you have `wrangler` authenticated against the right account.
