# Renderer Foundation Spike — SVG vs R3F Comparative Data

Status: **spike for an architecture go/no-go decision, not a shippable feature.** Builds on
`feature/hangar-configurator-poc` (PR #46, still unmerged) — this branch stacks on it directly.

## 1. What this batch actually did

Per the confirmed scope, in order:

1. **`ConfiguratorState → DomainModel`** (`app/lib/configurator/domainModel.ts`, new) — a
   normalized, JSON-serializable business object. Resolved scope booleans instead of a raw
   `scope[]` array; `areaSqm` computed once here.
2. **`DomainModel → SceneModel`** (`app/lib/configurator/sceneModel.ts`, new) — a
   renderer-neutral description of the hangar, entirely in metres. 7 primitive kinds:
   `foundation-slab`, `frame-column`, `frame-truss`, `envelope-panel`, `roof-plane`,
   `opening-cutout`, `dimension-guide`. No pixels, no Three.js vectors anywhere in this file.
3. **The existing SVG renderer adapted to SceneModel, with no visual redesign** —
   `isometricGeometry.ts` renamed to `isometricProjection.ts` and rewritten to consume
   `SceneModel` (iterating primitives) instead of computing pixels directly from raw dimensions.
   `HangarPreview.tsx`/`ConfiguratorSummary.tsx`/`HangarConfigurator.tsx` updated to read the new
   `DomainModel` instead of raw state. **Verified pixel-identical**, not just "should be similar"
   — see §2.
4. **An isolated R3F spike** (`app/r3f-spike/`, `app/components/r3f-spike/`) rendering the same
   `SceneModel`'s foundation/columns/trusses with `@react-three/fiber` + `three`, a fixed
   orthographic (true isometric) camera, and flat/stylized materials. No drei, no GLTF, no
   Blender assets — fully procedural, same as the SVG side.
5. **Measured SVG vs R3F** — see §3.
6. **Go/no-go recommendation** — §4.

Deliberately not touched, per scope: full build-up animation, walls/roof/gates in the R3F spike,
production integration, the animation state machine (starts only after the renderer decision).

## 2. "No visual redesign" — verified, not assumed

Direct numeric comparison against the pre-refactor `computeScene()` (git history) caught one real
discrepancy before it ever reached a screenshot: the old code *always* computed the foundation
polygon (for bounds/viewBox purposes) regardless of whether foundation was in scope — only the
caller decided whether to actually draw it. My first SceneModel draft omitted the primitive
entirely when out of scope, which quietly tightened the viewBox whenever foundation was hidden —
a real, if minor, visual change. Fixed by making `foundation-slab` always-present-with-a-
`visible`-flag (matching the existing `envelope-panel`/`roof-plane` pattern), the same way the old
code's bounds calculation worked.

After that fix: **all 4 committed visual-regression baselines from the POC branch
(`configurator-visual.spec.ts`) pass byte-for-byte unchanged**, and a direct numeric diff of every
coordinate (box corners, columns, dimension guides, bounds) between the old and new pipelines for
a representative state came back bit-identical. This is not "looks the same" — it's the same
render mechanism.

## 3. Measured comparison

All numbers from this machine, production build (`pnpm build && vinext start`), localhost (zero
real network latency — treat absolute times as a *floor*, not a real-world number; the *ratios*
are the meaningful part).

### Bundle size (gzip, the route's own JS — excludes the sitewide shared chunk, which is
identical either way)

| | Raw | Gzip |
|---|---|---|
| SVG configurator (all of `HangarConfigurator`+`ConfiguratorControls`+`ConfiguratorSummary`+`HangarPreview`+`isometricProjection`+`domainModel`+`deriveSummary`, `sceneModel` shared chunk included) | 14,698 B | 5,224 B |
| R3F spike (`three`+`@react-three/fiber`+scene code, no drei) | 886,557 B | 232,402 B |
| **Ratio** | **~60×** | **~44×** |

CSS: SVG's `configurator.css` 7,965 B / 1,986 B gzip vs R3F spike's `r3f-spike.css` 2,090 B / 844
B gzip (R3F's is smaller only because this spike has far fewer controls — not a renderer
property).

Confirmed via `dist/client/_next/static/chunks/index-*.js`: **byte-identical shared chunk in both
builds** — neither renderer's dependency leaked into the sitewide bundle every other page loads.

### Scene init (JS chunk download-to-ready, Resource Timing API, localhost)

| | Chunk download duration | Chunk ready at (from nav start) | `domComplete` |
|---|---|---|---|
| SVG configurator | 5.0ms | 16.6ms | 38.4ms |
| R3F spike | 135.1ms | 219.2ms | 159.9ms |

