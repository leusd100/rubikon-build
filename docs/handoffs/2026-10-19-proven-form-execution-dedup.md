# PR form execution deduplication

Base: `d723f579bcf18170248b26f8c303b1f4c3b9bc96`, inspected 2026-10-19.

When infrastructure or combined inquiry/leads paths select both jobs, Inquiry and Leads run the identical
39-test `tests/e2e/form.spec.ts` desktop suite. Both use the same checkout, downloaded `pr-production-build`,
setup actions, inherited production-build environment, browser project and Playwright settings.

Inquiry now owns this execution when both areas are selected. The standalone Leads job still runs for
leads-only changes. Its deliberate skip is explained in the PR Gate summary, including Inquiry's result.
PR Gate still depends on both jobs and preserves its existing failure checks; an Inquiry failure or
cancellation remains red. No test assertion, project, classifier rule, retry policy or budget changes.

| Inquiry selected | Leads selected | Before form executions | After | Owner |
|---|---|---:|---:|---|
| no | no | 0 | 0 | not selected |
| no | yes | 1 | 1 | Leads |
| yes | no | 1 | 1 | Inquiry |
| yes | yes | 2 | 1 | Inquiry |

## Evidence and cost

- [PR run 38867686597](https://github.com/leusd100/rubikon-build/actions/runs/38867686597), head `f9a532c1`:
  [Leads job](https://github.com/leusd100/rubikon-build/actions/runs/38867686597/job/116865098362)
  ran 39/39 tests in 43.5 seconds; whole job interval was 122 seconds.
  Inquiry in that same run ran 109 registrations, including those 39; 108 passed and one existing phone-only
  handoff test was skipped on desktop. The standalone job was not on the critical path.
- Current discovery, all PR areas selected in standard visual mode, reuniting each sharded suite once and
  retaining intentional theme repetitions: 802 scheduled registrations before, 763 after; identical set of
  670 distinct path/line/project/title identities. This is discovery evidence, not a measured new CI duration.
- Global discovery before/after is identical: 1,591 desktop/mobile functional registrations, 66 visual,
  19 Firefox and 19 WebKit; 1,393 unit cases. No registrations deleted.
- Historical 122 seconds is an example of avoidable summed job time per co-selected run. It does not prove
  a 122-second PR wall-time improvement or a monthly saving; GitHub billing was not queried.

## Local verification

- Production build passes on Node 24 with the unchanged lockfile.
- Retained desktop form suite: 39 passed, zero skipped/failed/flaky, retries 0, workers 2, production build;
  38.18 seconds including server startup. Lead API, Google and Turnstile are mocked by the existing suite.
- Unit suite: 1,393/1,393 pass; CI-classification subset: 35/35 pass.
- Both workflow versions parse as YAML; four selection combinations and 26 aggregate outcome scenarios
  preserve coverage and failure behavior. Aggregate failure shell logic is unchanged; summary reporting
  is verified for successful, failed and cancelled Inquiry ownership. Discovery is byte-for-byte equivalent
  at the suite-data level. `git diff --check` passes.

## Concurrent work and remaining blockers

No open build/control PR existed at inspection. Claude's local Stage 01/Wave 01 package was inspected
read-only, including registered worktrees. PRs #201–204 are already merged; do not reimplement them.
This change leaves pending OD-3/OD-8/OD-16 analytics selection, workflow-trigger/aggregate guards and
automatic changed-spec selection untouched. It shares the workflow file, but not their proposed logic.
No tracked uncommitted workflow/classifier changes were found in those registered worktrees.

The latest [Nightly 39218018347](https://github.com/leusd100/rubikon-build/actions/runs/39218018347) on the base
has 1,362 expected browser passes, 295 existing skips, no failed/flaky browser test. It is red on Lighthouse:
HOME performance .68 < .70 and CLS .159158 > .05; standard performance .69 < .70. All five HOME CLS samples
are .1449–.1592, with `.hero-copy` identified as the shifted element. Its precise causal change still needs
investigation. Earlier HOME LCP, standard responsive-image, live-gtag/CSP and UX failures remain in the
owner audit; none is removed or downgraded here. This PR does not claim to stabilize Nightly.

Strict flaky failure, Lighthouse budgets and reporting, baseline contracts, core lead/consent/security,
navigation, accessibility and reduced-motion assertions remain intact. Other handoff invocation overlaps
are next-PR candidates, not part of this change. Ambiguous unique-test removals require owner decisions.
No ruleset, DEC, baseline, merge or deployment is included.
