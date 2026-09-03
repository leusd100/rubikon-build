# Hangar Build-up Phase 2 — Performance Measurements

Measured on `feature/hangar-build-up-phase-2`, via the running `vinext dev` server (localhost),
using the browser's own `performance.now()`/Navigation Timing APIs — not estimated, not derived
from theory. Same "measure the real thing, disclose the methodology" discipline as the earlier
Renderer Foundation Spike's SVG-vs-R3F comparison (`docs/renderer-foundation-spike.md`).

All dev-server numbers below are a **floor, not a production forecast** — no minification,
code-splitting, or build optimization applies to a `vinext dev` response. The architectural
properties they demonstrate (bounded node count, size-independent computation cost, single-frame
responsiveness) hold regardless of build mode; the absolute milliseconds would only improve under
a production build.

## 1. Scene node counts (small vs. large hangar)

Measured via `document.querySelector('.hc-preview-svg').querySelectorAll('*').length` — every SVG
element the preview renders, at full scope (foundation+frame+walls+roof, 2 gates, insulated).

| Hangar | Dimensions | SVG node count |
|---|---|---|
| Minimal (`DIMENSION_BOUNDS` min) | 10×10×4 m | **51** |
| Default | 24×60×8 m | **87** |
| Large (`DIMENSION_BOUNDS` max) | 60×120×15 m | **99** |

Node count is **bounded, not unbounded**: `frameBayCount()` clamps to 2–10 bays regardless of
span, so the 60×120 hangar (which would need 10 and 20 bays respectively on a naive fixed-spacing
rule) still only emits at most 10 wall/roof/column segments per dimension — the jump from default
(87) to large (99) is +12 nodes, not proportional to the 5× larger footprint.

## 2. Scene computation cost (`buildHangarScene` + `projectIsometricScene`)

Measured by dynamically importing the actual dev-server-served modules and timing 500 consecutive
calls per hangar size (after a 50-call warm-up), isolating the pure domain→scene→projection
pipeline from React reconciliation, layout, and paint:

| Hangar | ms per call (avg of 500) |
|---|---|
| Minimal (10×10×4) | **0.022 ms** |
| Default (24×60×8) | **0.024 ms** |
| Large (60×120×15) | **0.024 ms** |

Effectively free, and **independent of hangar size** — the same bay-count clamp that bounds node
count also bounds computation. This confirms the pipeline itself is never the bottleneck for
anything measured below; whatever latency shows up there comes from React/paint, not domain logic.

## 3. Rapid dimension changes

Measured end-to-end: dispatch a real `input` event on the width field (as a fast slider drag
would), wait 2 `requestAnimationFrame` ticks (this project's established responsiveness
methodology — see the renderer-spike doc), record elapsed time. 8 consecutive changes per run:

| Hangar size during the burst | Latencies (ms) | Average |
|---|---|---|
| Large (120m length, 15m height) | 23.6, 24.8, 33.3, 33.3, 33.4, 33.3, 33.3, 33.3 | **31.0 ms** |
| Small (10m length, 4m height) | 32.5, 34.1, 33.5, 33.2, 33.4, 32.9, 33.8, 33.2 | **33.3 ms** |

Both cluster right at the ~33.3ms floor of "2 animation frames at 60Hz" — i.e., the measurement
methodology's own floor, not a sign of the app struggling. Given §2 above, this is expected: the
actual geometry recomputation costs ~0.02ms, so 33ms is overwhelmingly React re-render + browser
paint, not scene computation. No meaningful difference between small and large hangars (31 vs.
33ms) confirms dimension changes stay responsive regardless of bay count.

## 4. Rapid scope toggles

Dispatched 12 rapid clicks (6 full on/off cycles) on the "Металокаркас" (frame) checkbox — far
faster than any real user, deliberately adversarial — then checked both timing and correctness:

- **Elapsed time for all 12 clicks to be dispatched and processed: 78.5 ms** (~6.5ms/click).
- **Final state was correct**: checkbox ended checked (12 clicks = 6 full cycles = back to the
  start), and columns/trusses immediately after the burst were mid-transition
  (`hc-phase-materializing`) — not stuck, not desynced.
- **500ms after the burst, all three frame layers (columns/trusses/purlins) had settled to
  `hc-phase-visible`** — confirms the interruption/convergence logic (layerLifecycle.ts) holds up
  under real, fast, repeated toggling, not just in the unit-tested reducer in isolation.
- **Zero console errors** during or after the burst.

## 5. Initial page load (dev server)

From `performance.getEntriesByType('navigation')[0]` on a fresh load of `/configurator-preview`:

| Metric | Time from navigation start |
|---|---|
| Response end (server responded) | 121 ms |
| DOM interactive | 275 ms |
| DOMContentLoaded | 275 ms |
| Load event | 346 ms |

As noted above, this is a `vinext dev` (unminified, unbundled, Vite-transformed-on-request)
number — a ceiling for how slow this could ever be, not a production estimate. It includes the
entire page (header, hero copy, cookie-consent banner) — not isolated to just the configurator
component — since that is what a real visitor's first paint actually waits on.

## Summary

Every number above is measured, not claimed. The build-up system introduces no new performance
concern relative to the pre-Phase-2 renderer: node count and computation cost both stay bounded
regardless of hangar size, dimension-change responsiveness is unaffected by hangar size, and rapid
adversarial scope-toggling converges correctly with no errors and no perceptible lag.