Note `domComplete` (159.9ms) happens *before* the R3F chunk finishes (219.2ms) — the heavy chunk
loads asynchronously after the rest of the page is already interactive, confirming the
code-splitting is working correctly. It's still ~27× slower to have the renderer itself ready,
before any WebGL context or Three.js scene construction begins. On a real mobile connection
(not localhost) this gap would be far larger in absolute terms — directly relevant to the
research finding cited in the architecture doc (§19: WebGL configurators lose over half their
visitors past an 8s load, 53% of mobile users abandon anything over 3s).

### Responsiveness (dimension change → visible update)

Two different things got measured, and they matter for different reasons:

- **Self-reported (R3F only, its own `useEffect`-based instrumentation)**: state commit → React
  re-render → Canvas commit: **3.5–5.1ms**.
- **External, matched methodology for both renderers** (dispatch a native `input` event on the
  width slider → wait 2 `requestAnimationFrame` ticks → measure elapsed, identical script run
  against both routes):
  - SVG: **18.7–33.4ms**
  - R3F: **24.0–33.4ms**

**Finding: once measured the same way, responsiveness is not a meaningful differentiator between
the two approaches at this scene complexity.** Both land in the same range, both bottlenecked on
browser frame-pacing rather than actual computation cost (`buildHangarScene` and the SVG
projection are both sub-millisecond pure JS). The self-reported 5ms number is real but measures a
narrower sub-interval than the external comparison — reporting only that number would have been
methodologically unfair to SVG. Don't decide the renderer question on responsiveness; decide it
on bundle size and implementation ceiling instead.

### Mobile

Both routes: no horizontal overflow at 390×844 (verified, `tests/e2e/r3f-spike.spec.ts` and the
existing `configurator.spec.ts` mobile suite), scene visibly renders on a 375px-wide viewport
(manually verified). No renderer-specific mobile fallback needed for either at this scene
complexity — the architecture doc's concern about R3F needing a mobile LOD/fallback strategy is
real for a *richer* scene (walls/roof/materials/lighting), not demonstrated as a problem by this
minimal spike specifically.

### Visual result

Screenshots delivered separately in chat (default state, frame-only state, matched
foundation+frame-only comparison between both renderers). Qualitatively: the SVG renderer's
existing dimension annotations, gate cutouts, and technical-drawing polish are more refined right
now, simply because that work has already been done for it (POC + this batch) and not yet
attempted for R3F. The R3F scene shows genuine volumetric depth and directional shading the SVG
version cannot (a real, structural difference, not a polish gap) — with the important caveat that
this spike's camera/zoom-fit math needed a real bug fix during development (see §5) to look right
at all, which is exactly the kind of 3D-specific complexity the architecture doc predicted.

### Implementation complexity

- **SVG projection**: `isometricProjection.ts` is ~250 lines of 2D trigonometry (isometric
  offset, lerp, bounds) — the same kind of code any competent frontend engineer on this team can
  read and extend, proven by this exact refactor being completed and verified in one session.
- **R3F spike**: required a custom fixed-camera component (`FixedIsometricCamera.tsx`) to get a
  true isometric (not perspective) projection — `<Canvas orthographic>` alone isn't enough; zoom/
  frustum fitting needed real analytic geometry (projected isometric width/height from the box
  dimensions), and the first version of that math was simply wrong (object rendered too small —
  a magic-constant fudge factor instead of the real formula; see §5). Also needed a documented,
  justified ESLint suppression (`react-hooks/immutability`) because this project's lint rules
  assume React owns everything a hook returns, which doesn't hold for a mutable Three.js camera
  object — a real, recurring category of friction this specific codebase's linting will keep
  raising against any R3F code, not a one-off.

## 4. Go/no-go recommendation

**This spike does not overturn the architecture recommendation's SVG-first call — if anything it
sharpens the reasoning with real numbers instead of estimates.** Bundle cost is confirmed large
and asymmetric (~44× gzip, ~27× slower to have the renderer ready even on localhost).
Responsiveness is confirmed *not* a differentiator at this scale, removing one hypothetical
argument for 3D. Implementation friction (camera math, lint friction, more moving parts for a
simpler visual result in the same time budget) is real, not hypothetical, now that both were
actually built.

What this spike **does** confirm works, cleanly, for whenever 3D *is* the right call: the shared
`SceneModel` genuinely feeds both renderers today (not a theoretical claim — the R3F spike
literally imports `buildHangarScene` from the exact same file the SVG renderer uses), and vinext's
architecture needs no special client-only wrapper to host either one (§5). The engine boundary
from the architecture doc holds up under a real second implementation, which was the actual
purpose of doing this now rather than waiting for Phase 3.

