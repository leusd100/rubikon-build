// Per-layer build-up timing. Kept as literal, purpose-specific durations rather than the
// sitewide `--duration-fast`/`--duration-medium` tokens, per docs/ui-system-v1.md §6's "Scene/
// media" motion category — the site already treats scene-scale motion as intentionally varied,
// not drift, and none of these layers share the interaction speed those tokens exist for
// (hover/focus color/background changes). Curve is still the shared `var(--ease-premium)`
// (cubic-bezier(.2,.7,.1,1)) wherever a layer's CSS transition needs one, matching the rest of
// the site's scene-scale transforms.
//
// Every duration here is a *materialize* duration. Dematerialize intentionally reuses the same
// number per layer — reversing a build-up should look like rewinding it, not like a different
// animation — so there is deliberately no separate "hide" timing table.

import type { ScenePrimitive } from './sceneModel';

/** Every layer the build-up sequence stages independently, in build order. Dimension-guides are
 * excluded on purpose — annotations are not part of the build sequence (per brief: "not part of
 * the build sequence unless there's a good reason," and legibility during geometry changes is
 * more important than a materialize moment for a label). Terrain is excluded too: it's always-on
 * context, never a build step. */
export type BuildLayer = 'foundation' | 'columns' | 'trusses' | 'purlins' | 'walls' | 'roof' | 'gates';

export const BUILD_LAYER_ORDER: readonly BuildLayer[] = [
  'foundation',
  'columns',
  'trusses',
  'purlins',
  'walls',
  'roof',
  'gates',
] as const;

/** Duration (ms) of one layer's own materialize transition — how long a single instance of that
 * layer's CSS transition runs, independent of how many staggered instances there are. */
export const LAYER_DURATION_MS: Record<BuildLayer, number> = {
  foundation: 350,
  columns: 350,
  trusses: 300,
  purlins: 150,
  walls: 250,
  roof: 250,
  gates: 150,
};

/** Per-instance stagger step (ms) *before* the normalization cap below is applied — i.e. "if
 * there were no cap, this is how far apart consecutive bays/segments/gates would start." Layers
 * that read as one simultaneous moment (foundation, walls-as-a-whole is actually sectional so it
 * does stagger, roof likewise) get 0 here. */
const RAW_STAGGER_STEP_MS: Record<BuildLayer, number> = {
  foundation: 0,
  columns: 90,
  trusses: 60,
  purlins: 40,
  walls: 45,
  roof: 45,
  gates: 60,
};

/** Hard ceiling (ms) on the *total* stagger span for a layer, regardless of instance count — the
 * brief's explicit rule: "A long hangar must not take 10 seconds because it has more bays." A
 * 10-bay wall must feel like the same show as a 2-bay one, just with finer-grained reveal. */
const MAX_STAGGER_SPAN_MS: Record<BuildLayer, number> = {
  foundation: 0,
  columns: 350,
  trusses: 150,
  purlins: 100,
  walls: 120,
  roof: 120,
  gates: 80,
};

/**
 * The delay (ms) before the Nth of `instanceCount` same-layer instances starts materializing.
 * Normalizes the raw per-instance step so the *last* instance never starts later than
 * `MAX_STAGGER_SPAN_MS[layer]` after the first, however many instances there are — a 2-bay and a
 * 10-bay hangar both finish staggering their columns within the same ~400ms window, just at
 * different granularities. Pure function of (layer, index, count): deterministic, no clock reads.
 */
export function staggerDelayMs(layer: BuildLayer, index: number, instanceCount: number): number {
  if (instanceCount <= 1) return 0;
  const rawSpan = RAW_STAGGER_STEP_MS[layer] * (instanceCount - 1);
  const cappedSpan = Math.min(rawSpan, MAX_STAGGER_SPAN_MS[layer]);
  const step = cappedSpan / (instanceCount - 1);
  return Math.round(step * index);
}

/** The offset (ms), relative to the start of the whole build-up sequence, at which a layer's
 * *first* instance begins materializing — i.e. how long the preceding layers' own
 * duration+stagger take to visually settle before this one starts joining in. Sequential, not
 * simultaneous: each layer waits for the previous one's last instance to finish its own
 * transition, so "the frame is complete" reads as a real moment rather than a blur of
 * everything fading in at once. */
export function layerStartOffsetMs(layer: BuildLayer): number {
  const index = BUILD_LAYER_ORDER.indexOf(layer);
  let offset = 0;
  for (let i = 0; i < index; i += 1) {
    const prior = BUILD_LAYER_ORDER[i];
    offset += MAX_STAGGER_SPAN_MS[prior] + LAYER_DURATION_MS[prior];
  }
  return offset;
}

/** Total wall-clock length (ms) of the full build-up sequence from the first foundation frame to
 * the last gate settling — kept comfortably under the brief's ~3s ceiling regardless of hangar
 * size, since every layer's stagger span is independently capped above. */
export function totalSequenceDurationMs(): number {
  const lastLayer = BUILD_LAYER_ORDER[BUILD_LAYER_ORDER.length - 1];
  return layerStartOffsetMs(lastLayer) + MAX_STAGGER_SPAN_MS[lastLayer] + LAYER_DURATION_MS[lastLayer];
}

/** Maps a scene primitive to the build layer it belongs to, for callers that group primitives by
 * kind but need the shared timing/ordering table above. Returns null for primitives that sit
 * outside the staged build sequence (terrain, dimension guides). */
export function buildLayerForPrimitive(primitive: ScenePrimitive): BuildLayer | null {
  switch (primitive.kind) {
    case 'foundation-slab':
      return 'foundation';
    case 'frame-column':
      return 'columns';
    case 'frame-truss':
      return 'trusses';
    case 'frame-purlin':
      return 'purlins';
    case 'wall-segment':
      return 'walls';
    case 'roof-segment':
      return 'roof';
    case 'opening-cutout':
      return 'gates';
    case 'terrain-plane':
    case 'dimension-guide':
      return null;
    default: {
      const exhaustive: never = primitive;
      return exhaustive;
    }
  }
}
