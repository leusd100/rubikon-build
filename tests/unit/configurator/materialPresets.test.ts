import { describe, expect, it } from 'vitest';
import {
  DEFAULT_ROOF_PRESET,
  DEFAULT_WALL_PRESET,
  ROOF_PRESETS,
  WALL_PRESETS,
  roofPresetColor,
  wallPresetColor,
} from '../../../app/components/configurator/three/materialPresets';
import { MATERIALS } from '../../../app/components/configurator/three/materials';

describe('materialPresets', () => {
  it('the default wall preset reproduces materials.ts\'s own base wall colour exactly — "no selection made" must render pixel-identical to every pre-Phase-3C baseline', () => {
    // Phase 3F: 'wall' split into 'wall-profiled'/'wall-sandwich' — both share the same default
    // colour by design (see materials.ts's own doc comment), so either is a valid reference here;
    // 'wall-profiled' is picked as the one materialPresets.ts's own comment already names.
    expect(wallPresetColor(DEFAULT_WALL_PRESET)).toBe(MATERIALS['wall-profiled'].color);
  });

  it('the default roof preset reproduces materials.ts\'s own base roof colour exactly', () => {
    expect(roofPresetColor(DEFAULT_ROOF_PRESET)).toBe(MATERIALS['roof-profiled'].color);
  });

  it('every preset is a restrained industrial neutral — no RUBIKON orange, no saturated hue, matching materials.ts\'s own rule that orange stays UI/accent language', () => {
    // A cheap, deterministic proxy for "is this a neutral grey/graphite, not a colour": low
    // saturation in HSL terms, computed by hand (no colour library in this project) — max/min
    // channel spread should be small relative to lightness for a true neutral.
    const isNeutral = (hex: string) => {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      // Threshold set from the project's OWN existing palette (materials.ts), not guessed: its
      // cool-steel neutrals already run a spread of 16-19 (e.g. wall #6b747c = 17, frame-primary
      // #98a3ab = 19) — genuinely neutral by this codebase's own established standard, just not
      // a zero-spread grey. A real hue (RUBIKON orange #e8742c, spread ~188) is nowhere close.
      return max - min <= 24;
    };
    for (const preset of [...WALL_PRESETS, ...ROOF_PRESETS]) {
      expect(isNeutral(preset.color), `${preset.id} (${preset.color}) is not a restrained neutral`).toBe(true);
    }
  });

  it('wallPresetColor/roofPresetColor fall back to the first (default) entry for an unrecognised id, never throwing', () => {
    // @ts-expect-error deliberately passing an invalid id to exercise the fallback
    expect(wallPresetColor('not-a-real-id')).toBe(WALL_PRESETS[0].color);
    // @ts-expect-error deliberately passing an invalid id to exercise the fallback
    expect(roofPresetColor('not-a-real-id')).toBe(ROOF_PRESETS[0].color);
  });

  it('preset lists have no duplicate ids and no duplicate colours within a list', () => {
    for (const list of [WALL_PRESETS, ROOF_PRESETS]) {
      const ids = list.map((p) => p.id);
      const colors = list.map((p) => p.color.toLowerCase());
      expect(new Set(ids).size).toBe(ids.length);
      expect(new Set(colors).size).toBe(colors.length);
    }
  });
});
