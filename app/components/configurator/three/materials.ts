import type { MaterialKey } from '../../../lib/configurator/threeSceneModel';

// RUBIKON BUILD architectural visualisation palette — Phase 3A, extended Phase 3F ("premium
// render & real materials").
//
// The brief's diagnosis of the earlier spike was that it "looked too much like a generic WebGL
// prototype". Two things caused that: every surface sat in the same narrow mid-grey value band, so
// nothing had a hierarchy; and the frame was almost the same value as the envelope, so the
// structure never read. This palette fixes both by assigning each class a distinct VALUE step
// rather than a distinct hue, which is how architectural models stay legible in greyscale.
//
// Hues stay in a narrow cool-steel range on purpose. RUBIKON orange is deliberately absent — it
// remains UI/accent language and must never become the building's material.
//
// PHASE 3F: `wall`/`roof` split into `-profiled`/`-sandwich` variants — see MaterialKey's own doc
// comment in threeSceneModel.ts for why. Every material below now also carries a RESPONSE, not
// just a colour: roughness/metalness were tuned so each material class reads as a distinct
// PHYSICAL SUBSTANCE at normal camera distance, not merely a different value on the same generic
// grey-plastic response curve — the brief's own repeated "must not look like coloured mesh"
// requirement. `roughnessNoise`/`normalNoise` are the micro-detail layer (see proceduralTextures.ts):
// present only where it is visibly useful, always the SAME two small shared textures at different
// tiling densities, never a bespoke texture per material.
//
// Value ladder, lightest to darkest:
//   frame-primary        #99a4ac   galvanized structural steel — the structural read, lightest
//                                   thing in the scene
//   footing               #8b8e86  isolated footing pedestals, a half-step lighter than the slab
//   slab                  #7c7f78  cast concrete, the one surface allowed a warm shift
//   wall-sandwich          #6f787f  insulated cladding — flatter, more matte than profiled sheet
//   wall-profiled          #6b747c  coated profiled steel — a touch more specular than sandwich
//   roof-sandwich          #525a62  sandwich roof, one step below the wall pairing
//   roof-profiled          #4e565e  profiled roof, clearly a step below the walls
//   frame-secondary        #454e56  girts/bracing: present but subordinate
//   gate                   #3d434a  the door leaf — a real painted-steel surface
//   ground                 #262a2e  staging
//   gate-recess             #0b0d0e  an opening is the absence of light

// Phase 3F §10/§11 — the chosen "Premium Industrial" study's backdrop (see SceneLighting's own
// doc comment in ThreeHangarView.tsx for the full study comparison). Deliberately darker than
// `--surface-dark` (#141416, the previous value, which matched the CSS token on purpose) — the
// darker backdrop is part of what makes this study read as premium rather than a void, but it
// means the CSS token no longer matches: see configurator.css's own `.hc-preview-surface:has(.hc-preview-canvas)`
// rule, which must be kept equal to this value by hand (two places, not a build-time shared
// constant, because one is TS/WebGL and the other is a static stylesheet).
export const STUDIO_BACKGROUND = '#0e0f11';

export type MaterialSpec = {
  color: string;
  roughness: number;
  metalness: number;
  /** Repeat density for the shared roughness-noise texture (proceduralTextures.ts), or omitted
   *  for a material that stays at its flat scalar roughness. A LOW number is a few broad tiles
   *  across the surface (concrete); a HIGH number is fine-grained micro-breakup (steel). */
  roughnessNoiseRepeat?: number;
  /** Repeat density + `normalScale` for the shared normal-noise texture, or omitted for a
   *  perfectly flat-shaded surface. `scale` is deliberately tiny everywhere it appears — see
   *  proceduralTextures.ts's own doc comment: "a faint break-up of an otherwise perfectly flat
   *  specular highlight", never a visible bump pattern. */
  normalNoise?: { repeat: number; scale: number };
};

