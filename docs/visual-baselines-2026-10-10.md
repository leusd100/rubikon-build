# Reviewed visual baseline maintenance — 10 October 2026

Starting commit: `e7e3105708c136e628518f1858f47931dfe5be8a` (includes #169, #170 and #171).
No application, style, asset, business-rule, workflow or comparison-tolerance changes.

## Why the Linux gate failed

The exact 21 failures on the previous main and performance PRs were reproduced against this main
with production HTML/JS served locally and official Playwright 1.62.1 Linux Chromium in Docker.
The browser container is Linux ARM64; the application server/build runs on macOS ARM64. This is
not a full Linux build test. GitHub's Linux x64 check remains the release verification.

- 15 technical-view PNGs: #168 F20 fixes dimension-label scaling; F72 adds the ridge extension.
  Default, changed dimensions, foundation/frame/walls/roof/gates, 390/820/1440, reduced motion,
  minimum and maximum sizes were inspected against both old and current captures.
- Four 3D PNGs: #168 F68 moves cladding outside structural members. The opaque roof now hides
  rafters that previously protruded through it. Frame-only Linux PNG already passed and is kept.
- Render-tone guard: the same geometry change alters aggregate visible luma/silhouette, without
  changing lighting constants. Linux result is `61.51083561852311 / 0.23350654146444397`, matching
  the previous CI luma `61.5108`. The reviewed pin changes from `63.7019 / 0.2249` to
  `61.5108 / 0.2335065`; tolerances remain ±0.30 and ±0.002. Actual/expected/platform are attached
  to the report, including on failure, to make the next diagnosis easier.
- Tablet FAQ: current content and wrapping match the old Linux image; raster rows shift about
  one pixel (e.g. separators at y=80→81, 170→171, 249→250). No missing content or overlap was
  seen. The old capture lacks origin metadata, so the precise cause of the capture shift is not
  proven. Accept this reviewed low-impact difference; do not describe it as a production fix.

## macOS counterparts

The Darwin baselines were further behind than Linux: 20 configurator PNGs and all three FAQ PNGs
failed. Review confirmed older roof/frame geometry, labels, ridge readout and an earlier FAQ
composition with different questions and no contact panel. Each was inspected before copying
its own Darwin capture; Linux screenshots are never substituted for macOS screenshots.
The new tone pin also passes on macOS: `61.4763443 / 0.2334169`, inside unchanged tolerances.
Only these affected counterparts are refreshed; other Darwin sitewide baselines are outside
this targeted maintenance scope.

## Reproduction and review

1. `pnpm install --frozen-lockfile`, `pnpm build`; serve that checkout on its own port.
2. Run the visual project against the explicitly selected server. Preserve the default light
   theme, Ukrainian locale, reduced motion and fonts-ready waits in the existing harness.
3. Before: Linux selected 24 tests = 3 pass / 21 fail; Darwin selected 24 = 1 pass / 23 fail.
4. Copy only inspected actual PNGs into the matching platform snapshot directory. No blanket
   `--update-snapshots`, new skip, threshold relaxation, pixel masks or CI gate bypass.
5. Verify all Linux visual suites twice with retries disabled; verify the 24 selected Darwin
   tests twice. Check a deliberate key-light mutation fails the render-tone guard.
6. Review the PR images and its Linux x64 checks before owner merge. No deployment/merge is
   authorized by this maintenance task.

External evidence (local report output): `VISUAL_BASELINE_REVIEW_UK.html`, raw before/after JSON,
reviewed old/current/diff PNGs and the lighting mutation report. Final run totals and CI link
are recorded in the PR description and the accompanying Ukrainian report.

## Local validation result

- Linux: complete 66 visual scenarios × 2 = **132 passed**, 0 failed/flaky/skipped, retries 0,
  243.1 seconds. Docker image `mcr.microsoft.com/playwright:v1.62.1-noble`, 2 CPU, 2 GiB RAM.
- macOS: selected 24 configurator/3D/FAQ scenarios × 2 = **48 passed**, retries 0,
  72.4 seconds. Other Darwin sitewide suites have not been audited in this PR.
- Lint/typecheck/production build pass; **78 unit suites / 1272 tests** pass.
- Sensitivity check: intercept only the local ThreeHangarView JS response in a temporary test
  browser and change the key intensity 2.3→2.45. The unchanged guard fails on actual luma
  **63.6909864**, delta **2.1801864 > 0.30**. The app files/build are never changed; the temporary
  test is excluded from the commit. This expected diagnostic failure is not a release failure.

Owner review is still required for the baseline contract, especially the low-impact FAQ capture
shift with an unproven original capture cause. A green check confirms consistency with these
reviewed captures; it does not prove performance improvement or approve a deployment.
