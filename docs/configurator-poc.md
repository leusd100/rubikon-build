# Live Hangar Configurator — Proof of Concept

Status: **POC for visual/UX review, not production-ready.** No pricing, no lead capture, no
engineering calculation. Isolated dev route, not linked from production navigation.

Live at `/configurator-preview` (noindex, excluded from the sitemap — see `robots.ts`).

## 1. Architecture

```
ConfiguratorState (React state, held by HangarConfigurator)
        │
        ├──> deriveSummary(state)        → ConfiguratorSummary   (pure, app/lib)
        │                                     used by <ConfiguratorSummary>
        │
        └──> computeScene(dimensions,gates) → IsometricScene     (pure, app/lib)
                                                 used by <HangarPreview>
```

`HangarConfigurator` is the only component that owns state (`useState<ConfiguratorState>`).
`ConfiguratorControls`, `HangarPreview` and `ConfiguratorSummary` are all pure presentational
consumers of that one state object — none of them store business state internally, exactly as
the brief asked for. The renderer (`HangarPreview` + `computeScene`) never sees `ConfiguratorState`
directly; it takes plain `dimensions`/`gates` and hands back plain `{x,y}` points, so plugging in
a different object type later (grain storage, etc.) means writing a new `computeScene`-equivalent,
not touching the renderer's rendering code.

## 2. Files added

```
app/lib/configurator/
  types.ts                — ConfiguratorState, bounds, labels, DEFAULT_CONFIGURATOR_STATE
  deriveSummary.ts         — pure state → summary view model (the one derived calc: area)
  isometricGeometry.ts     — pure dimensions → SVG polygon/line coordinates

app/components/configurator/
  HangarConfigurator.tsx   — orchestrator: owns state, lays out controls/preview/summary
  ConfiguratorControls.tsx — left panel: sliders+number inputs, envelope cards, scope
                             checkboxes, gates segmented control
  HangarPreview.tsx        — the SVG isometric renderer
  ConfiguratorSummary.tsx  — "Ваш об'єкт" panel (native <details>, collapsible everywhere)
  useLayerHighlight.ts     — tiny hook: true for ~260ms right after a value changes

app/configurator-preview/
  page.tsx                 — route entry, noindex metadata
  configurator.css          — scoped styles, NOT added to globals.css (see §6)

tests/unit/configurator/
  deriveSummary.test.ts
  isometricGeometry.test.ts

tests/e2e/
  configurator.spec.ts             — behavioural (CI-run)
  configurator-visual.spec.ts      — visual regression (not CI-run, see §8)

docs/configurator-poc.md           — this file
```

Modified: `app/robots.ts` (added `/configurator-preview` to `disallow`, same treatment as the
existing `/logo-variants`). Nothing else in the app was touched — no Home, no direction pages, no
lead backend, no Consent/GA4, no Sonar config, no SEO files beyond robots.ts.

## 3. State model

```ts
type ConfiguratorState = {
  dimensions: { width: number; length: number; height: number }; // metres
  envelope: 'cold' | 'insulated' | 'undecided';
  scope: Array<'foundation' | 'frame' | 'walls' | 'roof'>;
  gates: 0 | 1 | 2;
};
```

Default state is the brief's own reference example: `24 × 60 × 8`, insulated, full scope, 1 gate
— `≈1 440 м²`, matching §8 of the brief exactly.

Dimension bounds (`DIMENSION_BOUNDS` in `types.ts`) are explicitly UX-only: width 10–60 m, length
10–120 m, height 4–15 m (0.5 m steps). Both the on-screen note and this doc say plainly these are
not construction norms.

## 4. Renderer approach

Pure SVG, no library, no WebGL. `computeScene()` builds a **true isometric cube** — width, length
and height all share one scale (`PX_PER_METRE = 8`), so a longer building genuinely looks more
elongated rather than being squeezed to fit; the SVG's `viewBox` is computed from the actual
bounding box of every element on each render, so any aspect ratio fits without clipping instead of
needing a fixed canvas size.

Three faces per box (front/side/top), a small foundation slab prism, evenly-spaced frame column
lines (bay count scales with span, clamped 2–10 bays), 0–2 gate cutouts on the front facade only,
and three dimension-line guides (width/length/height) with tick marks and labels — all computed as
plain `{x,y}` points in `isometricGeometry.ts`, turned into `<polygon>`/`<line>`/`<text>` by
`HangarPreview.tsx`.

Envelope state is never colour-only (accessibility, §12 of the brief): "Утеплений" gets a ribbed
horizontal-line SVG `<pattern>` (sandwich-panel texture), "Ще не визначився" a 45° hatch pattern
plus reduced opacity, "Холодний" a flat fill. Missing scope items (`walls`/`roof` unchecked) render
as a dashed, unfilled outline rather than disappearing — reads as "open structure," not "bug."

## 5. Supported interactions

| Control | Preview reaction |
|---|---|
| Width / Length / Height | Facade width / receding depth / wall height scale live; the matching dimension label updates |
| Envelope (cold/insulated/undecided) | Wall + roof fill pattern changes (see §4) |
| Scope: Фундамент | Foundation slab appears/disappears |
| Scope: Металокаркас | Frame column lines appear/disappear |
| Scope: Стіни | Front+side face fill vs. dashed outline |
| Scope: Покрівля | Top face fill vs. dashed outline |
| Ворота 0/1/2 | 0, 1 or 2 gate cutouts on the front facade, evenly spaced |

Every changed layer briefly flashes its accent-coloured stroke (`useLayerHighlight`, ~260ms) via a
CSS transition — `prefers-reduced-motion` needs no special-casing here because the sitewide rule in
`globals.css` (`transition-duration: .01ms !important`) already collapses it; verified in
`configurator.spec.ts`'s reduced-motion test.

