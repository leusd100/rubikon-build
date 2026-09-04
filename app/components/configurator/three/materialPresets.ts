// Phase 3C — colour/material presets for the 3D view.
//
// ARCHITECTURE DECISION, explicit per the brief's own question: these are RenderPresets, not
// configuration/business data. A wall colour choice does not exist anywhere in `ConfiguratorState`
// / `HangarDomainModel`, is never sent to `deriveSummary.ts`, and never reaches a lead payload.
// The renderer needing a colour is not a reason to put one in the domain model — this is
// presentation state, owned and reset the same way `mode` (Technical/3D) already is in
// `HangarPreviewModes.tsx`, not a fact about the building. If RUBIKON later wants "the customer's
// chosen cladding colour" to actually flow into an inquiry, that is a real, separate product
// decision (a genuine domain field, validated against what RUBIKON can actually supply) — not a
// consequence of the renderer wanting *some* colour to paint with today.
//
// PALETTE STATUS: placeholder, not signed off. The three wall / two roof options below are
// deliberately restrained (industrial neutrals, no orange — RUBIKON orange stays UI/accent
// language per materials.ts's own rule) but are NOT sourced from an approved RUBIKON BUILD art
// direction reference — none was available while building this. Treat the exact hex values as a
// placeholder for a real design pass, not a shipped palette. The DEFAULT option in each list
// reproduces materials.ts's own existing default color exactly, so "no selection made" renders
// pixel-identical to every pre-Phase-3C baseline.

export type WallPresetId = 'neutral' | 'light-grey' | 'graphite';
export type RoofPresetId = 'graphite' | 'light-grey';

export type MaterialPreset<Id extends string> = {
  id: Id;
  /** Ukrainian label, shown in the picker UI. */
  label: string;
  color: string;
};

export const WALL_PRESETS: ReadonlyArray<MaterialPreset<WallPresetId>> = [
  // Default — identical to materials.ts's MATERIALS.wall.color. Keep these two in sync by hand;
  // there are only two, and a shared constant would be a strange dependency for a "the default
  // happens to match" fact given the two files answer different questions (base material physics
  // vs. this file's own preset catalogue).
  { id: 'neutral', label: 'Нейтральна', color: '#6b747c' },
  { id: 'light-grey', label: 'Світло-сіра', color: '#9aa3ab' },
  { id: 'graphite', label: 'Графіт', color: '#3d434a' },
];

export const ROOF_PRESETS: ReadonlyArray<MaterialPreset<RoofPresetId>> = [
  // Default — identical to materials.ts's MATERIALS.roof.color.
  { id: 'graphite', label: 'Графіт', color: '#4e565e' },
  { id: 'light-grey', label: 'Світло-сіра', color: '#838d94' },
];

export const DEFAULT_WALL_PRESET: WallPresetId = 'neutral';
export const DEFAULT_ROOF_PRESET: RoofPresetId = 'graphite';

export function wallPresetColor(id: WallPresetId): string {
  return WALL_PRESETS.find((p) => p.id === id)?.color ?? WALL_PRESETS[0].color;
}

export function roofPresetColor(id: RoofPresetId): string {
  return ROOF_PRESETS.find((p) => p.id === id)?.color ?? ROOF_PRESETS[0].color;
}