export const MATERIALS: Record<MaterialKey, MaterialSpec> = {
  // Galvanized structural steel (brief §4). Cooler and more metallic than the previous painted-
  // steel tuning (metalness 0.34 -> 0.52), but roughness held high enough (0.4) that it stays
  // "diffuse enough to remain readable" rather than mirror-like — the brief's own explicit
  // boundary. The normal-noise gives it the "subtle irregularity" a real hot-dip galvanized
  // surface has (a mottled spangle pattern, not a mirror finish) without ever reading as a visible
  // bump map at normal camera distance.
  'frame-primary': {
    color: '#99a4ac', roughness: 0.4, metalness: 0.52,
    roughnessNoiseRepeat: 18,
    normalNoise: { repeat: 24, scale: 0.06 },
  },
  // Same galvanized language, scaled down: two full value steps below the primary frame (unchanged
  // from Phase 3A) so secondary structure never competes for the structural read. No normal-noise
  // — these members are visually thin enough that per-brief §9 ("if it cannot be seen... do not
  // pay for it") a normal perturbation would never actually be legible on them.
  'frame-secondary': { color: '#454e56', roughness: 0.55, metalness: 0.42, roughnessNoiseRepeat: 14 },
  // Coated profiled steel wall (brief §2): restrained metalness, moderate-high roughness, a
  // controlled specular response rather than a flat colour. The normal-noise is deliberately at a
  // HIGHER repeat than the frame's — profiled sheet's real micro-texture (the coil coating's own
  // slight orange-peel) is finer-grained than a structural member's mill surface.
  'wall-profiled': {
    color: '#6b747c', roughness: 0.56, metalness: 0.26,
    roughnessNoiseRepeat: 20,
    normalNoise: { repeat: 40, scale: 0.045 },
  },
  // Sandwich panel wall (brief §3): the material response itself, not just the geometry, has to
  // read as a DIFFERENT substance from profiled sheet at the same nominal colour — flatter face,
  // softer highlight, more matte. Lower metalness, higher roughness, no normal-noise at all (the
  // panel's macro geometry already carries the broad flat-face-plus-joint language; adding the
  // same fine steel-coil micro-detail here would blur the two systems back together, which is
  // exactly what this split exists to prevent).
  'wall-sandwich': { color: '#6b747c', roughness: 0.84, metalness: 0.1, roughnessNoiseRepeat: 10 },
  // Roof pairing, one value step below the wall pairing (unchanged hierarchy) — same profiled/
  // sandwich response split as the walls, just applied to the roof's own base colour.
  'roof-profiled': {
    color: '#4e565e', roughness: 0.52, metalness: 0.28,
    roughnessNoiseRepeat: 20,
    normalNoise: { repeat: 40, scale: 0.045 },
  },
  'roof-sandwich': { color: '#525a62', roughness: 0.82, metalness: 0.12, roughnessNoiseRepeat: 10 },
  // Cast concrete (brief §5): the roughness value itself stays very high (a dry, chalky cast
  // surface, unchanged from Phase 3D.1's own tuning) — what Phase 3F adds is the roughness-noise
  // at a LOW repeat (a few broad, gentle mottled patches across a slab, not fine grain), which is
  // the "very subtle procedural noise... tiny roughness breakup" the brief asks for without
  // tipping into "dirty" or "grainy", both explicitly ruled out.
  slab: { color: '#7c7f78', roughness: 0.97, metalness: 0, roughnessNoiseRepeat: 5 },
  footing: { color: '#8b8e86', roughness: 0.9, metalness: 0, roughnessNoiseRepeat: 5 },
  // The gate leaf (brief §6): "slightly different roughness from walls" — noticeably smoother than
  // either wall material (a real sectional/roll-up door is smoother painted steel than a profiled
  // cladding panel), with its own light normal-noise for the recessed panel seams to catch a
  // faint highlight break rather than reading as one dead-flat plane.
  gate: {
    color: '#3d434a', roughness: 0.44, metalness: 0.26,
    normalNoise: { repeat: 30, scale: 0.04 },
  },
  // The reveal/backdrop AROUND and BEHIND the leaf above — an opening is the absence of light, not
  // a dark-painted panel.
  'gate-recess': { color: '#0b0d0e', roughness: 1, metalness: 0 },
  // Retained for completeness of the MaterialKey map. The view does NOT paint a lit ground: a
  // plane large enough to hide its own edge necessarily fills the canvas, which made the preview
  // read as a framed picture inside its container. The ground is a `shadowMaterial` catcher
  // instead — invisible except where the building casts onto it.
  ground: { color: '#262a2e', roughness: 1, metalness: 0 },
};