## 6. Bundle / dependency impact

**Zero new npm dependencies.** Everything is plain React + SVG + CSS.

The route is fully code-split and its CSS is a separate file (`configurator.css`, imported only by
`app/configurator-preview/page.tsx`) rather than added to `globals.css` — deliberately, after this
week's Lighthouse-budget lesson on the consent-model PR (adding to the sitewide stylesheet costs
every real commercial page render time, not just the page that needs it). Measured on the
production build:

- `HangarConfigurator-*.js` (all configurator components + hook, minified): **~12.4 KB**
- `page-*.css` (all of `configurator.css`, minified): **~8.0 KB**
- Sitewide `index-*.css` (globals.css bundle): **unchanged** (84,560 → 84,609 bytes — a ~49-byte
  hash/comment difference, not a real size change)

Both chunks load **only** when a visitor opens `/configurator-preview` — every other route's
payload is untouched.

## 7. Accessibility

- The SVG is `role="img"` with a dynamic `aria-label` describing the current dimensions — it is a
  presentation layer; every real fact (dimensions, envelope, scope, gates, area) is also in the
  text controls and the `<dl>` summary, never SVG-only.
- All inputs have real `<label>`s (sliders `aria-label`, number inputs `htmlFor`/`id`); envelope,
  gates and scope are native `radiogroup`/checkboxes, fully keyboard-operable.
- `:focus-visible` on every control uses the site's own `--focus-ring` token.
- Envelope/scope state is never colour-only (see §4).
- Summary uses a native `<details>` — collapsible with zero extra JS, keyboard-accessible by
  default.

## 8. Tests

**Unit (Vitest, run by CI's `pnpm test:unit`):**
- `deriveSummary.test.ts` — area recalculation, formatting, envelope/scope/gates labels, the "no
  scope selected" edge case, the brief's own 24×60×8→1440m² example.
- `isometricGeometry.test.ts` — structural/relational assertions only, per the brief's own
  instruction not to pin exact SVG coordinates: face point-counts, proportional scaling per axis,
  "true cube" (same scale on all 3 axes), gate count/non-overlap/facade-bounds, frame bay-count
  clamping, bounding-box containment.

**E2E (Playwright, run by CI's `pnpm test:e2e`):** `configurator.spec.ts` — noindex meta, the
disclaimer text, dimension→summary+label sync, area recalculation, scope toggle → layer
appear/disappear, gate count → shape count + summary text, reduced-motion (transition duration
≈0), and a mobile-viewport pass (no horizontal overflow, controls before preview in DOM order,
summary is collapsible).

**Visual regression (Playwright, `pnpm test:visual` / `test:visual:update` — *not* run by CI, same
as the pre-existing `visual.spec.ts`):** `configurator-visual.spec.ts` — default state, changed
dimensions, frame-only (no foundation/walls/roof), and full-envelope-undecided-two-gates. Darwin
baselines are committed; Linux baselines aren't generated from this sandbox (see Known limitations)
but this doesn't affect CI since the `visual-chromium` project was never part of the CI-blocking
`quality` workflow to begin with.

All 108 unit tests, the full `pnpm test:e2e` suite (both projects), lint, typecheck and
`pnpm build` pass on this branch. One pre-existing, unrelated flake was observed and reproduced in
isolation as a pass: `tests/e2e/direction-static-hero.spec.ts`'s CLS-measurement test occasionally
reports a near-zero (~0.00007) layout shift under full-suite parallel load — confirmed unrelated
(this branch never touches that file, the hero images, or `DirectionDetail.tsx`).

## 9. Known limitations

- **Proportions, not engineering.** No structural, load, or code-compliance logic anywhere —
  by design, per the brief.
- **Gates are always centred on the front facade only** — no side-wall openings, no windows, no
  door swing direction. Deliberately out of scope for v1 (§4 of the brief).
- **Dimension-line tick length is a fixed pixel value** in `isometricGeometry.ts`, so at the very
  extremes of the bounds range (10 m width vs. 60 m) tick marks look relatively larger/smaller
  than the drawing around them. Cosmetic only, not a correctness issue.
- **No undo/reset control** — reloading the page is the only way back to the default state today.
- **Linux visual-regression baselines are not committed** (only Darwin) — irrelevant today since
  `visual-chromium` isn't part of CI, but would need generating on a Linux runner before anyone
  tries to run `test:visual` in CI later.
- **Single hangar object type** — the state/derive/render split was built so a second object type
  (grain storage, etc.) is a new `types.ts`+`computeScene` pair, not a rewrite, but that's untested
  until it's actually attempted once.

## 10. What Configurator v2 would need

1. **A product decision**, not a technical one: which of pricing / lead-capture / additional
   object types / additional parameters (windows, insulation thickness, roof pitch, colour) to
   build next — this POC deliberately answers none of them.
2. If lead-capture: a real design conversation about how a configurator-originated lead differs
   from the existing direction-page `ProjectInquiryForm` flow (does it reuse the same `/api/leads`
   endpoint with a new `source`? A separate table?) — not a "just wire it up," per the existing
   lead-architecture spec's own discipline about not skipping the design step.
3. **Openings beyond gates** — the current front-facade-only gate model doesn't generalise to
   windows/personnel doors/side openings without a real opening-placement system.
4. **Persisted/shareable state** — a configuration currently lives only in React state; a v2 that
   supports "send me this configuration" needs a serialisation format (a URL query string is the
   obvious first move, given the state is already small and flat).
5. **A second object type** as the real test of the state/renderer boundary described in §1 —
   grain storage is the natural next candidate given the site's own direction pages.
