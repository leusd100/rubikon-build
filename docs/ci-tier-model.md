# RUBIKON BUILD tiered CI

## Workflow graph

Before:

```text
Pull request
├─ Quality: lint → unit → build → 487 browser tests
├─ Visual: focused visual suites
├─ SonarQube
└─ CodeQL
```

After:

```text
Pull request (opened, synchronize, reopened, ready for review, labeled, unlabeled)
├─ Classify changed areas + visual mode ─┬─ planner regression (conditional, 2 shards)
│                                        ├─ inquiry regression (conditional)
│                                        ├─ leads API regression (conditional)
│                                        ├─ configurator regression (conditional, 2 shards)
│                                        ├─ hero playback regression (conditional, every visual mode)
│                                        └─ visual regression (conditional; deferred for a design/* prototype)
├─ Fast Gate: lint → typecheck → unit → build → critical E2E
└─ PR Gate: stable aggregate result for branch protection

Push to main / workflow_dispatch
└─ build → full E2E (3 shards) + all visual (2 shards) → merged report

Nightly / workflow_dispatch
└─ lint + typecheck + coverage + build
   ├─ full E2E (4 shards)
   ├─ site-wide visual (2 shards)
   ├─ accessibility interaction suites
   └─ Lighthouse: home + standard + grain (parallel)
```

SonarQube and GitHub-managed CodeQL continue to report on pull requests but are not part of the
single aggregate merge gate.

## Auditable changed-area rules

The rules live in `scripts/ci/classify-changes.mjs` and use only exact paths and prefixes from the
pull-request diff.

| Area | Representative paths | Focused coverage |
| --- | --- | --- |
| Planner | `app/components/grain-planner/`, `app/components/planner/`, `app/lib/planner/`, `app/zernoskhovyshcha/` | Grain page, planner, mobile, stabilization, handoff and planner visual suites |
| Inquiry | `ProjectInquiryForm`, `InquirySection`, `app/components/inquiry/`, `app/lib/inquiry/` | Form, consent, GA endpoint checks and both attachment handoff suites |
| Leads API | `app/api/leads/`, `drizzle/`, `migrations/`, leads route unit test | Full unit gate plus mocked browser lead submission |
| Configurator | `app/components/configurator/`, `app/lib/configurator/`, configurator preview, `/angary` composition and tests | Configurator, 3D, build-up, accessibility and handoff suites in two shards |
| Brand visual | `public/brand/`, `SiteChrome`, favicon and brand snapshots | Brand visual suite |
| Shared/global visual | any CSS, root layout/page, top-level shared components, app data and shared media | Complete visual suites (deferred for a design/* prototype) plus the hero playback job (every mode) |
| CI infrastructure | workflows, local actions, CI scripts, package/lock/config files, Worker/Vite/CSP, shared hooks, consent/attribution | All focused areas, ensuring changes to the test system test the system itself |

## Required context

After this workflow has merged and produced its first status on `main`, configure the repository
ruleset with exactly one required status context:

```text
PR Gate
```

Do not require conditional job names: skipped areas intentionally do not create a blocking result.

A selected visual job with no suites fails closed. Classifier regression tests cover global-impact
paths and standalone CSS so the aggregate gate cannot turn green without the intended checks.

## Design iteration and visual freeze

Prototype fast → the owner approves the look on the preview → freeze → test hard. Screenshot baselines are maintained
at the freeze, not after every design experiment.

| Visual mode | Pull request | Changed-area visual regression | Everything else |
| --- | --- | --- | --- |
| prototype | `design/*` branch without the `visual-freeze` label | deferred: the job is skipped and the classifier prints a notice | blocking, as selected by the paths |
| freeze | `design/*` branch with `visual-freeze` | selected by the paths and blocking; PR Gate requires it | blocking, as selected by the paths |
| standard | any other branch (`fix/*`, `feat/*`, `ci/*`, …) | selected by the paths and blocking — unchanged | blocking, as selected by the paths |

The mode is computed in `scripts/ci/classify-changes.mjs` (`visualMode`, `withVisualMode`) from the branch name and the
labels, which reach it through the environment; `labeled` / `unlabeled` re-run the gate, so adding or removing the label
takes effect at once. The label must exist in the repository (Issues → Labels).

**Blocking in every mode:** Fast Gate (lint, explicit typecheck, unit tests — including the Delivery Model / P01 truth and
provenance tests — production build, critical desktop/mobile routes with the mocked lead submit); the planner, inquiry,
leads API and configurator suites when their paths change; hero playback (behaviour, not pixels) when shared visuals change.

**Only at freeze for a `design/*` pull request:** the changed-area screenshot suites (`visual.spec.ts` at 1440 / 768 / 375,
brand, configurator and planner visuals as the paths select them). After merge, the push-to-main run (full E2E + every
visual suite) and the nightly site-wide visual run stay as the backstop.

Merge a `design/*` pull request only once it is frozen and PR Gate is green. At the freeze:

1. the owner has approved the look on the preview (390 and 1440, Light and Dark where the page supports both);
2. add `visual-freeze`; review every diff in the `changed-area-visual-diff` artifact;
3. refresh only the reviewed baselines — Linux baselines come from that artifact for the same head;
4. verify reduced motion where motion changed and run the accessibility checks for the changed pages;
5. merge when every selected suite and PR Gate are green.

### Baselines are contracts

Visual baselines are contracts for approved UI, not design exploration artifacts. A baseline update is legitimate only
when the visual change is intentional, it has been reviewed, the design is entering its freeze (or a standard pull
request makes an intentional, reviewed change), and the new screenshot represents the desired UI. Never refresh snapshots
blindly to make CI pass.

### Screenshots record the default state

`expectStableScreenshot` (`tests/e2e/visual.spec.ts`) parks the pointer at the page's edge before every screenshot:
`preparePage`'s last click would otherwise leave it over a card or link, and the shot would depend on where it landed. A
hover or focus screenshot must request that state explicitly. Two baselines were recorded before this rule with the
pointer on a card — `homepage-directions` and `directions-hub` — and keep `legacyPointer: true` until they are refreshed
at their next freeze.

### Sonar and coverage

SonarCloud keeps reporting on every pull request (outside the single PR Gate context, as before). Coverage is measured on
logic only — `vitest.config.ts` includes `app/**/*.ts` and `sonar.coverage.exclusions` mirrors it, excluding `.tsx`
components and CSS — so prototype CSS/SVG work needs no tests written for a number, while projections, mappings, business
rules and interactive behaviour keep theirs.

