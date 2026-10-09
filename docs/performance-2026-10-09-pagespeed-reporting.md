# PageSpeed monitor: reproducible reporting (2026-10-09)

The performance audit found that `Boolean(loadingExperience.metrics)` marked an empty CrUX map as available field data. The report also called `GITHUB_SHA` the measured commit, although it is the workflow checkout and the live deployment is not independently verified. These are reporting defects, not production Core Web Vitals failures.

## Changes

- Field availability requires an actual numeric CrUX percentile and records URL and origin metric names separately. Partial field data does not establish a CWV pass; missing data does not establish a failure. Lab TBT is not field INP.
- Headline Lighthouse metrics remain separate from observed trace timings. Each run records its fetch time, request count, Lighthouse version, throttling and viewport settings; full metadata is retained in `summary.json` and raw reports.
- Runtime errors, missing headline metrics, invalid scores and missing/invalid timestamps do not contribute to medians. Cached analyses are still excluded by fetch time, with the existing bounded retry behavior.
- `--strategy mobile|desktop|both` allows a targeted check. Manual workflow runs expose the same choice. The scheduled and deployment defaults remain three independent analyses per form factor; a targeted one-run check needs one initial PSI request instead of six. Error/cached-analysis retries can require additional requests.
- Arguments are validated before requests. Missing-key reporting describes the actual skip without asserting that Google's anonymous quota is exhausted.

## Validation

Unit fixtures cover Lighthouse 12/13 LCP formats, empty and partial field data, observed versus simulated clocks, invalid analyses, independent/cached results and argument validation. A child-process CLI integration test replaces `fetch` before loading the script and verifies both single-profile modes and the six-call default, including exported files and selected medians. It uses a fixture key and makes no network requests.

For an authorized real check, use the existing configured GitHub secret through the PageSpeed Monitor manual workflow. Choose the route URL, one form factor and one run when checking availability; use three independent runs with the same settings when comparing a change. Do not read or print the secret. Raw reports, exact test configuration and deployment provenance are necessary when comparing tools; scores from different profiles are not interchangeable.

No site rendering, analytics definitions, contact flow, deployment settings, scores-as-gates or publication behavior changes in this patch.