**Recommendation: proceed with SVG as the production renderer for Phase 2 (build-up animation),
keep this R3F spike's code in place (unmerged, on this branch) as a reference rather than deleting
it.** Revisit 3D only at the Phase 3 gate the architecture doc already named — if SVG materials/
animation can't clear the "premium, not toy" bar there — using this same spike's measurement
methodology (matched-methodology responsiveness test, gzip bundle delta, Resource Timing chunk
load) rather than re-deriving it from scratch.

## 5. vinext/Vite client-only mechanism — verified, not assumed

Per the brief's explicit instruction not to assume `next/dynamic({ssr:false})` is needed: **it
isn't, for this stack.** Verified directly (not reasoned about) with a throwaway test route before
writing any spike code:

- A plain `'use client'` component rendering R3F's `<Canvas>`, with **no** dynamic-import wrapper
  of any kind, **SSRs cleanly** — `vinext build && vinext start` serves a real `<canvas>` element
  in the server-rendered HTML (confirmed by reading the raw response), no server-side crash, no
  error. React Three Fiber's `Canvas` defers actual WebGL context creation to a client-side effect,
  so it degrades to an inert placeholder element during SSR rather than throwing.
- The heavy `three`/`@react-three/fiber` code is **automatically isolated into its own
  route-specific chunk** by the existing per-component code-splitting this project already
  relies on (the same mechanism that keeps `AnalyticsConsent`/`ProjectInquiryForm` etc. out of
  unrelated routes' bundles) — confirmed by diffing the shared `index-*.js` chunk's byte size
  before and after adding the R3F spike: unchanged.

Conclusion: no `next/dynamic`, no custom lazy-loading wrapper, no vinext-specific workaround was
needed anywhere in this batch. If a future production integration ever needs one (e.g. embedding
a renderer inside an already-hydrated page rather than its own route), that would be a distinct,
new question to verify the same way — not something to carry over from this finding by default.

## 6. Known limitations of this spike

- **Camera zoom-fit is analytic but simplified** — real isometric projected width/height from box
  dimensions, not the SVG's true per-primitive bounding-box computation. Correct for a box, would
  need generalizing for a non-box-shaped future object type.
- **No walls/roof/gates in the R3F scene** — deliberately out of scope per the brief; the visual
  comparison is therefore foundation+frame only, not full feature parity.
- **Materials are intentionally minimal** — flat colours + two lights, no attempt at the
  architecture doc's "stylized industrial" texture/pattern direction R3F could eventually support
  (e.g. via custom shaders) — this spike answers "does the pipeline work," not "what's the ceiling
  on visual quality," which was never its job.
- **No R3F equivalent of the SVG's dimension-guide rendering** — the spike doesn't draw dimension
  lines/labels in 3D space (a real, solvable but non-trivial problem — 3D text/line rendering
  needs either sprite-based labels or an HTML overlay synced to 3D coordinates, neither
  implemented here).
- **`localhost` timings are a floor, not a forecast** — the ~44× gzip/~27× chunk-load ratios are
  the load-bearing numbers; the absolute millisecond figures would look worse, not better, on a
  real mobile connection.

## 7. Tests

- `tests/unit/configurator/domainModel.test.ts` (new) — JSON-serializability, scope resolution,
  area calculation.
- `tests/unit/configurator/sceneModel.test.ts` (new) — structural assertions on
  `buildHangarScene()`'s primitive output (counts, presence/visibility flags, gate placement,
  bay-count scaling) — metres-based, no pixel coordinates.
- `tests/unit/configurator/isometricProjection.test.ts` (replaces `isometricGeometry.test.ts`) —
  same structural-assertion style as before, now exercising the two-step
  `buildHangarScene`→`projectIsometricScene` pipeline.
- `tests/unit/configurator/deriveSummary.test.ts` (updated) — now composes through
  `deriveDomainModel` first, matching the real pipeline.
- `tests/e2e/r3f-spike.spec.ts` (new) — smoke-level: loads, noindex meta present, a real WebGL
  context attaches to the canvas, no console/page errors, a dimension change doesn't throw, no
  mobile overflow. Matches this repo's existing smoke-test depth for a route whose future is not
  yet decided — not exhaustive behavioural coverage.

130/130 unit tests, full `pnpm test:e2e` (both projects, one pre-existing unrelated flake in
`direction-static-hero.spec.ts` reproduced as a clean pass in isolation — untouched by this
branch), all visual regression (25 sitewide + 4 configurator, byte-identical), lint, typecheck,
and `pnpm build` all pass.
