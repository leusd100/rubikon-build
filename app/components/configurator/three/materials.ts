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
// THE TECHNICAL LOOK (10.10) replaces Phase 3F's «Premium Industrial» studio, after the owner's review of /angary:
// walls and roof in one grey-blue on the dark field, no outlines, both visible walls one tone, the gate barely there,
// the slab hardly. The model now speaks the language of the site's line drawings — ink outlines on every part
// (inkOutlines.ts), a light lid over two walls in two clearly different tones (the key light, ThreeHangarView's
// SceneLighting), a slab that reads as its own part, dark gate leaves in copper frames. What changed here, and why:
//   • metalness down to 0.06–0.2 everywhere — there is no environment map in this scene (on purpose: no HDRI), so a
//     metallic surface reflects nothing but the key's highlight and goes dark off it. That is what made the steel
//     frame and the 0.26-metal walls read as one dark mass. Value now comes from the light, predictably;
//   • the normal-noise micro-detail is off the walls and the roof: at the drawing's distances it read as speckle on
//     the roof, louder than the outlines it now sits under. The ribs and joints are geometry (envelopePanelGeometry.ts)
//     and still read; the roughness-noise stays as the quiet breakup it was;
//   • the frame is the drawing's: paper-ink primary members, muted secondary ones (and copper bracing,
//     ThreeHangarView's BRACE_MATERIAL), so the frame-only states echo the «Каркас» drawing;
//   • the gate and door leaves turn DARK (they were the lightest surfaces in the scene): a leaf now reads by its copper
//     frame and its sections' ink, the opening as an opening, rather than as a pale patch in the wall.
//
// Value ladder on /angary (base colours; the light grades them), lightest to darkest:
//   roof (sheet)           #a9aeb2  the lid — lit from above, the lightest large surface (SHEET_ROOF_COLOR)
//   frame-primary          #d6d1c7  paper-ink steel, only seen when the cladding is out of the request
//   footing                #a29d93  isolated footing pedestals, a half-step above the slab
//   walls (sheet)          #9aa1a7  graded by the key into a lit gable and a shaded long wall (SHEET_WALL_COLOR)
//   slab                   #8f8a80  cast concrete, warm, its own part between the walls and the field
//   frame-secondary        #8a867e  girts, purlins: present, subordinate
//   door / gate            #41464b / #3a3f44  dark leaves in copper frames
//   gate-recess            #0b0d0e  an opening is the absence of light

// The technical look (10.10, owner: «картинка повністю зливається і не дуже зрозуміло що є що»). The canvas is
// transparent now: the field behind the model is the page's own — /angary's dark sheet field (--color-dark, a shade
// apart in the two themes), the research card's #0e0f11, the expanded view's --color-dark — so the 3D and the line
// drawings it sits between share one field, and the studio backdrop that had to be matched by hand in two stylesheets
// (STUDIO_BACKGROUND, Phase 3F) is gone.

/** The drawings' inks on the dark field (theme.css): --color-dark-text, --color-dark-text-muted, --color-accent-on-dark.
 *  The outlines are paper ink — the «Каркас» drawing's members; copper marks what is opened, as it marks the actions. */
export const INK = {
  paper: '#F5F2EB',
  muted: '#9E988D',
  copper: '#CC8455',
} as const;

/** /angary's light steel (no colour choice there, 07.10): the roof a clear step above the walls, so it reads as the
 *  lid it is under the key light, not as one more grey-blue plane (10.10). The research screen picks its own
 *  (materialPresets.ts). */
export const SHEET_WALL_COLOR = '#9aa1a7';
export const SHEET_ROOF_COLOR = '#a9aeb2';

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
  // The drawing's primary members (10.10): paper ink, matte, the lightest thing in a frame-only view. Galvanized steel's
  // 0.52 metalness read near-black with no environment to reflect (see the header).
  'frame-primary': { color: '#d6d1c7', roughness: 0.62, metalness: 0.12, roughnessNoiseRepeat: 18 },
  // Two steps below the primary frame, as the drawing's thin lines are below its members
  'frame-secondary': { color: '#8a867e', roughness: 0.7, metalness: 0.1, roughnessNoiseRepeat: 14 },
  // Coated profiled steel (brief §2) and sandwich panel (§3) keep their response split — the sandwich flatter and more
  // matte at the same colour — at the low metalness the header explains. These base colours are the research screen's
  // defaults (materialPresets.ts keeps them equal); /angary paints SHEET_WALL_COLOR / SHEET_ROOF_COLOR over them.
  'wall-profiled': { color: '#6b747c', roughness: 0.56, metalness: 0.18, roughnessNoiseRepeat: 20 },
  'wall-sandwich': { color: '#6b747c', roughness: 0.84, metalness: 0.06, roughnessNoiseRepeat: 10 },
  'roof-profiled': { color: '#4e565e', roughness: 0.52, metalness: 0.2, roughnessNoiseRepeat: 20 },
  'roof-sandwich': { color: '#525a62', roughness: 0.82, metalness: 0.08, roughnessNoiseRepeat: 10 },
  // Cast concrete (brief §5): dry, chalky, a few broad roughness patches. Warmer and lighter than before (#7c7f78) so
  // the slab reads as its own part, a plinth between the walls and the field (10.10), while staying below the roof.
  slab: { color: '#8f8a80', roughness: 0.96, metalness: 0, roughnessNoiseRepeat: 5 },
  footing: { color: '#a29d93', roughness: 0.9, metalness: 0, roughnessNoiseRepeat: 5 },
  // The gate leaf (10.10): dark painted steel. It was lightened past every wall tone to stand out of its near-black
  // recess; now its copper frame and its sections' ink do that (ThreeHangarView's GateLeaf), and a pale leaf read as a
  // patch in the wall rather than as a gate. Rougher than the walls, so it stays a different substance at a glance.
  gate: { color: '#3a3f44', roughness: 0.66, metalness: 0.14 },
  // The door: the gate's leaf a half-step lighter, so a 1 m door beside a 4 m gate still reads as a second, smaller
  // opening of the same kind rather than as a hole
  door: { color: '#41464b', roughness: 0.66, metalness: 0.14 },
  // The reveal/backdrop AROUND and BEHIND the leaf — an opening is the absence of light
  'gate-recess': { color: '#0b0d0e', roughness: 1, metalness: 0 },
  // The ground the building stands on is the page's own field now (the canvas is transparent); what is drawn on it is
  // shade only — the contact shadow round the slab and, on a desktop, the key light's shadow (ThreeHangarView). This is
  // that shade's colour.
  ground: { color: '#000000', roughness: 1, metalness: 0 },
};
