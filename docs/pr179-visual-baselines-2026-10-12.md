# PR #179 — targeted visual baseline repair, 12 October 2026

Starting head: `4c66aaa41ab36360e599b52d66a41e270577a8d5`.
Base main: `68d718272df2bfad435af1910c3df2cf4addd99a`.

## Cause and scope

[PR Fast Gate run 38154887806](https://github.com/leusd100/rubikon-build/actions/runs/38154887806) failed exactly three visual scenarios: `homepage inquiry form` at 375×812, 768×1024 and 1440×900. The other 63 Linux visual scenarios passed; functional gates also passed. PR Gate failed because this selected visual job failed.

DEC-46 intentionally replaces the four equal channel buttons with one quieter row of links under the call. The old snapshots still record four buttons. On Linux the screenshot height changes from 775 to 743 px on phone and from 801 to 759 px on tablet; the desktop diff is 3%, above the unchanged 2% limit. Before/actual/diff images were inspected individually: contact labels, destinations, form state and journey remain present without overlap or clipping. Smaller channel controls explain the downstream vertical movement.

Only the three inquiry snapshots and their three macOS counterparts are refreshed. No application code, CSS, workflow, screenshot assertion, tolerance, mask or skip is changed by this repair. No blanket snapshot update was used. DEC-41 and DEC-46 remain design proposals for owner review; this test-maintenance commit does not approve a deployment or merge.

## Capture provenance

- Linux: copied the inspected `*-actual.png` images from [artifact 11708366922, changed-area-visual-diff](https://github.com/leusd100/rubikon-build/actions/runs/38154887806/artifacts/11708366922). The run's head SHA matches the starting head. All three artifact `*-expected.png` files byte-match the original branch baselines; retry actuals have identical bytes to the first actuals. Ubuntu 24.04 x64, official Playwright 1.62.1 Chromium.
- Darwin: official Playwright 1.62.1 Chromium 151.0.7922.34 / headless shell 1234, macOS ARM64, freshly built starting head. The three failures were reproduced before updating; every old/actual/diff was reviewed. Each platform uses its own capture; Linux images were not copied into Darwin baselines.
- Existing harness preserved: production build, light theme, uk-UA, reduced motion, fonts-ready wait, Turnstile stub, video abort, pointer parked outside content and CSS-pixel screenshots. Tests target localhost; no real lead or contact navigation is submitted.

## Local verification

- `pnpm lint`, `pnpm typecheck`, `pnpm build`: exit 0.
- `pnpm test:unit`: 85 suites / 1322 tests passed.
- Before repair: all three targeted Darwin inquiry snapshots failed for the expected screenshot differences.
- After repair: three targeted scenarios repeated twice, retries 0: **6 passed** (7.4 s).
- `ux-conversion-phase2.spec.ts` plus `pr-critical.spec.ts`, desktop Chromium, workers 2, retries 0: **66 passed** (48.3 s), including responsive dimensions explicitly set inside these tests.
- Full Darwin visual suite, workers 2, retries 0: **22 passed / 44 failed**. A separate checkout and freshly built base main, same dependencies/browser/flags, produces **22 passed / the exact same 44 failing scenario names**. There are no PR-only failures after the targeted repair. These are recorded below, not silently refreshed. Their precise original raster/capture cause is not established. This is not a claim that the full macOS visual suite passes.
- Fresh GitHub Linux checks on the resulting repair commit remain the merge gate. Their final result is recorded in the PR description.

Independent read-only review of the full PR implementation and six replacements found no actionable issue or weakening of the test contract. Contact destinations, 44 px channel target height, analytics counting, folded-form opening, and the deliberate /planner-preview legacy hero guard are preserved.

## Updated capture hashes

| File | SHA-256 |
| --- | --- |
| `homepage-inquiry-mobile-375-linux.png` | `ff019bb85a239895a95ff22f995e3a52b699174774d923ceeae3b1ac74ecc90e` |
| `homepage-inquiry-mobile-375-darwin.png` | `68a40f2256b95691e33d8acb9701254e205b5c56d5f7920fb5d6075a31daab11` |
| `homepage-inquiry-tablet-768-linux.png` | `4818e870ca25296d54d9d2f9b1ffb89f8545271976765227978e4f612278fe37` |
| `homepage-inquiry-tablet-768-darwin.png` | `f4dceb52b5ad8577bf120bb09ea6b70ce371cc9b5447d09a0a734ccabc9b2719` |
| `homepage-inquiry-desktop-1440-linux.png` | `445eca2372edbe8650cf9a61d17834195df0707deed919458652da038fba1293` |
| `homepage-inquiry-desktop-1440-darwin.png` | `8581878006f5eed154819cc6d1e4e1bbc369f64b5257fde4586010045cfdd6d4` |

## Full Darwin suite: failures reproduced on base main

- tests/e2e/brand-logo-visual.spec.ts:49:3 › header logo — mobile-390
- tests/e2e/brand-logo-visual.spec.ts:85:3 › footer logo — desktop-1440
- tests/e2e/configurator-3d-visual.spec.ts:105:3 › configurator 3D visual states › 1 — default complete shell, desktop
- tests/e2e/configurator-3d-visual.spec.ts:111:3 › configurator 3D visual states › 2 — frame only, desktop (the readability case)
- tests/e2e/configurator-3d-visual.spec.ts:122:3 › configurator 3D visual states › 3 — changed dimensions (wide and short)
- tests/e2e/configurator-3d-visual.spec.ts:133:3 › configurator 3D visual states › 4 — complete shell, tablet 820
- tests/e2e/configurator-3d-visual.spec.ts:140:3 › configurator 3D visual states › 5 — complete shell, mobile 390 (opt-in, no shadows)
- tests/e2e/configurator-visual.spec.ts:47:3 › hangar configurator visual states › default configuration (24×60×8, insulated, full scope, 1 gate)
- tests/e2e/configurator-visual.spec.ts:52:3 › hangar configurator visual states › changed dimensions (narrow + short + tall)
- tests/e2e/configurator-visual.spec.ts:58:3 › hangar configurator visual states › (C) full structural frame — no foundation, walls or roof
- tests/e2e/configurator-visual.spec.ts:64:3 › hangar configurator visual states › full envelope, undecided insulation, two gates
- tests/e2e/configurator-visual.spec.ts:77:3 › hangar configurator visual states — named build states (A–F) › (A) foundation only
- tests/e2e/configurator-visual.spec.ts:83:3 › hangar configurator visual states — named build states (A–F) › (B) foundation + frame
- tests/e2e/configurator-visual.spec.ts:92:3 › hangar configurator visual states — named build states (A–F) › (D) frame + walls, no roof yet
- tests/e2e/configurator-visual.spec.ts:98:3 › hangar configurator visual states — named build states (A–F) › (E) complete shell — foundation, frame, walls and roof, no gates
- tests/e2e/configurator-visual.spec.ts:104:3 › hangar configurator visual states — named build states (A–F) › (F) gates/openings — two gates, default envelope
- tests/e2e/configurator-visual.spec.ts:115:3 › hangar configurator visual states — responsive checkpoints (G–I) › (G) mobile 390
- tests/e2e/configurator-visual.spec.ts:121:3 › hangar configurator visual states — responsive checkpoints (G–I) › (H) tablet 820
- tests/e2e/configurator-visual.spec.ts:127:3 › hangar configurator visual states — responsive checkpoints (G–I) › (I) desktop 1440
- tests/e2e/configurator-visual.spec.ts:136:3 › hangar configurator visual states — edge scenarios (J–L) › (J) reduced-motion final state after a live interaction, not just an already-reduced-motion page load
- tests/e2e/configurator-visual.spec.ts:146:3 › hangar configurator visual states — edge scenarios (J–L) › (K) large hangar — max width/length/height
- tests/e2e/configurator-visual.spec.ts:153:3 › hangar configurator visual states — edge scenarios (J–L) › (L) minimal hangar — min width/length/height
- tests/e2e/grain-planner-visual.spec.ts:29:3 › Grain Planner visual contract › desktop initial
- tests/e2e/grain-planner-visual.spec.ts:34:3 › Grain Planner visual contract › desktop personalized result
- tests/e2e/grain-planner-visual.spec.ts:41:3 › Grain Planner visual contract › mobile 390 initial
- tests/e2e/grain-planner-visual.spec.ts:46:3 › Grain Planner visual contract › mobile 390 personalized result
- tests/e2e/visual.spec.ts:107:5 › mobile-375 › homepage directions grid
- tests/e2e/visual.spec.ts:116:5 › mobile-375 › homepage real object
- tests/e2e/visual.spec.ts:129:5 › mobile-375 › directions hub list
- tests/e2e/visual.spec.ts:137:5 › mobile-375 › representative direction cost
- tests/e2e/visual.spec.ts:162:7 › mobile-375 › process page — process-terms
- tests/e2e/visual.spec.ts:98:5 › tablet-768 › homepage hero
- tests/e2e/visual.spec.ts:107:5 › tablet-768 › homepage directions grid
- tests/e2e/visual.spec.ts:116:5 › tablet-768 › homepage real object
- tests/e2e/visual.spec.ts:129:5 › tablet-768 › directions hub list
- tests/e2e/visual.spec.ts:137:5 › tablet-768 › representative direction cost
- tests/e2e/visual.spec.ts:162:7 › tablet-768 › process page — process-scope
- tests/e2e/visual.spec.ts:162:7 › tablet-768 › process page — process-terms
- tests/e2e/visual.spec.ts:98:5 › desktop-1440 › homepage hero
- tests/e2e/visual.spec.ts:107:5 › desktop-1440 › homepage directions grid
- tests/e2e/visual.spec.ts:116:5 › desktop-1440 › homepage real object
- tests/e2e/visual.spec.ts:129:5 › desktop-1440 › directions hub list
- tests/e2e/visual.spec.ts:137:5 › desktop-1440 › representative direction cost
- tests/e2e/visual.spec.ts:162:7 › desktop-1440 › process page — process-scope
