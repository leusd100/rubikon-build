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
Pull request
├─ Classify changed areas ─┬─ planner regression (conditional, 2 shards)
│                          ├─ inquiry regression (conditional)
│                          ├─ leads API regression (conditional)
│                          ├─ configurator regression (conditional, 2 shards)
│                          └─ visual regression (conditional)
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
| Inquiry | `ProjectInquiryForm`, `InquirySection`, `app/components/inquiry/`, `app/lib/inquiry/` | Form, consent and both attachment handoff suites |
| Leads API | `app/api/leads/`, `drizzle/`, `migrations/`, leads route unit test | Full unit gate plus mocked browser lead submission |
| Configurator | `app/components/configurator/`, `app/lib/configurator/`, configurator preview and tests | Configurator, 3D, build-up, accessibility and handoff suites in two shards |
| Brand visual | `public/brand/`, `SiteChrome`, favicon and brand snapshots | Brand visual suite |
| Shared/global visual | global CSS, root layout/page, top-level shared components, app data and shared media | Complete site-wide, brand, planner and configurator visual suites |
| CI infrastructure | workflows, local actions, CI scripts, package/lock/config files | All focused areas, ensuring changes to the test system test the system itself |

## Required context

After this workflow has merged and produced its first status on `main`, configure the repository
ruleset with exactly one required status context:

```text
PR Gate
```

Do not require conditional job names: skipped areas intentionally do not create a blocking result.
