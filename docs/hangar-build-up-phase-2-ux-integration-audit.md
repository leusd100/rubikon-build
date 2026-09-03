# Hangar Build-up Phase 2C — UX Integration Audit

Phase 2C's brief: "connect scene to existing controls/summary cleanly; Controls↔
ConfiguratorState↔DomainModel↔SceneModel↔SVG one-directional; Summary consumes DomainModel/state
separately; NEVER read visual state back from SVG; no two-way renderer-driven business logic."

**Finding: this was already true before Phase 2A/2B, and remains true.** The one-directional
architecture was established during the earlier Renderer Foundation Spike (PR #48) and Phase 2A/2B
never touched it — confirmed by `git diff` against the pre-Phase-2 merge commit showing **zero
changes** to `HangarConfigurator.tsx`, `ConfiguratorControls.tsx`, `ConfiguratorSummary.tsx`, or
`domainModel.ts`/`deriveSummary.ts`. Phase 2A/2B's work was confined to `sceneModel.ts`,
`isometricProjection.ts`, `HangarPreview.tsx`, and the new `layerLifecycle.ts`/
`buildUpSequence.ts`/`useLayerLifecycle.ts` — all downstream of `HangarDomainModel`, never
upstream of it.

This is a verification pass, not a rewrite. What was checked, concretely:

## 1. One-directional flow

`HangarConfigurator.tsx` owns `ConfiguratorState` (`useState`), derives `HangarDomainModel` once
(`useMemo(() => deriveDomainModel(state), [state])`), and passes:
- raw `state` + `onChange={setState}` to `ConfiguratorControls` (edits user input only — never
  reads `domain`),
- the same `domain` object to both `HangarPreview` and `ConfiguratorSummary` independently.

`HangarPreview`'s signature is `{ domain: HangarDomainModel }` — a single read-only prop, no
callback, no ref exposed. There is no code path by which the SVG's rendered state (or the new
`useLayerLifecycle` phase state, entirely local to `HangarPreview`) can influence
`ConfiguratorState`, `HangarDomainModel`, or `ConfiguratorSummary`. Confirmed by inspection, not
just by absence of an obvious wire: `useLayerLifecycle`'s state lives in `useReducer` calls made
*inside* `HangarPreview`'s function body and is never returned, exported, or lifted.

## 2. Summary stays cleanly separated from SceneModel

`ConfiguratorSummary.tsx` and `deriveSummary.ts` import only from `domainModel.ts` and `types.ts`
— grepped directly, zero references to `sceneModel.ts` or `isometricProjection.ts`. Summary and
Preview are siblings reading the same `domain`, not a pipeline where one feeds the other.

## 3. DomainModel serializability (future lead-brief readiness)

`HangarDomainModel` remains plain data — string/number/boolean fields only
(`objectType`, `dimensions.{widthM,lengthM,heightM}`, `envelope`, `scope.{foundation,frame,walls,
roof}`, `gates`, `areaSqm`) — no functions, no `Date`, no class instances, trivially
`JSON.stringify`-able. Untouched by Phase 2A/2B. No lead-backend integration was implemented or
attempted, per the brief's explicit instruction not to build that now.

## 4. Accessibility carry-through

- No stray `aria-*`/`role` attributes on any new per-segment/per-line SVG element (wall/roof
  segments, frame lines, gate cutouts) — grepped the full component. The only ARIA present is the
  pre-existing intentional set: `role="img"` + a dimensions-based `aria-label` on the `<svg>`
  itself, and `aria-hidden="true"` on the three purely-decorative groups (terrain, dimension
  guides, gate outline overlay). Per the `img` role's own semantics, none of the SVG's internal
  primitives are exposed to assistive tech individually — adding ~50 more primitives across
  Phase 2A/2B did not add ~50 more screen-reader-announced elements.
- The semantic summary (`ConfiguratorSummary`) remains a complete, independent text source for
  dimensions/envelope/scope/gates — the SVG is not the sole source of that information.
- Keyboard operability and visible focus are entirely `ConfiguratorControls`' concern, a file
  Phase 2A/2B never touched.

## Conclusion

No code changes were needed to satisfy Phase 2C's structural requirements — they were audited and
confirmed intact, with the specific evidence above rather than an assumption. The one substantive
UX behavior Phase 2A/2B added *inside* this already-correct boundary — build-up animation with
interruption/reduced-motion handling — was verified separately (see the Phase 2A/2B commits'
messages and `docs/hangar-build-up-phase-2-performance.md`).
