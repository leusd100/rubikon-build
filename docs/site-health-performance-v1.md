# Site health, performance and code-quality pass v1 — 2026-10-01

Baseline: `main` 15281ff (#135) = production. Branch `audit/site-health-performance-v1`, not merged. The full report
(Ukrainian, with every table) is the published artifact linked from the pull request; this file keeps the facts the
next pass needs. No business copy, P01 boundary, Delivery Model meaning, analytics definition or planner logic changed.

## How it was measured

- **PageSpeed Insights** (pagespeed.web.dev UI, Lighthouse 13.5): the API has no key (`PAGESPEED_API_KEY` is not set,
  anonymous quota returns 429). One run per form factor on `/`, `/yak-pratsyuiemo`, `/pro-nas`, `/angary`,
  `/zernoskhovyshcha`, `/napryamky`. **Field data (CrUX): none on any route** — not a failure, low traffic.
- **Lighthouse 12.6 locally** through `scripts/perf/lhci-server.mjs` (see below), mobile, median of 3, `main` and this
  branch side by side. Run-to-run spread on LCP is ±0.5–1 s; only byte and accessibility differences are claimed.
- **Network**: Chrome (not headless shell, for H.264), CDP transfer sizes, 390×844 (DPR 3) and 1440×900, no cache,
  4 s + scroll + 15 s dwell. With the HTTP cache **enabled**, re-attached hero videos are served from cache (206, 0 B):
  a cache-disabled probe double-counts them.
- **axe-core 4.13** (the version in PSI) on 11 routes × 390/1440 × Light/Dark, before scrolling (what Lighthouse sees)
  and after every scroll-reveal block has fired.
- **Computed-style diff**: every element's box and 28 computed properties, `main` vs branch, 10 routes × 3 sizes ×
  2 themes, reduced motion. Identical (a `main`-vs-`main` control is identical too).
- **Responsive**: 15 viewport sizes incl. short laptops (1250×613 … 1536×900) × 11 routes.

## PSI baseline (production, lab)

| Route | Mobile Perf / LCP | Desktop Perf / LCP | A11y | Notes |
|---|---|---|---|---|
| `/` | 84 / 3.9 s | 99 / 0.7 s | 100 | LCP = hero still; 994 KiB mobile |
| `/yak-pratsyuiemo` | 80 / 4.4 s | 99 / 0.8 s | **97** | contrast of the RUBIKON chip before reveal (fixed) |
| `/pro-nas` | 84 / 3.8 s | 99 / 0.8 s | 100 | 3.87 MB mobile, phone montage 3.38 MB |
| `/angary` | 80 / 4.2 s | 98 / 1.0 s | 100 | hero 1536w 394 KiB |
| `/zernoskhovyshcha` | 79 / 4.1 s | 98 / 1.0 s | 100 | text LCP, render delay 2.4 s |
| `/napryamky` | 79 / 4.1 s | 99 / 1.0 s | 100 | 3 sequence slides at load |

Best Practices and SEO 100 everywhere; TBT 0–10 ms; CLS 0–0.001.

## Confirmed defects

| Defect | Status |
|---|---|
| `/napryamky` → `/yak-pratsyuiemo#formaty` (id renamed to `obsiah` by #128) | fixed + smoke test |
| 404: header/menu «Контакти» (`#inquiry`) had no target | fixed (shared conversation block) + smoke test |
| `/polityka-konfidentsiinosti` inherited the home page's og:title/description/url | fixed + smoke test (og:url = canonical) |
| Nightly Lighthouse red every night: `vinext start` serves JS/CSS uncompressed | fixed (`scripts/perf/lhci-server.mjs`) |
| `/yak` chip at opacity .25 before reveal → axe colour-contrast ×3, PSI A11y 97 | fixed (clip-path wipe) |
| PSI monitor reports success but never measures (no API key) | owner: add the secret |
| Media never answer `Range` with 206 (full 200, no `Accept-Ranges`) | iOS Simulator (iOS 27, 2026-10-02): the hero videos play anyway; one check on a physical iPhone with an older iOS remains |
| `/pro-nas` phones download two posters (SSR desktop-variant 768w + phone poster) | backlog |

## Fixes on the branch

1. `266d0e3` stale anchor + 404 `#inquiry` target; smoke test for every in-site fragment link. `1dcab62` replaced the
   first 404 fix (the shared conversation block): the root not-found tree is serialized into every page's RSC payload,
   so the block added ~10 KB of HTML to each page. The 404's action row now carries the phone and email.
2. `0cb3b49` privacy page Open Graph; smoke test og:url = canonical.
3. `d025dd9` messenger icons as `<img>`: the `next/image` client chunk (46.7 KB raw, 16 KB on the wire) no longer
   loads on any public page.
4. `0c97646` `/yak` contract chip wipes in (clip-path) instead of fading from .25.
5. `0b53af4` full-bleed hero artwork WebP q90 → q85: 44 files 7.40 → 5.61 MB (−24 %), SSIM 0.975–0.985 vs lossless;
   unit test that every literal public asset path in `app/` exists.
6. `1fd81b4` 133 dead CSS rules (index.css 124 684 → 111 805 B), orphan `HomeHeroVideo.tsx`, six video originals
   superseded by #108 (17.9 MB).
7. `6a83958` Lighthouse CI through a compressing proxy.

## Before / after

See the report for the full tables. Measured, not estimated:

| What | Before (`main`) | After (branch) |
|---|---|---|
| `image-*.js` (next/image) on public pages | every page, 16 KB on the wire | none |
| Shared `index.css` | 124 684 B, br 22 093 | 111 805 B, br 19 978 |
| 44 hero files | 7.40 MB | 5.61 MB |
| Deploy `media` + `media-responsive` | 102.8 + 11.35 MB | 84.9 + 9.59 MB |
| HTML per page | — | within ±0.4 KB (after `1dcab62`) |
| axe, 11 routes × 390/1440 × Light/Dark, before and after scroll | 40 / 44 runs clean (`/yak` before scroll) | 44 / 44 |
| Computed styles + boxes, 10 routes × 3 sizes × 2 themes | — | identical |
| Nightly Lighthouse, repository config, run locally | red (CI: 0.62–0.63, LCP 7.2–7.7 s, 1.06–1.11 MB) | passes (grain 0.80, 4.25 s, 470 KB) |

Transfer per page view without video (Chrome, no cache, through the compressing proxy): JS −13 to −15 KB on every
page; CSS −2 KB; direction pages −53 to −116 KB of images; `/napryamky` −245 KB (390) and −359 KB (1440).
Lighthouse mobile medians moved within run-to-run spread (e.g. `/` 83 → 86, `/angary` 76 → 78); not claimed.

## Artbrain Site Checker (all 10 sitemap routes, production)

Overall 94–95, SEO 100 (96 on `/pro-nas` and the privacy page: description length), Security 95 (CSP `unsafe-inline`),
Speed 83–93 (its PSI lab run, available on every route; CrUX insufficient), Mobile 100, 0 critical. Per finding:
CSP `unsafe-inline` — sitewide trade-off (RSC inline payload, theme init, gtag consent default), nonce work is P3;
DMARC `p=none` — confirmed via DoH, owner/DNS; HTML 137–215 KB and inline JS — vinext RSC payload (53–59 % of the
HTML, 24–36 KB br), plus the `/angary` configurator SVG; "images without dimensions cause CLS" — false positive (fill
images in CSS-sized boxes: boxes identical with images blocked, CLS 0–0.003); `/yak` lazy-loading — false positive (the
LCP hero); `/pro-nas` description 170 chars — owner copy decision. Artbrain's `html_size` on the preview is what caught
the +10 KB-per-page regression of the first 404 fix; after `1dcab62` the preview is back to production's sizes.

## Performance budgets (proposed from the measurements)

| Budget | Now (production / branch) | Proposed |
|---|---|---|
| HTML per page (br) | 18–37 KB | ≤ 40 KB |
| JS per page (transfer) | 158–239 KB → 142–223 KB | ≤ 230 KB; route-specific ≤ 60 KB |
| Render-blocking CSS (br) | 27–39 KB | ≤ 40 KB |
| Fonts | 120–206 KB, ≤ 10 files | ≤ 210 KB |
| LCP hero image | 768w 67–94 KB, 1536w 214–305 KB | ≤ 100 KB (768w), ≤ 320 KB (1536w) |
| Video before interaction (first 4 s) | HOME 1440: 1.3 MB; /pro-nas phone 3.46 MB | desktop ≤ 1.5 MB; phone: a still or ≤ 1.5 MB |
| Mobile lab LCP (PSI) | 3.8–4.4 s | ≤ 4.0 s now, 3.5 s target |
| CLS / TBT (lab) | 0–0.003 / 0–20 ms | ≤ 0.02 / ≤ 100 ms |
| Field (once CrUX exists) | — | LCP p75 ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1 |

Lighthouse CI keeps its current assertions until a week of nightly runs through the proxy exists; then tighten
`total-byte-weight` (900 KB → ~700 KB) and LCP (6.1 s → ~5 s) from the medians.

## Backlog

- **P3** iOS playback without Range — tested in the iOS Simulator (iOS 27, Mobile Safari, 2026-10-02): `/pro-nas` on
  iPhone 17 plays (the round «Пауза» control, which renders only after `playing`, is shown; 26 % of the hero's pixels
  change in 2 s) and HOME on iPad (A16) portrait plays the tablet montage (29 %). The simulator has only iOS 27 and the
  Mac's media stack, so check once on a physical iPhone with an older iOS; only if it fails, enable Workers Caching
  (`cache.enabled`, which slices ranges from the cached full response).
- **P2** `PAGESPEED_API_KEY` secret (or make the monitor report "skipped", not "success").
- **P2** `/pro-nas` video weight: phone montage 3.46 MB is the largest mobile payload on the site and becomes the LCP
  element in 4 of 6 local Lighthouse runs (LCP 21 s, simulated full download); desktop five clips 7.66 MB.
- **P2** Dependency PR: react / react-dom / react-server-dom-webpack 19.2.6 → 19.2.8; `next` ≥ 16.3.6 only after a
  vinext compatibility check. `pnpm audit` (3 critical, 33 high) has no path reachable in the production Worker: no
  Server Functions, no Next.js server, the rest is dev tooling. `node_modules` is shared by every RUBIKON worktree, so
  upgrades need their own install.
- **P3** detail-illustration `sizes` (64vw vs ~45 % actual), `/pro-nas` phone poster, `/yak` 242 KB CSS background,
  `/api/leads` body-size cap, a line explaining the disabled submit without JavaScript, `HomeSections.tsx` +
  `home-proof.test.ts`, generator source PNGs (26 MB) out of `public/`, ~40 unreferenced media files (~10 MB),
  `--hv2-*` aliases, LHCI diagnostics upload, forced-reflow attribution, CSP nonces.
- Hero call below the first screen: 320×640 (7 routes), `/napryamky` 360×740 (−17 px), `/yak` 1250×613 (−40 px).

## Not worth doing

PSI «unused JavaScript» (framework runtime), «render-blocking» (no critical-CSS inlining in vinext; files already split
per route), «cache lifetimes» for unhashed `/media/*`, «legacy JavaScript» (Cloudflare beacon), non-composited SVG
stroke animations, WebP below q85 (visible smoothing at q80), trimming or re-encoding the `/pro-nas` desktop clips
(≈10 % / ≈5 %), dropping a font family, chasing mobile 100 without field data.
