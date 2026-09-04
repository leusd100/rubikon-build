/**
 * Phase 3F.1 — the pure, canvas-free half of the procedural micro-detail system
 * (proceduralTextures.ts). Split out specifically so the actual algorithmic content (the PRNG, the
 * noise field, and the per-pixel encoding formulas) carries real unit tests: this file has no
 * canvas/DOM/THREE dependency at all, unlike proceduralTextures.ts, which genuinely cannot run
 * under this project's plain-node Vitest environment (no `HTMLCanvasElement.getContext('2d')`
 * without a canvas polyfill this repo deliberately doesn't carry — see proceduralTextures.ts's own
 * doc comment and sonar-project.properties' matching coverage exclusion for that thin shell).
 * Everything in THIS file is plain arithmetic over plain arrays, and stays fully covered.
 */

/** A small, fast, seeded PRNG (mulberry32) — good enough for visual noise, not for anything else.
 *  `Math.random()` would make this module non-deterministic between loads, which the noise
 *  system's own "same input, same output" rule explicitly rules out. */
export function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A smooth-ish value-noise field, `size × size`, values in [0, 1]. Built by blending several
 *  octaves of blocky random values at different scales (a cheap value-noise stand-in — this does
 *  not need to be true Perlin noise; it only has to avoid looking like flat static at a glance). */
export function buildNoiseField(size: number, seed: number): Float32Array {
  const field = new Float32Array(size * size);
  const rand = mulberry32(seed);
  const octaves: Array<{ cells: number; weight: number }> = [
    { cells: 4, weight: 0.5 },
    { cells: 8, weight: 0.3 },
    { cells: 16, weight: 0.2 },
  ];

  for (const { cells, weight } of octaves) {
    // One random value per coarse cell, bilinearly sampled up to the full field size — cheap and
    // seed-deterministic, with no visible hard block edges once the octaves are summed.
    const grid = Array.from({ length: cells * cells }, () => rand());
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        const gx = (x / size) * cells;
        const gy = (y / size) * cells;
        const x0 = Math.floor(gx) % cells;
        const y0 = Math.floor(gy) % cells;
        const x1 = (x0 + 1) % cells;
        const y1 = (y0 + 1) % cells;
        const fx = gx - Math.floor(gx);
        const fy = gy - Math.floor(gy);
        const v00 = grid[y0 * cells + x0];
        const v10 = grid[y0 * cells + x1];
        const v01 = grid[y1 * cells + x0];
        const v11 = grid[y1 * cells + x1];
        const top = v00 + (v10 - v00) * fx;
        const bottom = v01 + (v11 - v01) * fx;
        field[y * size + x] += (top + (bottom - top) * fy) * weight;
      }
    }
  }

  // Normalise to [0, 1] so downstream consumers can rely on the range regardless of octave weights.
  let min = Infinity;
  let max = -Infinity;
  for (const v of field) {
    if (v < min) min = v;
    if (v > max) max = v;
  }
  const range = max - min || 1;
  for (let i = 0; i < field.length; i += 1) field[i] = (field[i] - min) / range;
  return field;
}

/**
 * A noise-field value in [0, 1] encoded as the grey byte the roughness texture actually stores.
 * Compressed toward the middle of the 0-255 range: this is a MULTIPLIER on a material's own
 * roughness scalar (three.js samples the green channel), not the roughness value itself — a
 * gentle ±20% swing around 0.8, not a texture that swings from mirror to chalk.
 */
export function roughnessNoiseByte(value: number): number {
  return Math.round(160 + value * 70);
}

/**
 * A finite-difference gradient (dx, dy) of the noise field, encoded as a standard OpenGL
 * tangent-space normal byte triple: (nx, ny, nz) in [-1,1] mapped to [0,255], R/G carrying the X/Y
 * perturbation and B dominant (pointing "up", i.e. undisturbed). `strength` keeps the perturbation
 * gentle at the source, on top of the even-gentler `normalScale` applied where the resulting
 * texture is actually sampled (see materials.ts).
 */
export function normalByteFromGradient(dx: number, dy: number, strength = 1.4): { r: number; g: number; b: number } {
  const nx = -dx * strength;
  const ny = -dy * strength;
  const nz = 1;
  const len = Math.hypot(nx, ny, nz) || 1;
  return {
    r: Math.round(((nx / len) * 0.5 + 0.5) * 255),
    g: Math.round(((ny / len) * 0.5 + 0.5) * 255),
    b: Math.round(((nz / len) * 0.5 + 0.5) * 255),
  };
}
