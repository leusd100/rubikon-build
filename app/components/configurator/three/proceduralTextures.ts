import * as THREE from 'three';

/**
 * Phase 3F — the ONLY texture assets this 3D view ever creates: two small, procedurally generated,
 * canvas-based textures, each built once (module-scoped singletons, same "one instance, many
 * materials" rule `sharedMaterial` already follows for materials themselves — see this module's
 * own doc comment there), never downloaded, never re-generated per material or per mesh.
 *
 * This is deliberately NOT a texture-pack approach. The brief's own §9/§19/§20 are explicit: no
 * 2K/4K assets, no per-panel textures, shared and cached, invisible cost if it cannot be seen at
 * normal camera distance. A 64×64 canvas generated once at first use and reused via RepeatWrapping
 * across every surface that wants micro-detail costs a few KB of GPU memory total, not per mesh —
 * the opposite of what a "texture pack" would cost.
 *
 * Deterministic on purpose (a fixed integer PRNG seed, not `Math.random()`): the same noise field
 * every time this module loads, matching this whole codebase's "same input, same output" rule for
 * anything that isn't explicit user state — a re-render must never make the steel's micro-detail
 * silently shift.
 */

const NOISE_SIZE = 64;

/** A small, fast, seeded PRNG (mulberry32) — good enough for visual noise, not for anything else.
 *  `Math.random()` would make this module non-deterministic between loads, which the module's own
 *  doc comment above explicitly rules out. */
function mulberry32(seed: number): () => number {
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
function buildNoiseField(size: number, seed: number): Float32Array {
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

let cachedRoughnessTexture: THREE.Texture | null = null;
let cachedNormalTexture: THREE.Texture | null = null;

/**
 * A grayscale roughness-variation texture — mid-grey with gentle mottling, meant to be sampled at
 * a MODERATE repeat (a handful of tiles across a wall or a slab) so it breaks up an otherwise
 * perfectly uniform roughness value without reading as a printed pattern. Used as `roughnessMap`
 * on concrete (the brief's §5 "tiny roughness breakup") and, at a different repeat, as a subtle
 * roughness variation on coated steel.
 */
export function getNoiseRoughnessTexture(): THREE.Texture {
  if (cachedRoughnessTexture) return cachedRoughnessTexture;

  const field = buildNoiseField(NOISE_SIZE, 1337);
  const canvas = document.createElement('canvas');
  canvas.width = NOISE_SIZE;
  canvas.height = NOISE_SIZE;
  const ctx = canvas.getContext('2d')!;
  const image = ctx.createImageData(NOISE_SIZE, NOISE_SIZE);
  for (let i = 0; i < field.length; i += 1) {
    // Compressed toward the middle of the 0-255 range: this is a MULTIPLIER on a material's own
    // roughness scalar (three.js samples the green channel), not the roughness value itself — a
    // gentle ±20% swing around 0.8, not a texture that swings from mirror to chalk.
    const value = Math.round(160 + field[i] * 70);
    const idx = i * 4;
    image.data[idx] = value;
    image.data[idx + 1] = value;
    image.data[idx + 2] = value;
    image.data[idx + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.NoColorSpace; // a data map, never colour-managed
  cachedRoughnessTexture = texture;
  return texture;
}

/**
 * A tangent-space normal map derived from the SAME noise field (a finite-difference gradient of
 * it, encoded the standard OpenGL way — X/Y perturbation in R/G, Z dominant in B). Applied at a
 * HIGH repeat with a very low `normalScale` on the material side (see materials.ts), so what
 * reaches the eye is only a faint break-up of an otherwise perfectly flat specular highlight —
 * "subtle irregularity, not mirror-like" (brief §4), never a visible bump pattern.
 */
export function getNoiseNormalTexture(): THREE.Texture {
  if (cachedNormalTexture) return cachedNormalTexture;

  const field = buildNoiseField(NOISE_SIZE, 4242);
  const canvas = document.createElement('canvas');
  canvas.width = NOISE_SIZE;
  canvas.height = NOISE_SIZE;
  const ctx = canvas.getContext('2d')!;
  const image = ctx.createImageData(NOISE_SIZE, NOISE_SIZE);
  const at = (x: number, y: number) => field[((y + NOISE_SIZE) % NOISE_SIZE) * NOISE_SIZE + ((x + NOISE_SIZE) % NOISE_SIZE)];

  for (let y = 0; y < NOISE_SIZE; y += 1) {
    for (let x = 0; x < NOISE_SIZE; x += 1) {
      const dx = at(x + 1, y) - at(x - 1, y);
      const dy = at(x, y + 1) - at(x, y - 1);
      // Standard tangent-space encoding: (nx, ny, nz) in [-1,1] -> [0,255]. `strength` keeps the
      // perturbation gentle at the source too, on top of the even-gentler normalScale applied
      // where this texture is actually used.
      const strength = 1.4;
      const nx = -dx * strength;
      const ny = -dy * strength;
      const nz = 1;
      const len = Math.hypot(nx, ny, nz) || 1;
      const idx = (y * NOISE_SIZE + x) * 4;
      image.data[idx] = Math.round(((nx / len) * 0.5 + 0.5) * 255);
      image.data[idx + 1] = Math.round(((ny / len) * 0.5 + 0.5) * 255);
      image.data[idx + 2] = Math.round(((nz / len) * 0.5 + 0.5) * 255);
      image.data[idx + 3] = 255;
    }
  }
  ctx.putImageData(image, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.NoColorSpace;
  cachedNormalTexture = texture;
  return texture;
}

/**
 * A repeat-tiled VARIANT of one of the two base textures above, cached by `${kind}:${repeat}` so
 * the same (kind, repeat) pair is never cloned twice. `.repeat` lives on the `Texture` object
 * itself, not per-material, so two materials wanting different tiling densities on the same base
 * noise field need their own `Texture` instances — `.clone()` shares the same underlying canvas
 * (no second noise field generated, no second `putImageData` call), it only costs a second small
 * GPU upload of an already-tiny 64×64 image. Still a handful of variants total across every
 * material this module serves, nowhere near "one texture per mesh".
 */
const repeatedVariants = new Map<string, THREE.Texture>();

export function getRepeatedNoiseTexture(kind: 'roughness' | 'normal', repeat: number): THREE.Texture {
  const cacheKey = `${kind}:${repeat}`;
  const existing = repeatedVariants.get(cacheKey);
  if (existing) return existing;

  const base = kind === 'roughness' ? getNoiseRoughnessTexture() : getNoiseNormalTexture();
  const variant = base.clone();
  variant.repeat.set(repeat, repeat);
  variant.needsUpdate = true;
  repeatedVariants.set(cacheKey, variant);
  return variant;
}
