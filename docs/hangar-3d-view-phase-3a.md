# Hangar 3D View — Phase 3A

**Status:** implemented, not merged · **Date:** 03.09.2026 · **Branch:** `feature/hangar-3d-view-phase-3a`

First production-capable procedural 3D mode for the hangar configurator, built on Phase 3-0's
`ParametricBuildingModel`. Deliberately narrow: no orbit, no build-up animation, no colour
configurator, no 3D annotations, no textures, no post-processing, no GLTF.

## 1. Architecture

```
ConfiguratorState -> HangarDomainModel -> ParametricBuildingModel
                                            |-> TechnicalSceneModel -> isometricProjection -> SVG
                                            `-> ThreeSceneModel     -> R3F
```

`ThreeSceneModel` is a **sibling** of `TechnicalSceneModel`, not a consumer of it. Both read the
same parametric model; neither derives the building.

**The rule, enforced:** `threeSceneModel.ts` contains no `Math.tan`, no ridge formula, no bay
arithmetic, no footprint maths. Every metre is copied. `tests/unit/configurator/threeSceneModel.test.ts`
asserts eave, ridge, footprint, bay stations, roof segments, gable profiles and openings are
**identical** between the technical and 3D derivations at five dimension corners.

## 2. What R3F still decides locally, and why

Each of these is presentation, not building geometry. None of them changes what the object *is*.

| Local decision | Justification |
|---|---|
| Member section sizes (0.32 m column, 0.28 m rafter, 0.12 m girt) | Phase 3-0 decided sections are renderer styling — a centre-line has to be drawn as *something*, and a member schedule would be a construction claim. The SVG draws the same centre-lines as stroke weights. |
| Envelope thickness (0.16 m wall, 0.14 m roof) | Same reasoning. Half of each primary section equals its envelope thickness so the frame sits flush behind the cladding. |
| Thickness **direction** (outward for envelope, inward for slab/recess) | A construction detail: cladding is fixed to the outside of a portal frame. Decided by testing the plane normal against the model interior, never by a hard-coded per-face sign. |
| Materials, lighting, fog, shadow policy | Pure presentation. |
| Camera position, elevation, azimuth, frustum fit | Presentation, derived from the parametric bounds. |
| Ground/shadow-catcher size | Staging. Explicitly excluded from the camera's framing bounds. |

**Deliberately NOT added: roof overhang.** It would change the building's silhouette, so it is a
genuine geometric fact that belongs upstream where both renderers would see it. Adding it in R3F
alone would recreate exactly the flat-vs-gable divergence Phase 3-0 removed. Deferred, not faked.

## 3. Camera

Fixed orthographic. No orbit, pan, zoom or auto-rotate.

- **Elevation 28°** — between the technical view's 24° axonometric and a true 35.3° isometric. At
  24° the portal frames overlap almost exactly in the frame-only state; at 35° the view starts
  reading as looking down onto the roof.
- **Azimuth −45°** — negative so the length axis recedes to the upper *right*, matching the
  technical view. At +45° the 3D came out horizontally mirrored against the drawing, and two
  mirrored compositions read as two different buildings.
- **Frustum fit** transforms the building's eight bounding corners into camera space and fits both
  axes. No per-size fudge factor; verified at min, default, max, wide/short and long/narrow.

## 4. Materials

A value ladder, not a hue palette — that is what keeps an architectural model legible:

| Class | Colour | Role |
|---|---|---|
| `frame-primary` | `#98a3ab` | lightest thing in the scene — the structural read |
| `slab` | `#7c7f78` | matte concrete, the only warm-shifted surface |
| `wall` | `#6b747c` | neutral industrial cladding |
| `roof` | `#4e565e` | profiled sheet, a clear step below the walls |
| `frame-secondary` | `#454e56` | girts: present but subordinate |
| `gate-recess` | `#0b0d0e` | an opening is the absence of light |

RUBIKON orange is absent by design — it stays UI/accent language.

## 5. Lighting, shadow and depth

Ambient + hemisphere fill + one directional key + a weak opposing fill. No HDRI, no bloom, no
post-processing.

- The key light **targets the model centroid**. A directional light's default target is the world
  origin, which here is the building's front-left-bottom *corner* — left alone it rakes the object
  at an odd angle and mis-centres the shadow camera.
- Its height is tuned between two observed failure modes: too low threw a long raking smear; too
  high (radius × 1.35) put it nearly overhead so the shadow hid under the building and the object
  appeared to float.
