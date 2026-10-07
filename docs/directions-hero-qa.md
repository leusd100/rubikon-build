# Directions hero and visual baseline review — 2026-10-07

The five clean `/napryamky` photographs and the revised hangar framing were reviewed on the local preview. The hangar has sky above its roof apex and sits below the fixed header. Portrait sources keep the subject visible on tall phones and tablets.

## Responsive coverage

`directions-hero-sequence.spec.ts` exercises all five decoded slides at 320×568, 375×812, 390×844, 430×932, 768×1024, 820×1180, 844×390, 1024×768, 1280×720, 1366×657, 1920×1080 and 2560×1080. It checks source selection, horizontal overflow, action bounds, the pause touch target, pausing across two slide intervals, and resuming with the keyboard. Each slide has a screenshot for visual inspection. The hero rhythm suite also checks spacing and the direction-list anchor.

The final desktop/mobile run passed all 32 cases. The clock is paused after hydration, so slow screenshot encoding cannot advance the carousel between explicit ticks. The focused visual run passed all 15 inquiry/process cases with the reviewed macOS baselines. TypeScript, targeted ESLint and diff checks passed. Light and dark hero layouts were also reviewed on phone and short-laptop viewports.

## Reviewed baseline refresh

PR #155 CI run `37590530644`, head `1ce1b67d344e5f7f3f92f2be7c3bd8f247bc3f4a`, failed 13 screenshot comparisons. They all concern the inquiry block and `/yak-pratsyuiemo`, which were already changed by the merged owner-notes redesign, `37d1dee` (#152). None of those application files differs between that base and this PR.

The before/after pairs in `changed-area-visual-diff` were reviewed: the smaller call button, the “Ви · Ми” route with its result drawings, the grouped responsibility table, the cost/schedule/change sheets, and the scope annotation alignment match that redesign. All three CI captures of each failed screenshot are byte-identical.

Only the 13 reviewed Linux baselines were copied from that same-head CI artifact. The matching macOS inquiry baselines were refreshed locally; the previously missing macOS process baselines were recorded and compared with the Linux layout. Screenshot tolerances and assertions are unchanged.

No application layout outside the directions hero is changed by this baseline repair. The PR is left for the owner to merge.
