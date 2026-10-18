# Final integration · #205 + #206 · 18 October 2026

The owner approved the result and asked to finish both PRs. #206 contains all #205 commits and was retargeted to main with `visual-freeze`. Integrate the final branch with a merge commit preserving that ancestry, then verify the actual PR states and public result. This scoped design approval does not accept Stage01, change its HOLD status, or resolve the inherited analytics/Lighthouse/delayed-font CLS work.

## Review and integration correction

Independent static review of `752cc01..d46984c` found no actionable P0/P1/P2 issue. It checked phone CSS scope, header lifecycle, eight scroll targets, CTA destinations, media policies and regression-test validity; it did not claim physical Safari or Linux pixel verification.

The first real main-targeted freeze run, [39119642465](https://github.com/leusd100/rubikon-build/actions/runs/39119642465), caught a process-page regression before any merge: the compact header is67px but the sticky responsibility switch retained77px, leaving a10px gap. The matrix header likewise retained the old143px offset. The unchanged critical test failed all three Linux attempts and failed locally on exact `d46984c`.

Opted-in inner-page phone Heroes now publish their67px + safe-top edge through the existing compact-header CSS variable. The process switcher and table head consume it; the table retains its existing66px switcher clearance. Other routes keep the77px fallback; HOME and widths above760px are unaffected. The original exact alignment assertions remain and additionally run with a47px simulated safe area. Independent review found no unintended scope or mask effects.

## Freeze contract

Follow [DEC-18 and the CI tier model](../ci-tier-model.md#design-iteration-and-visual-freeze): inspect the Linux `changed-area-visual-diff` artifact at the source head, update only intentional reviewed baselines from it, and require the final freeze PR Gate. Do not alter workflows, existing retries, tolerances or analytics/security to obtain a pass. Record the exact artifact and reviewed snapshot list in the integration evidence.

A headless WebKit check is not a physical iPhone test. The owner accepted HOME on iPhone12 and subsequently approved the combined result; do not relabel every emulated inner-page case as physical-device testing. Short viewports/enlarged text can scroll naturally. No real leads are submitted for verification.

## Release and recovery

After green selected checks, preserve all commits when merging the integrated PR. Verify the public HOME and inner routes, phone and wide header states, posters/video policy and contact/navigation access. Existing main analytics/Lighthouse/CLS acceptance remains separate.

If recovery is needed after an explicitly authorized release, prepare a revert of the integrated merge commit (`git revert -m 1 <merge-sha>`) as a separate reviewed change. No data migration is involved. This document does not authorize an independent deploy command or changes to Rulesets.