- **Ground is a `shadowMaterial` catcher, not a floor.** A lit plane big enough to hide its own edge
  necessarily fills the canvas, which made the preview read as a framed picture inside its own
  container. The catcher gives the contact shadow and nothing else.
- **Fog** provides depth-graded contrast so near portal frames separate from far ones — one line
  instead of an outline post-processing pass. An earlier range fogged the object's own centre by
  ~43% and just made everything muddy; it now starts at the camera distance.

## 6. Structural readability

The earlier spike scored frame-only well below SVG. Addressed by: a ~2.7× primary-to-secondary
section ratio; two full value steps between primary frame and girts; the frame being the lightest
material in the scene; fog-based depth grading; a 28° camera that separates the bays; and ground
shadows, which do much of the work of reading the frame's rhythm. No outline pass was needed.

## 7. Performance (measured)

| Metric | Budget | Measured |
|---|---|---|
| Idle rendering | 0 frames when settled | **0 draw calls** over two animation frames |
| Draw calls @ max 60×120×15 | ≤ 120 | **113** |
| Triangles @ max | ≤ 5,000 | **1,394** |
| Lazy 3D chunk (gzip) | ≤ 260 KB | **233,932 B** |
| Shared site bundle delta | 0 B | **+59 B** — manifest string only, see below |
| Geometry rebuild → paint | ≤ 16 ms | **3.6 ms** synchronous work (≈33 ms to paint, frame-pacing bound) |
| Texture memory | no texture pipeline | **0** — procedural only |
| Mobile DPR | ~1.5 | **1.5**, shadows off |

**Shadow-caster policy** is what brings draw calls inside budget: casting from every mesh measured
175. Roof and gable ends always cast (together they *are* the silhouette); side walls never cast
(their shadow falls inside the roof's own); the frame casts only when there is no roof over it —
cheap, physically honest, and it is the state where those shadows matter most.

**On the +59 B shared-chunk delta:** verified that **zero three.js code** is in the shared chunk on
either branch. The delta is entirely the module manifest gaining the lazy chunk's own filename
(`react-three-fiber.esm-*.js`), which is unavoidable if the chunk is to be lazily loadable at all.
The budget's intent — no library on the critical path — is met exactly.

**Rebuild cost** was reduced from ~24 ms of synchronous work by sharing one unit `BoxGeometry`
scaled through each mesh's matrix, plus one material instance per key, instead of allocating ~40
geometries and ~90 materials per change.

## 8. Loading, fallback, accessibility

- SVG renders first; the R3F chunk loads **only on click** (asserted in e2e by watching requests).
- No desktop idle prefetch in 3A — it was optional and kept out to hold scope.
- Mobile defaults to Technical and never preloads the renderer.
- A WebGL probe runs before the toggle is offered; if a context cannot be created the 3D button is
  disabled and the technical view stands.
- An error boundary around the renderer reverts to Technical on any failure (chunk abort, lost
  context, renderer exception) — verified by aborting the chunk in e2e.
- The canvas is `aria-hidden`; a visually-hidden paragraph carries the same description the SVG
  exposes. Controls and summary remain canonical and identical in both modes.
- The mode switch is a `role="group"` of two `aria-pressed` buttons — keyboard operable with no
  custom key handling.

## 9. Known limitations

- No roof overhang (see §2). The eave is a clean edge.
- No dimensions or annotations in 3D — by design for 3A; the technical view owns measurement.
- Mobile has no contact shadow (shadows off), so grounding is weaker there.
- The gate is a recess, not a modelled leaf; no hardware detail.
- Gates still render when walls are out of scope — pre-existing configurator behaviour, unchanged.
- Roof-to-wall value separation is deliberate but subtle under this restrained lighting.
- Visual snapshots assume a pinned machine/driver, the same assumption the existing `*-darwin.png`
  baselines already make.

## 10. Visual-regression impact

Five new 3D baselines. Five **existing** configurator baselines were re-rasterised: the drawing data
is provably unchanged (`isometricProjection.ts`, `technicalSceneModel.ts`, `parametricModel.ts` and
`HangarPreview.tsx` are untouched by this branch), but the new mode-switch toolbar shifts the
preview surface to a fractional Y offset (measured 408.438px), so hairlines land on different pixel
rows. Zero sitewide baseline churn.
