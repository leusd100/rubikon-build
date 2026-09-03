# Parametric Building Model — Phase 3-0

**Status:** implemented, not merged · **Date:** 03.09.2026 · **Branch:** `feature/hangar-parametric-model-phase-3-0`

Geometry foundation for the Signature Hangar Configurator, plus the technical view upgrade that
comes with it. **No production 3D is introduced by this phase.**

## 1. Why this exists

The technical SVG view and the R3F renderer spike were drawing **different buildings**:

| | Roof | Overall height at 24 × 60 × 8 |
|---|---|---|
| Technical SVG (before) | flat | 8 m |
| R3F spike | 12° gable | ~10.55 m ridge |

Neither was "wrong" in isolation — the problem was that nothing owned the building's shape. The
scene model carried only positions, counts and visibility flags; the SVG projector rebuilt every
corner from `dimensions` on its own, and the spike invented its own gable. Two renderers, two
independently-derived buildings, and no test that could even express the disagreement.

That is fatal for a future Technical ↔ 3D mode switch, where the entire premise is *two views, one
configuration*.

## 2. Architecture

```
ConfiguratorState                     UI state (sliders, checkboxes) — unchanged
  └─> HangarDomainModel               business facts (dims, scope, envelope, roof, gates)
        └─> ParametricBuildingModel   ◀── THE SINGLE SOURCE OF GEOMETRIC TRUTH
              ├─> TechnicalSceneModel ──> isometricProjection ──> SVG   (this phase)
              └─> ThreeSceneModel     ──> R3F                          (future, not built)
```

`layerLifecycle` + `buildUpSequence` (the build-up FSM) sit beside this and are renderer-agnostic
already — they were not changed structurally by this phase.

**Ownership rule:** ridge height, roof slope, bay stations, wall planes, roof planes, gable
profiles, gate rectangles and the slab footprint are derived in `parametricModel.ts` and **nowhere
else**. Renderers read those numbers. A renderer that recomputes any of them is a bug.

`isometricProjection.ts` is now purely a 3D→2D transform plus annotation placement. It derives no
shape at all.

## 3. Coordinate system (frozen, and asserted by tests)

```
      Y (up)
      │    Z (length, toward rear)
      │  ╱
      └──── X (width)
```

| Axis | Range | Convention |
|---|---|---|
| X | `0 … widthM` | left face `x=0`, right face `x=widthM` |
| Y | `0 … ridgeM` | `0` = top of slab (ground line), up positive |
| Z | `0 … lengthM` | **front facade `z=0`**, rear facade `z=lengthM` |

Ridge runs along Z at `x = widthM/2, y = ridgeM`. Gates are on the front face.

This is tested, not just documented — a camera/face convention mismatch already cost a real
debugging session during the R3F spike (the front wall rendered correctly but faced away from the
camera, hidden behind the building's own volume).

## 4. Roof pitch — a span-varying visual rule

A single fixed pitch is the wrong abstraction over a 10–60 m width range, and this was checked
rather than assumed. At a fixed 12°:

| Width | Rise | Ridge on a 4 m eave |
|---|---|---|
| 10 m | 1.06 m | 5.06 m |
| 24 m | 2.55 m | 6.55 m |
| 60 m | **6.38 m** | **10.38 m** — a roof 1.6× taller than its walls |

Real wide-span portal frames go the other way: the wider the span, the shallower the pitch. So
pitch interpolates 14° at 10 m → 7° at 60 m, clamped at both ends:

| Width | Pitch | Rise |
|---|---|---|
| 10 m | 14.00° | 1.25 m |
| 24 m | 12.04° | 2.56 m |
| 40 m | 9.80° | 3.45 m |
| 60 m | 7.00° | 3.68 m |

Two independent checks on that curve:

- At the default 24 m it lands on **12.04°** — visually the same roof the R3F spike used and that
  read well in the visual gate.
- The user-supplied reference warehouse model measures a **28.2 m span with a 2.84 m rise**
  (≈11.4–12.0°). This rule predicts **2.86 m** at that span — a 2 cm match from an independent source.

**It stays a visual rule**, and it is still what supplies the *default* ridge.

> **Updated after Phase 3A:** the ridge height is now user-adjustable (see
> `docs/hangar-3d-view-phase-3a.md` §11). Pitch itself is still not a control — the user adjusts the
> **ridge height in metres**, the number the drawing annotates, and pitch is derived from it. The
> span rule above provides the starting value; a 5°–20° pitch clamp keeps every adjusted value
> credible. Roof geometry on a real project remains an engineering decision made off this tool.

## 5. Honesty boundary

The configurator remains **schematic**. The parametric model is *not* structural calculation, BIM,
engineering documentation, or certified design — it is a consistent geometric visualisation.

Concretely, what is deliberately *not* modelled:

- **Member sections.** Rafters and columns are centre-lines; thickness is renderer styling (a
  stroke weight in SVG, a box in 3D). A member schedule would be a construction claim.
- **Truss triangulation.** Deferred: decorative webbing would imply a structural solution nobody has
  chosen. Phase 3-0 uses the smallest structurally honest abstraction — a portal frame of two
  columns and two rafters meeting at a ridge.
- **Bay spacing as engineering.** `frameBayCount()` targets ~6 m and clamps to 2–10 bays. It is a
  visual-rhythm heuristic and is documented as one everywhere it appears.

## 6. What changed in the technical view

- Real gable: two roof slopes, a visible ridge, correct eave-vs-ridge distinction.
- Front and rear walls are **gable-end pentagons**, not rectangles.
- `frame-truss` (one flat member) → `frame-rafter` (two pitched members per frame). The build layer
  was renamed `trusses` → `rafters` to match; FSM structure and timing tables are otherwise unchanged.
- New derived **ridge annotation** (`Коник ~10.6 м`), drawn as a nested dimension chain outside the
  user-set eave height, dashed and muted so it cannot be mistaken for a control's value.
- Bay rhythm moved to the side walls, where the structural bays actually run.

## 7. Known limitations / deferred

- **Gable ends are not segmented** into cladding bays (side walls are). The envelope pattern fill
  carries the surface texture there instead. Defer until it demonstrably matters.
- **Gates render when walls are out of scope.** Pre-existing behaviour, unchanged by this phase —
  the gate layer is driven by gate count, not by `scope.walls`.
- **The rear gable is drawn then hidden with CSS** (`display: none`) rather than culled in the
  model. Correct for this fixed viewpoint; a future orbiting camera would need real culling.
- **Envelope is split walls/roof in the model but the UI still offers one choice**, mapped to both.
  The split exists so "cold walls, insulated roof" becomes representable without another migration.

## 8. Cost

| | Phase 2 | Phase 3-0 |
|---|---|---|
| Full pipeline (state → screen points) | ~0.019–0.024 ms | **0.022 ms** |
| Scene primitives @ 24×60×8 | — | 96 |
| Scene primitives @ 60×120×15 (max) | — | 96 |
| SVG nodes @ 24×60×8 | 86 | **130** (+51%) |

The pipeline cost is unchanged despite an added layer and real gable geometry. Node count grows
because the drawing genuinely contains more: two roof slopes instead of one flat plane, two gable
pentagons, 22 rafters instead of 11 trusses, a ridge, and a fourth dimension guide. Primitive count
does not grow with building size — `frameBayCount`'s 2–10 clamp bounds it.
