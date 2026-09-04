import type { MaterialKey } from '../../../lib/configurator/threeSceneModel';

// RUBIKON BUILD architectural visualisation palette — Phase 3A.
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
// Value ladder, lightest to darkest:
//   frame-primary  #98a3ab   the structural read — lightest thing in the scene
//   footing        #8b8e86   Phase 3D.1 — isolated footing pedestals, a half-step lighter than the
//                             slab so they read as a distinct object against the ground/shadow
//   slab           #7c7f78   matte concrete, the only warm-shifted surface
//   wall           #6b747c   neutral industrial cladding
//   roof           #4e565e   profiled sheet, clearly a step below the walls
//   frame-secondary#454e56   girts: present but subordinate
//   gate           #3d434a   Phase 3D.1 — the door leaf: a real painted-steel surface, deliberately
//                             darker than roof/wall (it sits recessed, in shadow) but nowhere near
//                             gate-recess's near-black — see that entry's own note below
//   ground         #262a2e   staging: dark, but far enough above the viewport that a contact
//                             shadow has something to darken
//   gate-recess    #0b0d0e   Phase 3A: "an opening is the absence of light" — still true of the
//                             THIN MARGIN and backdrop still visible around/behind the door leaf
//                             above (a jamb reveal has to read as shadow, not as more cladding),
//                             just no longer the whole gate the way it was before Phase 3D.1 added
//                             an actual leaf in front of it

export const VIEWPORT_BG = '#141416'; // matches --surface-dark, so fog blends into the frame edge

export type MaterialSpec = {
  color: string;
  roughness: number;
  metalness: number;
};

export const MATERIALS: Record<MaterialKey, MaterialSpec> = {
  // Painted structural steel. Lighter than everything it sits against so an exposed frame reads
  // clearly — the single biggest lever on the frame-only legibility the spike lost to SVG.
  'frame-primary': { color: '#98a3ab', roughness: 0.5, metalness: 0.34 },
  // Girts. Two full value steps below the primary frame, not the "slightly thinner" delta the
  // spike used, so secondary structure never competes for the structural read.
  'frame-secondary': { color: '#454e56', roughness: 0.62, metalness: 0.22 },
  // Sandwich/cold cladding. Matte, so large wall planes stay calm under the key light.
  wall: { color: '#6b747c', roughness: 0.78, metalness: 0.08 },
  // Profiled metal sheet: a touch more specular than the walls and a clear value step darker, so
  // roof and wall never merge into one silhouette the way they did in the spike.
  roof: { color: '#4e565e', roughness: 0.54, metalness: 0.26 },
  // Cast concrete: the one surface allowed a warm shift, which is what makes it read as concrete
  // rather than as more grey steel. Phase 3D.1: roughness pushed further up (0.94 -> 0.97) and
  // metalness to a true 0 (was 0.03) — restrained, lighting-response-only tuning per the brief's
  // own scope (no texture map), so a highlight falls off softer and wider than it did, reading as
  // a dry, chalky cast surface rather than the faint sheen a still-slightly-specular grey plastic
  // has under the same key light.
  slab: { color: '#7c7f78', roughness: 0.97, metalness: 0 },
  // Phase 3D.1, item 6: the isolated footing's own PEDESTAL (its only part standing above grade —
  // see `Footing` in ThreeHangarView.tsx, the buried pad still shares `slab` above) — a deliberate
  // half-step lighter than the slab, not a size change (the brief's own instruction: readability
  // via material/shadow/contrast, not by enlarging it again). At the tightest bay spacing this
  // configurator allows, a pedestal this close in value to the slab/ground around it kept reading
  // as the building's own contact shadow rather than as a distinct object; a real precast/formed
  // pedestal stub is often visibly less weathered than a broad poured slab anyway, so the lighter
  // value is not an invented contrast, just a plausible one.
  footing: { color: '#8b8e86', roughness: 0.9, metalness: 0 },
  // The door leaf itself (Phase 3D.1). A bit more specular than the wall — real sectional/roll-up
  // doors are smoother painted steel than a profiled cladding panel — and a clear value step below
  // roof, since it sits back in its own recess and never wants to compete with the sunlit envelope.
  gate: { color: '#3d434a', roughness: 0.5, metalness: 0.24 },
  // The reveal/backdrop AROUND and BEHIND the leaf above — an opening is the absence of light, not
  // a dark-painted panel, which is still true of the shadow gap a real recessed door leaves.
  'gate-recess': { color: '#0b0d0e', roughness: 1, metalness: 0 },
  // Retained for completeness of the MaterialKey map. The view does NOT paint a lit ground: a
  // plane large enough to hide its own edge necessarily fills the canvas, which made the preview
  // read as a framed picture inside its container. The ground is a `shadowMaterial` catcher
  // instead — invisible except where the building casts onto it.
  ground: { color: '#262a2e', roughness: 1, metalness: 0 },
};
