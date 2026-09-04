import * as THREE from 'three';
import { buildNoiseField, normalByteFromGradient, roughnessNoiseByte } from './noiseField';

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
 *
 * Phase 3F.1 — the actual noise/PRNG/pixel-encoding MATH lives in noiseField.ts, a pure module
 * with no canvas/DOM dependency, and carries real unit tests there. What remains HERE is a thin
 * canvas-drawing shell: `document.createElement('canvas')`, `getContext('2d')`, THREE.Texture
 * wiring — genuinely untestable under this project's plain-node Vitest environment (no
 * `HTMLCanvasElement` 2D context without a canvas polyfill this repo deliberately doesn't carry,
 * the exact same "needs a real browser, not jsdom" reasoning sonar-project.properties/
 * vitest.config.ts already apply to .tsx components and component-scoped hooks). Verified by live
 * browser inspection and the Phase 3F/3F.1 visual-regression suite instead — see this file's own
 * entry in sonar.coverage.exclusions.
 */

const NOISE_SIZE = 64;

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
    const value = roughnessNoiseByte(field[i]);
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
      const { r, g, b } = normalByteFromGradient(dx, dy);
      const idx = (y * NOISE_SIZE + x) * 4;
      image.data[idx] = r;
      image.data[idx + 1] = g;
      image.data[idx + 2] = b;
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
