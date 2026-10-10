# HOME responsive poster discovery (2026-10-09)

## Reproduced cause

HOME's server-rendered `DirectionHeroVideo` preloaded and selected a fixed 752w phone poster. Hydration replaced it with the static image's 480w/752w srcset and `sizes="100vw"`. On a cold 390×844 / DPR 1 visit, Chrome requested 752w first and 480w afterward. The same two requests were reproduced on unchanged production at 20:05:40 UTC (23:05:40 Kyiv), not only on the local build.

The raw asset bodies are 115,190 B (752w) and 59,306 B (480w). The duplicate visit downloaded 174,496 B of poster bodies. The corrected local build downloaded only 59,306 B in two repeated cold runs: one removed request and 115,190 B less poster payload in that scenario. Header/transport sizes differ between local HTTP/1.1 and production CDN delivery.

At 390×844 / DPR 2, before and after both select the existing 752w asset (115,190 B). This fix does not claim savings for that profile. Phone runs attached no MP4 requests. The same duplicate was not reproduced on `/pro-nas`, so its media behavior is unchanged.

## Change

`DirectionHeroVideo` accepts optional responsive mobile-poster hints and applies the same srcset/sizes to its explicit preload and picture source. HOME passes its existing static-image candidates and `100vw`. The browser can discover the correct candidate before hydration. Other callers retain their existing defaults.

No images are re-encoded and no crops, colors, layout, video sources, playback timing, controls, X-Ray or forms change. Retina retains the larger existing source. Older browsers without responsive preload support may retain the larger fallback download; the picture remains functional.

## Validation and acceptance

The local production build passed lint, typecheck, all 76 unit suites / 1,236 tests and build. Lighthouse 13.5 recorded raw reports, traces and network logs with Chrome 154, viewport 390×844 and the same DevTools throttling profile (CPU ×4, request latency 562.5 ms, download 1,474.56 Kbps). Local tests used a read-only Brotli proxy to the production build; this origin uses HTTP/1.1 and is not a PageSpeed/production score predictor. Timing differences are not advertised as production gains.

Two browser regression cases in `hero-video.spec.ts` create cold contexts at DPR 1/2, assert the actual decoded current source, exactly one poster request and no phone video DOM. Existing hero playback/reduced-motion tests cover the unchanged desktop/tablet behavior in CI.

After owner-approved deployment, repeat cold runs against the same production URL with the same viewport/density, Chrome version and throttling. Acceptance: DPR 1 requests 480w only; DPR 2 requests 752w only; no mobile video, blank hero, image-quality loss or new CLS. Compare normal PSI mobile medians independently; do not promise a specific score increase from this DPR-1 fix.

An earlier `experimental.inlineCss` experiment did not change emitted stylesheet delivery and was discarded. It is not part of this patch and provides no evidence that CSS inlining would help or hurt this site.
