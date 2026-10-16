# Handoff · Nightly server-request contract

2026-10-16; base main `5040fae038d32969a3cb6d54b67d43d6f4bd48e2`.

Nightly [38865321196](https://github.com/leusd100/rubikon-build/actions/runs/38865321196) failed before browser execution: the server-request unit guard rejected `direction-static-hero.spec.ts`'s direct `page.request.get`. The streaming regression added in #198 already used `Connection: close`; this was a helper-policy integration error, not proof that socket protection or the application was broken.

The spec now calls existing `getFromServer(page.request, path)`. The API context, URL and connection header are identical. Routed resource requests keep their own close header. All six partial-HTML stalls, CSP/resource handling, layout-shift assertions, image selection and viewport coverage remain unchanged. The #195 guard remains strict.

Local evidence: original unit guard fails on the direct call; after correction all 1391 unit tests across 90 files pass, with statement coverage97.39%, branch92.19%, function99.14%, line98.8%. Typecheck, lint and production build pass. The entire affected spec passes18/18 across desktop/mobile Chromium, with retries0. Three independent targeted stream/carousel/theme-persistence invocations each pass6/6 with retries0 (42.0s,41.6s,41.7s). A second full unit run after CI integration also passes1391/1391. Linux CI URLs and final results belong in the task's validation package.

No product source, snapshots, retry policy, timeouts, analytics settings, Hero/SW-01 or governance decisions changed. No merge/deployment. A successful local run is not a complete Linux Nightly result. Lighthouse performance failures and the intentional live-gtag contract dependency require separate evidence and must not be hidden by this change.
