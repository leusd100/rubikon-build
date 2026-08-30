# Project Radar — isolated prototype

Proves out the core design from `docs/project-radar-mvp.md` end-to-end — identity/dedup, a
transparent scoring function, classification, and Telegram message formatting — entirely with
synthetic data. **Nothing here touches the production app, calls any network API, or scrapes any
real website.**

- No import from this folder is used by `app/`, and nothing in `app/` is imported here.
- No D1 database is created or connected — `rubikon-intelligence` doesn't exist yet.
- No Rabotniki.ua scraping — `FixtureSourceAdapter` returns hardcoded synthetic data instead of a
  real `fetchRaw()` implementation, standing in for what a real adapter would eventually do.
- No Telegram API call — `telegramFormatter.ts` only builds the message string.

Excluded from the app's own `pnpm lint` run (see `eslint.config.mjs`) since it has its own
`tsconfig.json`, not part of the app's TypeScript project.

## Structure

```
radar-prototype/
  src/
    types.ts               NormalizedOpportunity, SourceAdapter contract, scoring types
    categorize.ts           keyword-based category detection
    dedupe.ts                (source, sourceItemId) identity + documented content-hash fallback
    score.ts                  configurable 0–100 Rubikon Score + HIGH_PRIORITY/REVIEW/IGNORE
    telegramFormatter.ts       pure message formatter, no network call
    fixtures.ts                18 synthetic construction-tender listings — SYNTHETIC/TEST DATA,
                                 all URLs on the reserved .invalid TLD, never a real site
    adapters/fixtureAdapter.ts  SourceAdapter implementation over the fixtures
    run.ts                     local runner — prints the full pipeline to the console
  test/                        node:test suite (see below)
  tsconfig.json                standalone compiler config — not the app's
```

## Running it

Uses the `typescript` package already in the repo's `devDependencies` — no new dependency added.

```bash
# from the repo root
pnpm exec tsc -p radar-prototype/tsconfig.json

# run the prototype
node radar-prototype/dist/src/run.js

# run the tests (Node's built-in test runner — no test framework dependency added)
node --test radar-prototype/dist/test/*.test.js
```

## Tests

No test framework exists in this repo's `package.json` today (`pnpm lint` is the only check
script). Per scope instructions, one wasn't introduced just for this prototype — the test suite
uses Node's built-in `node:test` + `node:assert/strict` instead, which requires nothing beyond the
Node version this project already requires (`>=22.13.0`).

Covers: both dedup identity strategies (stable-id and the content-hash fallback, including that
they're deterministic and case/whitespace-insensitive), category detection at strong/weak/none
confidence, score determinism, that the breakdown always sums to the total, specific factor
behavior (missing deadline, missing budget, the "distant but large enough" region bonus),
classification threshold behavior under a custom config, the full fixture set's category validity,
that a second poll of the same listings dedupes every item, and that the ten fixtures produce at
least one of each classification.

## Calibration

`docs/project-radar-calibration.md` has the full 18-fixture scoring table plus a "questionable
results" analysis (keyword false positives, an already-expired deadline still scoring
HIGH_PRIORITY, a real project under-scoring due to Ukrainian inflection defeating a keyword
substring match) with proposed hard gates — **none implemented yet**, waiting on a business read of
the table before `score.ts`/`categorize.ts` change at all.

## Next steps (not part of this prototype)

Replacing `FixtureSourceAdapter` with a real Rabotniki.ua adapter, wiring up the real
`rubikon-intelligence` D1 database, an actual Telegram API call, and a Cloudflare Cron Trigger are
all explicitly out of scope here — see `docs/project-radar-mvp.md` §Explicit non-goals and the
scope boundaries given for this prototype itself.
