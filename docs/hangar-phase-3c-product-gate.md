# Hangar configurator — Phase 3C product gate

Review date: 5 September 2026. Base: `8152d949ebb6d95865c1e677db0524d349c1a923` (main, PR #70).

The supplied starting premise has been overtaken by main. Phase 3C already merged in [PR #58](https://github.com/leusd100/rubikon-build/pull/58), followed by Phases 3D–3F. This PR is a selective follow-up to the current product. It adds no new configuration fields or toolbar actions.

## Decision matrix

Costs are the incremental cost of developing or extending the capability, not sunk implementation cost. Values are product-review judgments, not measured conversion effects.

| Candidate | User value | Visual value | Business value | Implementation cost | Performance cost | Mobile cost | Maintenance cost | Decision |
|---|---|---|---|---|---|---|---|---|
| Restrained orbit | Medium: otherwise-hidden faces | Medium | Low at present | High: bounds, fit, reset, camera lifecycle | Rendering during motion | High: gesture arbitration | High | DEFER |
| Curated colour presets | High: compare finished appearance | High | Medium: concept discussion | Low for existing system | One invalidation; same materials/geometry | Low | Low | KEEP existing palette; fix keyboard operation |
| Expanded viewing | High: readable gates and envelope on laptops | High | Medium | Low for existing system | Larger framebuffer, same Canvas | Medium | Low | KEEP; finish modal accessibility |
| Screenshot/share | Medium potential, no confirmed workflow | Low | Unproven | Medium | One-off capture | Medium | Medium | DEFER |
| Additional openings/placement | High for some inquiries | Medium | Potentially high | High: geometry, validation, renderer parity | Low if bounded | Medium | High | DEFER; retain current 0–2 gates and two real sizes |
| Scale cues | Medium for the existing optional person | Medium | Low | Low for existing primitives | Two optional meshes; no downloads | Low | Low | KEEP existing optional person; REJECT decorative vehicle catalogue |

Free camera, unrestricted colour picking and a scene-prop catalogue are REJECT. No rejected experiment entered the branch.

## Live 3D assessment and scope

Production `/angary` was inspected in its default 24×60×8 m configuration, expanded view, a light-grey wall preset and the optional person, including tablet sizing. The composed camera already shows the front, side and roof; current gates are on that front. Expanded viewing makes these details easier to read without another camera interaction. Restricted orbit could help with future face-specific openings, but its value does not justify its lifecycle, framing and mobile costs today. No orbit, reset button, zoom or pan is added.

The dense profiled-roof pattern can look noisy at some screen scales. This is an existing material/sampling polish concern (Phase 3B/3F visual quality), not a reason to add controls. This PR does not change lighting, material tuning or geometry to hide it.

Two concrete defects reproduced on production and main:

1. Shift+Tab from the fullscreen close button focused the covered cookie-settings button. The dialog also lacked an accessible model description because the description was outside the portal and the dimension overlay was aria-hidden.
2. Preset controls declared a radio-group pattern but had no arrow-key selection and put every option in the Tab order.

## Implemented

**Expanded model:** preserves the stable portal and existing mounted Canvas. Covered body siblings become inert while expanded and recover their prior inert state on exit. Tab and Shift+Tab cycle through the visible controls; programmatic focus cannot reach background fields. Escape restores focus without scrolling. The same model description travels inside the portal and labels the dialog through `aria-describedby`, including when visual dimensions are hidden.

**Colour presets:** one Tab stop per surface, arrow selection with wraparound, Home/End, and native button Enter/Space activation. Selection remains the existing component state. Existing visual labels and selected styling remain unchanged.

**Validation repair:** fixes four pre-existing TypeScript diagnostics in image/video e2e assertions through explicit DOM element types. No runtime website behavior changes in that commit.

## Colour/material architecture

Wall and roof colours remain **RenderPresets**, outside `HangarDomainModel` and `ParametricBuildingModel`. They survive a Technical/3D round trip and expanded viewing during the mounted session. They are not a RAL specification, quoted finish, persistent saved configuration, or a field in the lead brief. Actual cladding systems (profiled sheet versus sandwich panel) are already business configuration; this PR does not conflate those with display colours. Frame and gate colours gain no controls.

Preset updates still write to cached material instances and invalidate the demand-rendered view. No geometry, domain model, opening, shared FSM, build sequence or renderer source changes.

## Performance and mobile

Production manifest comparison:

| Metric | Current main | This PR |
|---|---:|---:|
| Configurator chunk, raw | 33,862 B | 35,111 B |
| Configurator chunk, gzip | 10,195 B | 10,682 B |
| Lazy Three/R3F vendor chunk, gzip | 232,538 B | 232,538 B |
| ThreeHangarView chunk, gzip | 6,362 B | 6,362 B |
| Sum of all client JS chunks, gzip | 408,545 B | 409,030 B |
| Static Three/R3F imports from configurator | 0 | 0 |
| Three library requests before opting into 3D (dev audit) | 0 | 0 |
| Settled desktop/tablet WebGL draws per active frame, including shadow passes | 310 | 310 |
| Settled mobile WebGL draws per active frame, no shadows | 283 | 283 |
| Idle draws over each 600 ms audit window | 0 | 0 |
| Simultaneous preview canvases | 1 | 1 |

Draw counts are instrumented browser calls, not a physical GPU-time or memory benchmark. Main and branch used the same local Chromium, viewport and scene. DPR remained 1 in the capture audit; the existing Pixel 7 e2e project separately covers mobile device emulation. No dependency, asset or renderer changes. The existing large-chunk build warning is unchanged and belongs to the isolated lazy vendor payload.

Mobile still starts Technical, opts into 3D, uses reduced existing render quality and has no new gesture handlers. Existing fullscreen is retained; on narrow screens its only keyboard control is Close because the dimension toggle is intentionally hidden. No browser fullscreen API or camera interaction is introduced. Desktop, laptop, tablet, mobile and 10×120 / 50×10 m extremes are included in the review captures.

## Validation

| Check | Main baseline | Final branch |
|---|---|---|
| Unit | 388 passed | 388 passed |
| Full desktop/mobile e2e | 255 passed, 16 intentional skips | 263 passed, 16 intentional skips |
| Lint | Pass | Pass |
| TypeScript | 4 existing diagnostics in media e2e assertions | Pass |
| Production build | Pass, existing lazy-chunk warning | Pass, same warning |
| Full visual suite | 8 passed, 33 failed | 8 passed, same 33 failures |
| Focus/preset regressions | 3 intended failures, 1 pass on desktop | 8 passed across desktop/mobile |
| Paired capture/performance audit | 4 viewport scenarios passed | 4 viewport scenarios passed |

All 14 matched render images are byte-identical, including three wall colours, the alternative roof colour, default/expanded desktop/laptop/tablet/mobile views and extreme proportions. The two keyboard-interaction images differ as intended: focus stays in the dialog and ArrowRight selects light grey.

See the accompanying product-review pack for matched images, raw measurements and complete command logs. Existing main has stale visual baselines and selectors: the full visual suite fails the same 33 cases before and after this PR. These are reported, not regenerated to make the suite green. Matched fresh-main/branch captures isolate this change from those existing failures.

The new regression tests first failed on main for focus containment, missing fullscreen description and radio keyboard behavior. They pass after the fixes. They also check repeated enter/exit with the exact same Canvas, focus restoration, hidden dimension controls, unchanged configuration and selection persistence.

## Recommendation

Keep the small existing palette, expanded view and optional person. Ship no additional optional capability in this follow-up. Review the two accessibility fixes as the useful incremental work, then address roof sampling and the stale visual regression suite in a separate polish/testing task.

The retained Phase 3C set makes the configured object easier to picture and inspect. This follow-up makes those benefits available to keyboard and assistive-technology users; it does not claim a new visual signature or a measured conversion lift. It makes the product more useful without making it more feature-rich.

No merge or deployment is part of this task.
