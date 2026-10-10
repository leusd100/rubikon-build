'use client';

import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type {
  FootingMesh,
  GableMesh,
  GateLeafMesh,
  MaterialKey,
  PanelMesh,
  StrutMesh,
  ThreeSceneModel,
} from '../../../lib/configurator/threeSceneModel';
import { claddingMaterialKey } from '../../../lib/configurator/threeSceneModel';
import type { ParametricBuildingModel } from '../../../lib/configurator/parametricModel';
import { LAYER_DURATION_MS, layerStartOffsetMs } from '../../../lib/configurator/buildUpSequence';
import { INK, MATERIALS } from './materials';
import { getRepeatedNoiseTexture } from './proceduralTextures';
import { boxEdges, creaseEdges, faceRectangle, outlineSides, polygonAtZ, pushSegments, surfaceOutline, type Segments } from './inkOutlines';
import { InkLines } from './InkLines';
import {
  buildDoorLeafGeometry,
  buildEnvelopePanelGeometry,
  buildGableCladdingOverlay,
  buildGateLeafGeometry,
  buildRidgeCapGeometry,
  sandwichSeamsM,
  inkRibPitchM,
  profiledRibsM,
  sandwichCoursesM,
  gableRibs,
  gableCourses,
} from './envelopePanelGeometry';
import type { CladdingSystem } from '../../../lib/configurator/types';
import { FitOrthographicCamera } from './FitOrthographicCamera';
import { useLayerLifecycle, type LayerTransitionStyle } from '../useLayerLifecycle';
import { useBuildProgress } from './useBuildProgress';
import { initialProgressForFreshMount } from './buildUpAnimation';
import { ScaleFigure } from './ScaleFigure';

// Phase 3A production 3D view, extended in Phase 3B with 3D build-up (§23-26 of the brief).
//
// Everything geometric here is read from ThreeSceneModel, which in turn copies
// ParametricBuildingModel. The only maths below turns a centre-line or a quad into a box transform
// — renderer mechanics, not building rules.
//
// Build-up reuses the EXACT SAME lifecycle/FSM the SVG renderer drives (useLayerLifecycle,
// buildUpSequence's LAYER_DURATION_MS/layerStartOffsetMs) — no parallel timing table, no second
// state machine. What is new here is turning that shared (phase, duration, delay) triple into a
// per-frame progress value a WebGL mesh can read, since a <canvas> has no CSS `transition` to hand
// that off to (see useBuildProgress.ts / buildUpAnimation.ts).

const X_AXIS = new THREE.Vector3(1, 0, 0);

function v(p: { x: number; y: number; z: number }): THREE.Vector3 {
  return new THREE.Vector3(p.x, p.y, p.z);
}

/**
 * ONE unit box, scaled per mesh through its own transform matrix.
 *
 * Every strut and panel used to allocate its own BoxGeometry, so a single dimension change threw
 * away and rebuilt ~40 geometries plus ~90 materials. Measured at ~24ms of work per change against
 * a 16ms budget. A unit box scaled by the matrix is the standard fix: identical output, zero
 * geometry allocation on a rebuild. Module-scoped so it also survives a Technical↔3D round trip.
 */
const UNIT_BOX = new THREE.BoxGeometry(1, 1, 1);

/** Shared material instances, one per key rather than one per mesh — same reasoning. Build-up
 *  opacity (Phase 3B) mutates these SAME cached instances in place: every material key here maps
 *  to exactly one build-up layer group (frame-primary is the one exception — see below — and it
 *  is animated by growth, not opacity, so it never needs this). Reusing the instance means no new
 *  per-layer material allocation, just a `.opacity` write, so the material count stays exactly
 *  what Phase 3A measured regardless of how many transitions ever run. */
const MATERIAL_CACHE = new Map<keyof typeof MATERIALS, THREE.MeshStandardMaterial>();

function sharedMaterial(key: keyof typeof MATERIALS): THREE.MeshStandardMaterial {
  const existing = MATERIAL_CACHE.get(key);
  if (existing) return existing;
  const spec = MATERIALS[key];
  const material = new THREE.MeshStandardMaterial({
    color: spec.color,
    roughness: spec.roughness,
    metalness: spec.metalness,
  });
  // Phase 3F — the shared micro-detail layer (proceduralTextures.ts). Both maps come from the
  // SAME two small canvas textures this whole view ever creates, tiled at whatever repeat this
  // specific material key wants (see materials.ts's own doc comment on why the repeat differs by
  // material) — never a bespoke texture asset per material.
  if (spec.roughnessNoiseRepeat) {
    material.roughnessMap = getRepeatedNoiseTexture('roughness', spec.roughnessNoiseRepeat);
  }
  if (spec.normalNoise) {
    material.normalMap = getRepeatedNoiseTexture('normal', spec.normalNoise.repeat);
    material.normalScale = new THREE.Vector2(spec.normalNoise.scale, spec.normalNoise.scale);
  }
  MATERIAL_CACHE.set(key, material);
  return material;
}

/**
 * The bracing crosses in copper (10.10), as the «Каркас» drawing draws them — so a frame-only view (walls out of the
 * request) reads in the same three inks as the drawing: paper members, muted girts and purlins, copper bracing. A
 * renderer-side material rather than a MaterialKey: the scene model keeps braces `frame-secondary` (what they are made
 * of), and this is only how the drawing language marks them. Fades with the girts' layer, on its own driver.
 */
let braceMaterial: THREE.MeshStandardMaterial | null = null;
function sharedBraceMaterial(): THREE.MeshStandardMaterial {
  braceMaterial ??= new THREE.MeshStandardMaterial({
    color: '#b76432',
    roughness: 0.7,
    metalness: 0.1,
  });
  return braceMaterial;
}

/**
 * Drives one shared material's opacity from a layer's build-up progress — the opacity half of
 * Phase 3B's visual vocabulary (foundation, secondary structure, walls, roof, gates: "opacity /
 * reveal", per the brief). Renders nothing itself; every mesh using `materialKey` already reads
 * this same cached instance, so one driver per key animates all of them in lockstep with zero
 * extra material allocation.
 *
 * `frame-primary` (columns/rafters) deliberately has NO driver: those two roles are animated by
 * growth (see AnimatedStrut below), where a zero-length box is already invisible — opacity would
 * be redundant, and columns/rafters share one material instance so mutating its opacity would
 * incorrectly apply to both at once even though they run on independently offset timings.
 */
function MaterialOpacityDriver({ materialKey, layer }: Readonly<{ materialKey: MaterialKey | 'brace'; layer: LayerTransitionStyle }>) {
  const progressRef = useBuildProgress(layer);
  useFrame(() => {
    const material = materialKey === 'brace' ? sharedBraceMaterial() : sharedMaterial(materialKey);
    const p = progressRef.current;
    const settled = p >= 1;
    if (material.transparent !== !settled) material.transparent = !settled;
    material.opacity = settled ? 1 : p;
  });
  return null;
}

/**
 * A structural member drawn as a box along its own centre-line, from `a` toward `b`. `progress`
 * (default 1, i.e. fully built) lets a caller draw only the PORTION from `a` to `a + progress·(b
 * − a)` — the "grow from base" / "materialize along the rafter axis" vocabulary the brief asks
 * for (§23). At progress = 1 this is exactly the original full-length transform, so a settled
 * member is pixel-identical to Phase 3A's own output — growth is a generalisation, not a
 * different code path bolted on afterwards.
 */
function grownMatrix(a: THREE.Vector3, b: THREE.Vector3, sectionM: number, progress: number): THREE.Matrix4 {
  const dir = new THREE.Vector3().subVectors(b, a);
  const len = dir.length() || 1e-6;
  const quaternion = new THREE.Quaternion().setFromUnitVectors(X_AXIS, dir.clone().normalize());
  // A zero-length box degenerates its matrix (and, on some drivers, its bounding sphere), so the
  // grown length floors just above zero rather than at exactly 0 — invisible in practice (a few
  // millimetres at any real hangar scale) but numerically well-behaved every frame.
  const grownLen = Math.max(len * progress, 1e-4);
  const position = new THREE.Vector3().copy(a).addScaledVector(dir, progress / 2);
  const scale = new THREE.Vector3(grownLen, sectionM, sectionM);
  return new THREE.Matrix4().compose(position, quaternion, scale);
}

/** Girts: exactly Phase 3A's original component, byte-for-byte — a single static matrix, no
 *  `useFrame`, no build-up hook of any kind. Girts get a plain opacity reveal instead (driven by
 *  `MaterialOpacityDriver`, keyed on their shared `frame-secondary` material), so there is nothing
 *  for this component to animate — and it costs nothing extra to render one, unlike a growth-
 *  capable strut which needs a `useFrame` subscription whether or not it is currently animating. */
function StaticStrut({ strut, castShadow }: Readonly<{ strut: StrutMesh; castShadow: boolean }>) {
  const matrix = useMemo(() => grownMatrix(v(strut.a), v(strut.b), strut.sectionM, 1), [strut]);
  return (
    <mesh
      geometry={UNIT_BOX}
      material={strut.role === 'brace' ? sharedBraceMaterial() : sharedMaterial(strut.material)}
      matrix={matrix}
      matrixAutoUpdate={false}
      castShadow={castShadow}
      receiveShadow
    />
  );
}

/**
 * Phase 3D — one schematic isolated footing: a buried pad plus a short pedestal stub, both simple
 * axis-aligned boxes (no oblique-quad basis math needed, unlike `Panel`/`EnvelopePanel` — a
 * footing never tilts). The pad shares `sharedMaterial('slab')` with the continuous-slab
 * representation — same concrete, buried, never trying to stand out. The pedestal (Phase 3D.1,
 * item 6: readability via material/shadow/contrast, explicitly NOT by enlarging it again) wears
 * its own `footing` material instead — a half-step lighter, so the one part of a footing that is
 * actually visible above grade reads as a distinct object against the ground/shadow rather than
 * blending into either. Both materials have their own driver on the SAME `foundation` layer (see
 * this file's own driver block), so pad and pedestal still fade in lockstep despite the split.
 */
function Footing({ footing, castShadow, layer }: Readonly<{ footing: FootingMesh; castShadow: boolean; layer: LayerTransitionStyle }>) {
  const padMaterial = sharedMaterial(footing.material);
  const pedestalMaterial = sharedMaterial('footing');
  // The pedestal's outline in muted ink (10.10): the one part of a footing above grade, drawn as the frame drawing draws
  // its footings — quieter than the building's own outlines
  const ink = useMemo(() => boxEdges(new THREE.Matrix4().compose(
    new THREE.Vector3(0, footing.pedestalHeightM / 2, 0),
    new THREE.Quaternion(),
    new THREE.Vector3(footing.pedestalWidthM, footing.pedestalHeightM, footing.pedestalWidthM),
  )), [footing]);
  return (
    <group position={[footing.xM, 0, footing.zM]}>
      <InkLines segments={ink} color={INK.muted} widthPx={1} layer={layer} />
      {/* Pad: centred on the column, buried below grade. */}
      <mesh
        geometry={UNIT_BOX}
        material={padMaterial}
        position={[0, -footing.padThicknessM / 2, 0]}
        scale={[footing.padWidthM, footing.padThicknessM, footing.padWidthM]}
        receiveShadow
      />
      {/* Pedestal: the short stub the column base actually sits on, rising above grade. */}
      <mesh
        geometry={UNIT_BOX}
        material={pedestalMaterial}
        position={[0, footing.pedestalHeightM / 2, 0]}
        scale={[footing.pedestalWidthM, footing.pedestalHeightM, footing.pedestalWidthM]}
        castShadow={castShadow}
        receiveShadow
      />
    </group>
  );
}

/** How far proud of the wall's outer face an opening's frame is drawn: past the profiled overlay's 8 mm crests
 *  (envelopePanelGeometry.ts), so no rib hides a stretch of it */
const OPENING_FRAME_PROUD_M = 0.012;

/**
 * Phase 3D.1 — the gate's own door leaf. See `buildGateLeafGeometry`'s own doc comment in
 * envelopePanelGeometry.ts for the geometry and why it needs no placement basis matrix: like
 * `recesses` (the plain dark plane this sits in front of), a gate opening only ever lives on the
 * front face at a fixed depth, so a straight position translation is enough. Shares
 * `sharedMaterial('gate')` — a real, distinct material rather than the recess's near-black void —
 * and mounts on the SAME `gateLayer` as the recess it sits in front of, so the two arrive and leave
 * together with no separate driver of their own.
 */
function GateLeaf({ leaf, castShadow, layer }: Readonly<{ leaf: GateLeafMesh; castShadow: boolean; layer: LayerTransitionStyle }>) {
  const geometry = useMemo(
    () => (leaf.kind === 'door'
      ? buildDoorLeafGeometry(leaf.widthM, leaf.heightM)
      : buildGateLeafGeometry(leaf.widthM, leaf.heightM)),
    [leaf],
  );
  useEffect(() => () => geometry.dispose(), [geometry]);

  // The opening's frame in copper (10.10): the one part of the facade that opens, marked in the colour the site marks
  // what you act on — it is what makes a dark leaf read as a gate rather than as a hole. On the wall's outer face,
  // round the opening as the gable cuts it.
  const frame = useMemo(() => polygonAtZ(
    [{ x: 0, y: 0 }, { x: leaf.widthM, y: 0 }, { x: leaf.widthM, y: leaf.heightM }, { x: 0, y: leaf.heightM }],
    leaf.frameZM - OPENING_FRAME_PROUD_M,
    leaf.xM,
    [],
    (i) => i === 0, // no sill line: a gate's leaf meets the slab, and the slab's own edge is drawn there
  ), [leaf]);
  // A sectional gate's sections in quiet ink: the leaf's front faces' edges only (local z = 0) — the back faces' would
  // show through the gaps between the sections as a second, shifted set. A door is one flush leaf: its frame says it.
  const sections = useMemo(() => {
    if (leaf.kind === 'door') return null;
    const all = creaseEdges(geometry, 30);
    const front: Segments = [];
    for (let i = 0; i < all.length; i += 6) {
      if (Math.abs(all[i + 2]) < 1e-4 && Math.abs(all[i + 5]) < 1e-4) {
        front.push(all[i] + leaf.xM, all[i + 1], leaf.zM, all[i + 3] + leaf.xM, all[i + 4], leaf.zM);
      }
    }
    return front;
  }, [geometry, leaf]);

  return (
    <>
      <mesh
        geometry={geometry}
        material={sharedMaterial(leaf.material)}
        position={[leaf.xM, 0, leaf.zM]}
        castShadow={castShadow}
        receiveShadow
      />
      <InkLines segments={frame} color={INK.copper} widthPx={1.6} layer={layer} />
      {sections && sections.length > 0 && <InkLines segments={sections} color={INK.paper} widthPx={1} opacity={0.32} layer={layer} />}
    </>
  );
}

/** Columns and rafters: the brief's "grow from base" / "materialize along the rafter axis"
 *  vocabulary (§23). `layer` is required (unlike the old single `Strut`) precisely so a girt can
 *  never accidentally pay for this component's `useFrame` subscription — see StaticStrut above. */
function AnimatedStrut({
  strut,
  castShadow,
  layer,
}: Readonly<{
  strut: StrutMesh;
  castShadow: boolean;
  layer: LayerTransitionStyle;
}>) {
  const meshRef = useRef<THREE.Mesh>(null);
  const progressRef = useBuildProgress(layer);
  const a = useMemo(() => v(strut.a), [strut]);
  const b = useMemo(() => v(strut.b), [strut]);

  // Correct on the very FIRST paint of a fresh materialize (progress starts at 0 — see
  // initialProgressForFreshMount, called directly here rather than reading `progressRef.current`:
  // refs must not be read during render) as well as on any later geometry change (a dimension
  // edit recomputes `strut.a`/`b` immediately, independent of whatever this layer's animation is
  // doing — dimension changes are not supposed to replay the build sequence). `useFrame` below is
  // what keeps the mesh current on every subsequent animation frame; this memo only has to be
  // right at the instant `a`/`b`/`layer.phase` actually change.
  const matrix = useMemo(
    () => grownMatrix(a, b, strut.sectionM, initialProgressForFreshMount(layer.phase)),
    [a, b, strut.sectionM, layer.phase],
  );

  useFrame(() => {
    if (!meshRef.current) return;
    meshRef.current.matrix.copy(grownMatrix(a, b, strut.sectionM, progressRef.current));
  });

  return (
    <mesh
      ref={meshRef}
      geometry={UNIT_BOX}
      material={sharedMaterial(strut.material)}
      matrix={matrix}
      matrixAutoUpdate={false}
      castShadow={castShadow}
      receiveShadow
    />
  );
}

/**
 * A planar surface given real thickness. The box's basis is derived from the quad's own edges, so
 * this works unchanged for an axis-aligned side wall and for a pitched roof slope.
 *
 * `thicknessDirection` decides which way the material grows from the plane, and it is a
 * CONSTRUCTION DETAIL, not a change to geometric truth: cladding is fixed to the OUTSIDE of a
 * portal frame, so envelope panels grow outward and the frame sits just inside them. Getting this
 * backwards is visible and wrong — an inward-growing roof deck ends up *below* the rafter
 * centre-lines, so the bright rafters read on top of a sunken surface and the gable looks like a
 * valley (confirmed on screen before this was fixed).
 *
 * Either way the direction is decided by testing the plane's normal against the model's interior
 * rather than hard-coding a sign per face: the right wall's normal points opposite to the left
 * wall's, and hard-coding that is how face-convention bugs start.
 */
function panelMatrix(panel: PanelMesh, interiorPoint: THREE.Vector3, thicknessDirection: 'inward' | 'outward'): THREE.Matrix4 {
  const [c0, c1, , c3] = panel.corners.map(v);
  const u = new THREE.Vector3().subVectors(c1, c0);
  const w = new THREE.Vector3().subVectors(c3, c0);
  const lu = u.length() || 1e-6;
  const lw = w.length() || 1e-6;
  const un = u.clone().normalize();
  const wn = w.clone().normalize();
  const normal = new THREE.Vector3().crossVectors(un, wn).normalize();

  const centre = panel.corners
    .map(v)
    .reduce((acc, p) => acc.add(p), new THREE.Vector3())
    .multiplyScalar(0.25);

  const towardInterior = new THREE.Vector3().subVectors(interiorPoint, centre);
  const inwardSign = towardInterior.dot(normal) >= 0 ? 1 : -1;
  const sign = thicknessDirection === 'inward' ? inwardSign : -inwardSign;
  centre.addScaledVector(normal, (sign * panel.thicknessM) / 2);

  // Local x → first edge, local y → second edge, local z → surface normal.
  //
  // The basis MUST stay right-handed. `normal` is `un × wn` by construction, so (un, wn, normal)
  // has determinant +1; feeding the flipped normal in here instead produced a left-handed
  // (improper) matrix, and `setFromRotationMatrix` on one of those yields a garbage rotation.
  // That was a real, visible bug: every panel whose thickness pointed the other way came out
  // mis-rotated, so the gable rendered as a row of dark chevrons instead of two clean slopes.
  // The box is symmetric about its local z, so the flip only ever needed to move the centre.
  const basis = new THREE.Matrix4().makeBasis(un, wn, normal);
  const quaternion = new THREE.Quaternion().setFromRotationMatrix(basis);
  const scale = new THREE.Vector3(lu, lw, panel.thicknessM);

  return new THREE.Matrix4().compose(centre, quaternion, scale);
}

function Panel({
  panel,
  interiorPoint,
  castShadow,
  thicknessDirection = 'outward',
  ink,
}: Readonly<{
  panel: PanelMesh;
  interiorPoint: THREE.Vector3;
  castShadow: boolean;
  thicknessDirection?: 'inward' | 'outward';
  /** The box's twelve edges in paper ink, on this layer (10.10): the slab's outline, which makes it a part */
  ink?: LayerTransitionStyle;
}>) {
  const matrix = useMemo(() => panelMatrix(panel, interiorPoint, thicknessDirection), [panel, interiorPoint, thicknessDirection]);
  const edges = useMemo(() => (ink ? boxEdges(matrix) : null), [ink, matrix]);

  return (
    <>
      <mesh
        geometry={UNIT_BOX}
        material={sharedMaterial(panel.material)}
        matrix={matrix}
        matrixAutoUpdate={false}
        castShadow={castShadow}
        receiveShadow
      />
      {ink && edges && <InkLines segments={edges} color={INK.paper} widthPx={1.2} opacity={0.78} layer={ink} />}
    </>
  );
}

/** Keyed on the panel's own real dimensions (rounded to the millimetre) and cladding system, not
 *  on panel identity — most bay panels in a real building share one width, so this lets neighbours
 *  reuse a single geometry instance instead of each generating its own copy of an identical wave.
 *  Cache, not `useMemo`, for the same reason `MATERIAL_CACHE` above is a cache: identity needs to
 *  survive across DIFFERENT panels, which per-component `useMemo` cannot do by itself. */
const ENVELOPE_GEOMETRY_CACHE = new Map<string, THREE.BufferGeometry>();

/**
 * Bounded, because the key is a real dimension and dimensions are a SLIDER. Every step of a drag
 * produces panel sizes that have never been seen before, so an unbounded map keeps one corrugated
 * geometry — and its GPU buffers — for every size the visitor ever passed through, none of which
 * they will pass through again. Measured before capping: sweeping length 20 -> 120 and returning
 * to the starting 60 m left 78 extra live GPU buffers held, a width sweep added 30 more, and the
 * session went from 36 live buffers to 174 without the building ever changing shape at the end.
 *
 * The cap was measured rather than picked. Sweeping length 20 -> 120 and then width 12 -> 48:
 *
 *   unbounded   +78 buffers, then +30 more   174 live
 *   cap 48      +78,                +30      174   (never reached, so it bounds nothing)
 *   cap 32      +78,                +12      156
 *   cap 24      +66,                  0      132   <- steady state reached
 *   cap 8       +18,                  -9      75   (bounds hardest, but regenerates more)
 *
 * 24 is where the second sweep stops adding anything, i.e. the cache has reached a steady state
 * instead of tracking the visitor's history. It is also comfortably above what one configuration
 * needs: the LARGEST building this tool allows (50 x 120 x 15) uses 36 GPU buffers in total for
 * the whole scene, and six re-renders that change nothing geometric allocate zero — so there is no
 * thrash inside a single configuration, which is the failure mode a too-small cap would cause.
 */
const ENVELOPE_GEOMETRY_CACHE_MAX = 24;

function envelopeGeometryFor(widthM: number, heightM: number, thicknessM: number, system: CladdingSystem | undefined): THREE.BufferGeometry {
  const key = `${system ?? 'flat'}:${widthM.toFixed(3)}:${heightM.toFixed(3)}:${thicknessM.toFixed(3)}`;
  const existing = ENVELOPE_GEOMETRY_CACHE.get(key);
  if (existing) {
    // Re-insert so the Map's own insertion order doubles as recency — the least recently USED
    // entry is then simply the first one, which is what eviction below takes.
    ENVELOPE_GEOMETRY_CACHE.delete(key);
    ENVELOPE_GEOMETRY_CACHE.set(key, existing);
    return existing;
  }

  const geometry = buildEnvelopePanelGeometry(widthM, heightM, thicknessM, system);
  ENVELOPE_GEOMETRY_CACHE.set(key, geometry);

  while (ENVELOPE_GEOMETRY_CACHE.size > ENVELOPE_GEOMETRY_CACHE_MAX) {
    const oldestKey = ENVELOPE_GEOMETRY_CACHE.keys().next().value;
    if (oldestKey === undefined) break;
    const evicted = ENVELOPE_GEOMETRY_CACHE.get(oldestKey);
    ENVELOPE_GEOMETRY_CACHE.delete(oldestKey);
    // Disposing is the whole point of evicting: dropping the reference alone would leave the GPU
    // buffers allocated until the context goes away.
    evicted?.dispose();
  }

  return geometry;
}

/**
 * Phase 3D — wall and roof panels specifically (never slab/gate-recess, which stay on the plain
 * symmetric `Panel` above): builds real corrugated/seamed geometry via `envelopePanelGeometry.ts`
 * instead of a flat scaled box.
 *
 * Deliberately its own component rather than a branch inside `Panel`: the two need different
 * placement math, not just different geometry. `Panel`'s box is symmetric about its own local
 * Z=0, so "which way does thickness grow" is resolved entirely by shifting the CENTRE point — the
 * basis itself always keeps `+normal` as local Z (required for `setFromRotationMatrix` to stay
 * proper/right-handed; see `Panel`'s own comment on that). This component's geometry is NOT
 * symmetric — its front face (where the ribs/seams live) is authored at local Z=0 specifically,
 * extending to -thicknessM — so centring cannot place it, and outward-facing envelope panels are
 * the ONLY case this component handles (unlike `Panel`, no `thicknessDirection` prop). When the
 * quad's own natural `un × wn` normal already points outward, the basis is used as-is; when it
 * points inward (true for exactly one of every left/right or front/back pair, same ambiguity
 * `Panel` resolves via `interiorPoint`), `un` is negated instead of swapping `un`/`wn` — negating
 * one edge flips a cross product's sign (giving an outward, still-proper right-handed basis)
 * without swapping which local axis is width vs height, which swapping `un`/`wn` would have done
 * and would have rotated every rib/seam 90° on exactly the panels that needed the flip.
 */
function envelopePlacement(panel: PanelMesh, interiorPoint: THREE.Vector3): { matrix: THREE.Matrix4; widthM: number; heightM: number } {
  const [c0, c1, , c3] = panel.corners.map(v);
  const u = new THREE.Vector3().subVectors(c1, c0);
  const w = new THREE.Vector3().subVectors(c3, c0);
  const lu = u.length() || 1e-6;
  const lw = w.length() || 1e-6;
  const wn = w.clone().normalize();

  const naturalUn = u.clone().normalize();
  const naturalNormal = new THREE.Vector3().crossVectors(naturalUn, wn).normalize();
  const centre = panel.corners.map(v).reduce((acc, p) => acc.add(p), new THREE.Vector3()).multiplyScalar(0.25);
  const towardInterior = new THREE.Vector3().subVectors(interiorPoint, centre);
  const pointsInward = towardInterior.dot(naturalNormal) >= 0;

  const un = pointsInward ? naturalUn.clone().negate() : naturalUn;
  const normal = new THREE.Vector3().crossVectors(un, wn).normalize();
  // Where the cladding hangs (09.10, audit F68; threeSceneModel.ts `standoff`): the geometry spans local Z
  // [−thickness, 0], so its origin moves out along the outward normal by the standoff AND the thickness — the inner
  // face then stands `outwardM` off the members' plane, the frame inside it. Along the first edge it runs on past
  // its corners by `startM`/`endM`, from whichever corner the flipped basis starts at; a wall's first corner is on
  // its top edge, and it runs up past it by `riseM`, back along the second edge.
  const { outwardM = 0, startM = 0, endM = 0, riseM = 0 } = panel.standoff ?? {};
  const origin = pointsInward ? c1.clone().addScaledVector(naturalUn, endM) : c0.clone().addScaledVector(naturalUn, -startM);
  origin.addScaledVector(wn, -riseM).addScaledVector(normal, outwardM + (panel.standoff ? panel.thicknessM : 0));

  const basis = new THREE.Matrix4().makeBasis(un, wn, normal);
  const quaternion = new THREE.Quaternion().setFromRotationMatrix(basis);
  const matrix = new THREE.Matrix4().compose(origin, quaternion, new THREE.Vector3(1, 1, 1));

  return { matrix, widthM: lu + startM + endM, heightM: lw + riseM };
}

function EnvelopePanel({
  panel,
  interiorPoint,
  castShadow,
}: Readonly<{
  panel: PanelMesh;
  interiorPoint: THREE.Vector3;
  castShadow: boolean;
}>) {
  const { matrix, geometry } = useMemo(() => {
    const placement = envelopePlacement(panel, interiorPoint);
    return { matrix: placement.matrix, geometry: envelopeGeometryFor(placement.widthM, placement.heightM, panel.thicknessM, panel.claddingSystem) };
  }, [panel, interiorPoint]);

  return (
    <mesh
      geometry={geometry}
      material={sharedMaterial(panel.material)}
      matrix={matrix}
      matrixAutoUpdate={false}
      castShadow={castShadow}
      receiveShadow
    />
  );
}

/** A line along a panel's face, from one point of it to another, in the panel's own metres */
function inkAlong(matrix: THREE.Matrix4, target: Segments, [x0, y0]: readonly [number, number], [x1, y1]: readonly [number, number]) {
  const a = new THREE.Vector3(x0, y0, 0).applyMatrix4(matrix);
  const b = new THREE.Vector3(x1, y1, 0).applyMatrix4(matrix);
  target.push(a.x, a.y, a.z, b.x, b.y, b.z);
}

type EnvelopeInk = { segments: Segments; seams: Segments; ribs: Segments; joints: Segments };

/** A bay's cladding texture (10.10): a profiled sheet's ribs along its height — up the wall, down the slope; a sandwich
 *  wall's joints across it; the roof's panels' seams down the slope */
function claddingInk(panel: PanelMesh, placement: { matrix: THREE.Matrix4; widthM: number; heightM: number }, surface: 'walls' | 'roof', ribPitchM: number, ink: EnvelopeInk) {
  const { matrix, widthM, heightM } = placement;
  if (panel.claddingSystem === 'profiled-sheet') {
    for (const x of profiledRibsM(widthM, ribPitchM)) inkAlong(matrix, ink.ribs, [x, 0], [x, heightM]);
  } else if (panel.claddingSystem === 'sandwich-panel' && surface === 'walls') {
    for (const y of sandwichCoursesM(heightM)) inkAlong(matrix, ink.joints, [0, y], [widthM, y]);
  } else if (panel.claddingSystem === 'sandwich-panel') {
    for (const x of sandwichSeamsM(widthM)) inkAlong(matrix, ink.seams, [x, 0], [x, heightM]);
  }
}

/** One face's outline — its bays' outer faces with the joints between them taken out — and, for the roof, its
 *  underside's, which shows the lid's thickness where it oversails the walls */
function faceInk(facePanels: PanelMesh[], interiorPoint: THREE.Vector3, surface: 'walls' | 'roof', roofShown: boolean, ribPitchM: number, ink: EnvelopeInk) {
  const outer: Array<[THREE.Vector3, THREE.Vector3]> = [];
  const under: Array<[THREE.Vector3, THREE.Vector3]> = [];
  for (const panel of facePanels) {
    const placement = envelopePlacement(panel, interiorPoint);
    outer.push(...faceRectangle(placement.matrix, placement.widthM, placement.heightM));
    claddingInk(panel, placement, surface, ribPitchM, ink);
    if (surface === 'roof') {
      const back = placement.matrix.clone().multiply(new THREE.Matrix4().makeTranslation(0, 0, -panel.thicknessM));
      under.push(...faceRectangle(back, placement.widthM, placement.heightM));
    }
  }
  const outerSides = outlineSides(surfaceOutline(outer));
  const headHidden = surface === 'roof' || roofShown;
  pushSegments(ink.segments, headHidden ? outerSides.filter((edge) => edge.side !== 'top') : outerSides);
  if (surface === 'roof') pushSegments(ink.segments, outlineSides(surfaceOutline(under)).filter((edge) => edge.side !== 'top'));
}

/** A surface's ink: each face drawn on its own — a face's joints cancel only against its own bays, grouped by the face
 *  the panel's id names (wall-left-3, roof-right-0) */
function envelopeInk(panels: PanelMesh[], interiorPoint: THREE.Vector3, surface: 'walls' | 'roof', roofShown: boolean, ribPitchM: number): EnvelopeInk {
  const ink: EnvelopeInk = { segments: [], seams: [], ribs: [], joints: [] };
  const faces = new Map<string, PanelMesh[]>();
  for (const panel of panels) {
    const face = panel.id.replace(/-\d+$/, '');
    faces.set(face, [...(faces.get(face) ?? []), panel]);
  }
  for (const facePanels of faces.values()) faceInk(facePanels, interiorPoint, surface, roofShown, ribPitchM, ink);
  return ink;
}

/**
 * One envelope surface's outline (10.10, inkOutlines.ts): every bay's outer face, placed exactly as EnvelopePanel
 * places the bay, with the joints between bays taken out — so each side wall and each roof slope is drawn as one part.
 *
 * Only the edges that can be seen, chosen by side rather than left to the depth test: the ink stands a few pixels
 * toward the camera (InkLines), so an edge hidden by less than that would show through. A wall's head is under the
 * roof — drawn only when the roof is out of the request. The roof draws its underside's eave and rakes too, which show
 * its thickness as a fascia (the lid's edge) where it oversails the walls; not its slopes' heads, which the ridge cap
 * covers (RidgeCap draws the ridge), nor the underside's, deep in the roof.
 *
 * A sandwich panel's seams in the quietest ink (`sandwichSeamsM`): the panels' rhythm, under the outlines in weight,
 * so the two cladding systems still read apart — profiled sheet by its ribs' fine texture, sandwich by its joints.
 */
function EnvelopeOutline({
  panels,
  interiorPoint,
  layer,
  surface,
  roofShown = true,
  ribPitchM,
}: Readonly<{
  panels: PanelMesh[];
  interiorPoint: THREE.Vector3;
  layer: LayerTransitionStyle;
  surface: 'walls' | 'roof';
  roofShown?: boolean;
  /** How far apart a profiled sheet's ribs are drawn (inkRibPitchM) */
  ribPitchM: number;
}>) {
  const { segments, seams, ribs, joints } = useMemo(
    () => envelopeInk(panels, interiorPoint, surface, roofShown, ribPitchM),
    [panels, interiorPoint, surface, roofShown, ribPitchM],
  );

  return (
    <>
      {segments.length > 0 && <InkLines segments={segments} color={INK.paper} widthPx={1.25} opacity={0.9} layer={layer} />}
      {seams.length > 0 && <InkLines segments={seams} color={INK.joint} widthPx={1} opacity={0.4} layer={layer} />}
      {ribs.length > 0 && <InkLines segments={ribs} color={INK.paper} widthPx={1} opacity={0.18} layer={layer} />}
      {joints.length > 0 && <InkLines segments={joints} color={INK.joint} widthPx={1} opacity={0.45} layer={layer} />}
    </>
  );
}

/**
 * A gable end extruded from its real pentagon, with gate openings as actual holes in the mesh
 * rather than dark rectangles painted on top. Phase 3D.1 adds a cladding overlay (ribs for
 * profiled sheet, seam caps for sandwich panel — see `buildGableCladdingOverlay`'s own module
 * note) matching the side walls, as a SECOND mesh protruding from the field's existing outward
 * face rather than reshaping the field itself: the field's own geometry/position is untouched
 * (zero risk to the fit already proven against the roof/wall corners), and the overlay simply
 * sits flush against whichever end is outward.
 *
 * "Outward" flips between the front and rear gable — both extrude toward local +Z (into the
 * building) from wherever `zM` places them, but they sit at opposite ends of the building's own
 * length, so the front's outward face is its NEAR (local Z=0) end and the rear's is its FAR
 * (local Z=+thicknessM) end. See `GableMesh.face`'s own doc comment.
 */
function Gable({ gable, castShadow, layer, roofShown, ribPitchM }: Readonly<{
  gable: GableMesh;
  castShadow: boolean;
  layer: LayerTransitionStyle;
  roofShown: boolean;
  ribPitchM: number;
}>) {
  const geometry = useMemo(() => {
    const shape = new THREE.Shape();
    gable.outline.forEach((p, i) => (i === 0 ? shape.moveTo(p.x, p.y) : shape.lineTo(p.x, p.y)));
    shape.closePath();

    for (const hole of gable.holes) {
      const path = new THREE.Path();
      hole.forEach((p, i) => (i === 0 ? path.moveTo(p.x, p.y) : path.lineTo(p.x, p.y)));
      path.closePath();
      shape.holes.push(path);
    }

    return new THREE.ExtrudeGeometry(shape, { depth: gable.thicknessM, bevelEnabled: false });
  }, [gable]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  // The overlay is authored from its own x = 0; the cladding's pentagon starts at `gable.xM` (09.10, F68: widened to
  // the side walls), so the holes move into the overlay's frame and the mesh back out to the gable's
  const overlay = useMemo(
    () => buildGableCladdingOverlay(
      gable.widthM,
      gable.eaveM,
      gable.ridgeM,
      gable.holes.map((hole) => hole.map((p) => ({ x: p.x - gable.xM, y: p.y }))),
      gable.claddingSystem,
    ),
    [gable],
  );
  useEffect(() => () => overlay?.geometry.dispose(), [overlay]);

  const overlayZ = overlay
    ? gable.face === 'front'
      ? gable.zM - overlay.depthM // protrudes further toward the viewer (−Z) than the field's own near face
      : gable.zM + gable.thicknessM // protrudes further away (+Z) than the field's own far face
    : 0;

  // The gable's outline in paper ink (10.10) on its outermost face — the overlay's crests where there is one. Its two
  // rakes (outline edges 2 and 3) only when the roof is out of the request: under the roof they are the roof's own
  // underside rakes, which EnvelopeOutline draws. The openings' edges are not drawn here: their frames are the gates'
  // own (GateLeaf), in copper.
  const ink = useMemo(() => {
    const depthM = overlay?.depthM ?? 0;
    const faceZ = gable.face === 'front' ? gable.zM - depthM : gable.zM + gable.thicknessM + depthM;
    return polygonAtZ(gable.outline, faceZ, 0, [], roofShown ? (i) => i === 2 || i === 3 : undefined);
  }, [gable, overlay, roofShown]);
  // …and its cladding's texture as the walls draw it (EnvelopeOutline, 10.10): a profiled gable's ribs upright, a
  // sandwich gable's joints across it — inside the pentagon, broken at the openings
  const { ribs, joints } = useMemo(() => {
    const depthM = overlay?.depthM ?? 0;
    const faceZ = gable.face === 'front' ? gable.zM - depthM : gable.zM + gable.thicknessM + depthM;
    const holes = gable.holes.map((hole) => hole.map((p) => ({ x: p.x - gable.xM, y: p.y })));
    if (gable.claddingSystem === 'sandwich-panel') {
      return {
        ribs: [],
        joints: gableCourses(gable.widthM, gable.eaveM, gable.ridgeM, holes)
          .flatMap(({ x0, x1, y }) => [gable.xM + x0, y, faceZ, gable.xM + x1, y, faceZ]),
      };
    }
    return {
      ribs: gableRibs(gable.widthM, gable.eaveM, gable.ridgeM, holes, ribPitchM)
        .flatMap(({ x, y0, y1 }) => [gable.xM + x, y0, faceZ, gable.xM + x, y1, faceZ]),
      joints: [],
    };
  }, [gable, overlay, ribPitchM]);

  return (
    <>
      <mesh
        geometry={geometry}
        material={sharedMaterial(gable.material)}
        position={[0, 0, gable.zM]}
        castShadow={castShadow}
        receiveShadow
      />
      {overlay && (
        <mesh
          geometry={overlay.geometry}
          material={sharedMaterial(gable.material)}
          position={[gable.xM, 0, overlayZ]}
          castShadow={castShadow}
          receiveShadow
        />
      )}
      <InkLines segments={ink} color={INK.paper} widthPx={1.25} opacity={0.9} layer={layer} />
      {ribs.length > 0 && <InkLines segments={ribs} color={INK.paper} widthPx={1} opacity={0.18} layer={layer} />}
      {joints.length > 0 && <InkLines segments={joints} color={INK.joint} widthPx={1} opacity={0.45} layer={layer} />}
    </>
  );
}

/**
 * Phase 3D.1 — the ridge cap: see `buildRidgeCapGeometry`'s own doc comment in
 * envelopePanelGeometry.ts for why this is the one finishing piece added among the brief's three
 * candidates, and for the geometry itself. Built directly from `building`'s own real dimensions
 * (no placement basis matrix needed — the shape is already authored in world (X, Y) and extrudes
 * along world Z, which is exactly the ridge's own run direction), so this component only has to
 * memoize the geometry and mount a single mesh. Shares the roof's own cladding-system material
 * with the roof panels themselves (Phase 3F: `roofSystem` picks `roof-profiled` vs
 * `roof-sandwich` — same coil colour AND response a real ridge cap is ordered in) — so it needs no
 * opacity driver of its own and fades in lockstep with the roof for free, same reasoning as
 * `Footing` sharing the slab's own material/driver above.
 */
function RidgeCap({
  building,
  roofSystem,
  cladding,
  castShadow,
  layer,
}: Readonly<{
  building: ParametricBuildingModel;
  roofSystem: CladdingSystem;
  cladding: ThreeSceneModel['roofCladding'];
  castShadow: boolean;
  layer: LayerTransitionStyle;
}>) {
  const { widthM, lengthM } = building.footprint;
  const { ridgeM } = building.heights;
  const { pitchDeg } = building.roof;
  // On the roof's outer faces, which stand `outerM` off the rafters along each slope's normal — so meet that much over
  // the slope's cosine above the ridge line — and as long as the roof, which runs on past both end frames (09.10, F68)
  const capRidgeM = ridgeM + cladding.outerM / Math.cos((pitchDeg * Math.PI) / 180);
  const capLengthM = lengthM + 2 * cladding.endReachM;
  const geometry = useMemo(
    () => buildRidgeCapGeometry(widthM, capLengthM, capRidgeM, pitchDeg),
    [widthM, capLengthM, capRidgeM, pitchDeg],
  );
  useEffect(() => () => geometry.dispose(), [geometry]);
  // The ridge in ink (10.10): the cap's crown, the one line where the two slopes meet, which the light alone drew as a
  // soft change of tone. Its skirts are left out: 22 cm down either slope, at a 12 m span they drew the ridge as three
  // lines, and they lie on the roof, within the ink's lift of it (InkLines).
  const ink = useMemo(() => {
    const creases = creaseEdges(geometry, 20, new THREE.Vector3(0, 0, -cladding.endReachM));
    let top = -Infinity;
    for (let i = 1; i < creases.length; i += 3) top = Math.max(top, creases[i]);
    const crown: Segments = [];
    for (let i = 0; i < creases.length; i += 6) {
      if (creases[i + 1] > top - 1e-4 && creases[i + 4] > top - 1e-4) crown.push(...creases.slice(i, i + 6));
    }
    return crown;
  }, [geometry, cladding.endReachM]);

  return (
    <>
      <mesh
        geometry={geometry}
        material={sharedMaterial(claddingMaterialKey('roof', roofSystem))}
        position={[0, 0, -cladding.endReachM]}
        castShadow={castShadow}
        receiveShadow
      />
      <InkLines segments={ink} color={INK.paper} widthPx={1.1} opacity={0.75} layer={layer} />
    </>
  );
}

/** Foundation's own build-up vocabulary is "opacity + a very subtle vertical settle" (brief §23),
 *  distinct from every other layer's plain opacity reveal — so the slab gets one small wrapping
 *  group instead of touching Panel's shared matrix maths for a single, one-off use. The offset is
 *  proportional to the slab's own thickness rather than a fixed metre value, so it stays
 *  "subtle" relative to the object at any hangar scale instead of reading as a fixed jolt on a
 *  small building and nothing at all on a large one. */
function SettlingSlab({
  children,
  layer,
  thicknessM,
}: Readonly<{
  children: React.ReactNode;
  layer: LayerTransitionStyle;
  thicknessM: number;
}>) {
  // Must be called from IN here, not passed down as a ready-made ref: useBuildProgress calls
  // useThree/useFrame internally, and those only work inside <Canvas>'s own React tree — calling
  // it in ThreeHangarView's body (the component that RENDERS <Canvas>, and so sits OUTSIDE it)
  // throws "Hooks can only be used within the Canvas component" at runtime. Caught live, not by
  // any static check — typecheck/lint/unit tests all passed with the outside-Canvas version.
  const progressRef = useBuildProgress(layer);
  const groupRef = useRef<THREE.Group>(null);
  useFrame(() => {
    if (!groupRef.current) return;
    groupRef.current.position.y = -(1 - progressRef.current) * thicknessM * 1.5;
  });
  return <group ref={groupRef}>{children}</group>;
}

/**
 * The technical look's light (10.10) — it replaces Phase 3F's «Premium Industrial» study, whose low fill and dark
 * backdrop were exactly what the owner found unreadable on /angary: walls and roof one grey-blue, both visible walls one
 * tone. The camera (viewProjection.ts) looks at the front gable and the left long wall from the front-left and above,
 * so the light is set against THAT view, by direction rather than by the building's metres, so every size gets the
 * same three tones:
 *   • the key, high from the front-right, lights the roof most, the front gable (the gates' wall) half, and misses the
 *     long wall — three clear value steps, lid › gable › long wall, the way an architect's axonometric shades;
 *   • a cool-to-ground hemisphere keeps every face's own value (no face goes black on a dark field);
 *   • a weak fill from the left lifts the long wall off the field just enough to stay a surface, not a hole.
 * Its shadow falls forward-left, onto the ground in front of the long wall — in view, where it seats the building.
 * No fog any more: the outlines separate near from far now (inkOutlines.ts), and fog graded the far end of a long
 * hangar into the field — the opposite of what a drawing does. Values tuned on screen against /angary's light steel
 * (materials.ts SHEET_*), at 24 × 60 × 8, 12 × 18 × 4 and 50 × 120 × 15.
 */
const KEY_DIRECTION = new THREE.Vector3(0.35, 0.8, -0.5).normalize();
const FILL_DIRECTION = new THREE.Vector3(-0.9, 0.35, 0.25).normalize();
const AMBIENT_INTENSITY = 0.3;
const HEMISPHERE_INTENSITY = 1.4;
const KEY_INTENSITY = 3.85;
const FILL_INTENSITY = 0.4;

function SceneLighting({ scene, shadows, shadowMapSize }: Readonly<{ scene: ThreeSceneModel; shadows: boolean; shadowMapSize: number }>) {
  const { center, size: extent } = scene.bounds;
  const radius = Math.max(Math.hypot(extent.x, extent.y, extent.z), 1);
  const keyLightRef = useRef<THREE.DirectionalLight>(null);

  // A directional light aims at its `target`, which defaults to the world origin — and this
  // building's origin is its front-left-bottom CORNER, not its centre. Left at the default the key
  // light rakes across the object at an odd angle and the shadow camera is centred on the corner
  // too. This target sits at the model's real centroid.
  const target = useMemo(() => new THREE.Object3D(), []);

  // Phase 3F §14: `shadow-mapSize` is a prop THREE.js only reads when it first ALLOCATES the
  // shadow map's render target — changing it on an already-rendered light updates `.mapSize`
  // (the number) but leaves the existing GPU texture at its old resolution, since Three only
  // reallocates when `.map` is null. Explicitly disposing it here on every `shadowMapSize` change
  // is what makes the fullscreen-quality bump (embedded 1024 -> fullscreen 2048) actually visible
  // on the SAME light/SAME Canvas rather than requiring a remount (which the brief's own §14
  // explicitly rules out: "no second Canvas, no duplicated WebGL context").
  useEffect(() => {
    const light = keyLightRef.current;
    if (!light) return;
    light.shadow.mapSize.set(shadowMapSize, shadowMapSize);
    light.shadow.map?.dispose();
    light.shadow.map = null;
  }, [shadowMapSize]);

  // Directions, placed at the building's own scale: far enough out that the shadow camera below spans the whole model
  const keyPosition = useMemo<[number, number, number]>(
    () => [center.x + KEY_DIRECTION.x * radius * 2, center.y + KEY_DIRECTION.y * radius * 2, center.z + KEY_DIRECTION.z * radius * 2],
    [center, radius],
  );
  const fillPosition = useMemo<[number, number, number]>(
    () => [center.x + FILL_DIRECTION.x * radius * 2, center.y + FILL_DIRECTION.y * radius * 2, center.z + FILL_DIRECTION.z * radius * 2],
    [center, radius],
  );

  return (
    <>
      <ambientLight intensity={AMBIENT_INTENSITY} />
      {/* warm paper sky over a dark ground: up-facing surfaces (the roof, the slab) take the sky, walls half of it */}
      <hemisphereLight args={['#f4f1ea', '#2a2c2b', HEMISPHERE_INTENSITY]} />

      <primitive object={target} position={[center.x, center.y, center.z]} />
      <directionalLight
        ref={keyLightRef}
        position={keyPosition}
        target={target}
        intensity={KEY_INTENSITY}
        castShadow={shadows}
        shadow-mapSize={[shadowMapSize, shadowMapSize]}
        shadow-camera-left={-radius * 0.75}
        shadow-camera-right={radius * 0.75}
        shadow-camera-top={radius * 0.75}
        shadow-camera-bottom={-radius * 0.75}
        shadow-camera-near={0.1}
        shadow-camera-far={radius * 6}
        shadow-bias={-0.0006}
        shadow-normalBias={0.02}
      />
      <directionalLight position={fillPosition} target={target} intensity={FILL_INTENSITY} />
    </>
  );
}

/**
 * The building's contact with the ground (10.10): a soft shade hugging the slab's footprint, fading out over a couple
 * of metres — so it sits on the field rather than floating over it, on a phone too, where the key light casts no shadow
 * (HangarPreviewModes turns shadows off there). A distance-to-rectangle falloff in metres, not a stretched texture: a
 * radial texture scaled to a 24 × 60 m footprint smeared its fade along the length. One quad, one tiny shader. Under
 * the slab's footprint whatever the request holds — the frame alone, or the walls without a foundation, stand on the
 * same ground — so it belongs to no build-up layer.
 */
const CONTACT_SHADE_FALLOFF_M = 5;
const CONTACT_SHADE_STRENGTH = 0.6;

function ContactShade({ building, yM }: Readonly<{ building: ParametricBuildingModel; yM: number }>) {
  const xs = building.slab.corners.map((c) => c.x);
  const zs = building.slab.corners.map((c) => c.z);
  const [minX, maxX, minZ, maxZ] = [Math.min(...xs), Math.max(...xs), Math.min(...zs), Math.max(...zs)];
  const halfW = (maxX - minX) / 2;
  const halfL = (maxZ - minZ) / 2;
  const material = useMemo(() => new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      halfSize: { value: new THREE.Vector2() },
      falloff: { value: CONTACT_SHADE_FALLOFF_M },
      strength: { value: CONTACT_SHADE_STRENGTH },
    },
    vertexShader: `
      varying vec2 vLocal;
      void main() {
        vLocal = position.xy;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
      uniform vec2 halfSize;
      uniform float falloff;
      uniform float strength;
      varying vec2 vLocal;
      void main() {
        float d = length(max(abs(vLocal) - halfSize, 0.0));
        float t = 1.0 - clamp(d / falloff, 0.0, 1.0);
        gl_FragColor = vec4(0.0, 0.0, 0.0, strength * t * sqrt(t));
      }`,
  }), []);
  useEffect(() => () => material.dispose(), [material]);
  useEffect(() => {
    material.uniforms.halfSize.value.set(halfW, halfL);
  }, [material, halfW, halfL]);

  return (
    <mesh position={[(minX + maxX) / 2, yM + 0.004, (minZ + maxZ) / 2]} rotation={[-Math.PI / 2, 0, 0]} material={material} renderOrder={-1}>
      <planeGeometry args={[2 * (halfW + CONTACT_SHADE_FALLOFF_M), 2 * (halfL + CONTACT_SHADE_FALLOFF_M)]} />
    </mesh>
  );
}

/** frameloop="demand" renders nothing until asked. Any change to the model must therefore
 *  explicitly request a frame, or the canvas would keep showing the previous configuration. */
function InvalidateOnChange({ scene }: Readonly<{ scene: ThreeSceneModel }>) {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    invalidate();
  }, [scene, invalidate]);
  return null;
}

/**
 * Phase 3F.1 — test-only render/compositor synchronisation, root-caused during Phase 3F's own
 * visual-regression work: a screenshot taken immediately after `invalidate()` can capture a STALE
 * browser-compositor frame even though the underlying WebGL framebuffer already holds the correct,
 * newly-rendered pixels (confirmed directly via `gl.readPixels` under Playwright, which read the
 * exact new value while `toHaveScreenshot()` on the same page kept matching the OLD baseline byte-
 * for-byte). Screenshot APIs (Playwright's, and Chrome DevTools Protocol's `Page.captureScreenshot`
 * underneath it) read from the compositor, not from WebGL's own drawing buffer — and a
 * `frameloop="demand"` canvas that only repaints on `invalidate()` does not reliably trigger enough
 * repaint/composite cycles on its own for the compositor to have caught up by the time a screenshot
 * is requested right after.
 *
 * `invalidateAndWaitForFrame()` fixes exactly that ordering: it (1) waits for a genuine R3F render
 * to actually happen (via `useFrame`, which frameloop="demand" only calls during a real triggered
 * render — never a busy-poll), THEN (2) waits two further animation frames so the browser's own
 * compositor has a chance to pick up the new canvas content before resolving. Nothing here adds a
 * continuous render loop: outside of an explicit call, this component does no work at all.
 *
 * Test/dev only — `process.env.NODE_ENV === 'production'` skips mounting the global entirely, so
 * this never ships as product-visible surface area. No renderer internals are exposed beyond the
 * one method a screenshot test actually needs.
 */
function TestRenderSyncAPI() {
  const invalidate = useThree((s) => s.invalidate);
  const pendingRef = useRef<Array<() => void>>([]);

  useFrame(() => {
    if (pendingRef.current.length === 0) return;
    const resolvers = pendingRef.current;
    pendingRef.current = [];
    for (const resolve of resolvers) resolve();
  });

  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return;
    const api = {
      invalidateAndWaitForFrame: () =>
        new Promise<void>((resolve) => {
          pendingRef.current.push(() => {
            requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
          });
          invalidate();
        }),
    };
    const w = window as unknown as { __HANGAR_3D_TEST_API__?: typeof api };
    w.__HANGAR_3D_TEST_API__ = api;
    return () => {
      delete w.__HANGAR_3D_TEST_API__;
    };
  }, [invalidate]);

  return null;
}

/**
 * Phase 3C — applies the selected wall/roof colour presets (materialPresets.ts) to the SAME
 * cached material instances `sharedMaterial` already hands out, rather than creating new ones:
 * mutating `.color` in place preserves the shared-instance identity the build-up opacity drivers
 * (`MaterialOpacityDriver`) depend on, costs zero new allocations, and needs no geometry rebuild.
 *
 * Deliberately its own tiny component rather than a `useEffect` inside `ThreeHangarView`'s own
 * body: mutating a material needs no Canvas context by itself, but making the change actually
 * VISIBLE under `frameloop="demand"` needs `invalidate()`, which only exists inside `<Canvas>`'s
 * own React tree — calling `useThree` from `ThreeHangarView`'s body (the component that RENDERS
 * Canvas, not a child of it) is exactly the mistake that threw "Hooks can only be used within
 * the Canvas component!" earlier this project (see SettlingSlab's own doc comment) — same fix
 * shape here, applied before repeating it.
 */
function MaterialColorSync({ wallColor, roofColor, wallSandwichColor = wallColor, roofSandwichColor = roofColor }: Readonly<{
  wallColor: string;
  roofColor: string;
  /** A sandwich panel's own colour (/angary, 10.10); the research screen's presets paint both systems alike */
  wallSandwichColor?: string;
  roofSandwichColor?: string;
}>) {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    // Phase 3F: both cladding-system variants set unconditionally, every time — only one of each
    // pair is ever actually rendered for a given `envelope.wallSystem`/`roofSystem` (see
    // MaterialKey's own doc comment), so there is no need to branch on which is active; setting
    // both keeps this in sync regardless, with no conditional logic to get out of step.
    sharedMaterial('wall-profiled').color.set(wallColor);
    sharedMaterial('wall-sandwich').color.set(wallSandwichColor);
    sharedMaterial('roof-profiled').color.set(roofColor);
    sharedMaterial('roof-sandwich').color.set(roofSandwichColor);
    invalidate();
  }, [wallColor, roofColor, wallSandwichColor, roofSandwichColor, invalidate]);
  return null;
}

export function ThreeHangarView({
  scene,
  shadows = true,
  maxDpr = 2,
  shadowMapSize = 1024,
  wallColor,
  roofColor,
  wallSandwichColor,
  roofSandwichColor,
  showScaleFigure = false,
  bottomInsetPx = 0,
  topInsetPx = 0,
}: Readonly<{
  scene: ThreeSceneModel;
  shadows?: boolean;
  maxDpr?: number;
  /** Phase 3F §14 — the fullscreen quality tier's second lever, alongside `maxDpr`: embedded mode
   *  keeps the pre-3F default (1024, the value already measured against the draw-call budget),
   *  fullscreen asks for a sharper `2048` — see `HangarPreviewModes.tsx`'s own call site and
   *  `ShadowMapResize` below for why a size change needs an explicit dispose to actually take
   *  effect on an already-rendered light. */
  shadowMapSize?: number;
  /** Phase 3C colour presets (materialPresets.ts) — RenderPresets only, not a geometric or
   *  domain fact (see that module's own architecture note). Default to the base palette's own
   *  colours (materials.ts) so an unset prop renders exactly as before Phase 3C. */
  /** Height of the overlay band along the canvas's bottom edge, measured by the readout that
   *  draws it. Framing only — see `FitOrthographicCamera`. */
  bottomInsetPx?: number;
  /** How far down the canvas the actions laid on it reach (10.10, /angary's sheet). Framing only, as `bottomInsetPx`. */
  topInsetPx?: number;
  wallColor?: string;
  roofColor?: string;
  /** A sandwich panel's own colours (/angary's sheet, 10.10); unset, the panel wears the profiled sheet's */
  wallSandwichColor?: string;
  roofSandwichColor?: string;
  /** Phase 3C optional scale reference — off by default (brief §6: "do not clutter the scene"). */
  showScaleFigure?: boolean;
}>) {
  const { visible, building } = scene;
  // the profiled sheet's ribs drawn a step apart that keeps them a texture at this building's size (envelopePanelGeometry)
  const ribPitchM = inkRibPitchM(Math.max(building.footprint.widthM, building.footprint.lengthM));
  const interiorPoint = useMemo(
    () =>
      new THREE.Vector3(
        building.footprint.widthM / 2,
        building.heights.eaveM / 2,
        building.footprint.lengthM / 2,
      ),
    [building],
  );
  // The slab's plane is the ground line and its material grows DOWN from it, so its interior reference sits below
  // grade. Memoised (10.10): built inline, it re-placed the slab — and now its outline — on every render.
  const slabInteriorPoint = useMemo(
    () => new THREE.Vector3(building.footprint.widthM / 2, -building.slab.thicknessM * 2, building.footprint.lengthM / 2),
    [building],
  );

  // Standing just outside the front face, centred on the first gate if one is configured
  // (the natural "someone walking up to the building" framing) — else centred on the front
  // facade. Never part of `scene.bounds` (computed upstream in threeSceneModel.ts from the
  // building's own geometry only), so this can never affect camera framing — same "staging, not
  // the object" rule the ground plane already follows.
  const scaleFigurePosition = useMemo<[number, number, number]>(() => {
    // Explicitly the first GATE, not the first opening: with a door present the door can be
    // opening 0, and a human figure scaled against a 1 m door instead of the 4 m gate reads wrong.
    const firstOpening = building.openings.find((o) => o.kind === 'gate') ?? building.openings[0];
    const x = firstOpening ? firstOpening.rect.xM + firstOpening.rect.widthM / 2 : building.footprint.widthM / 2;
    const FIGURE_STANDOFF_M = 1.4; // clear of the slab/gate recess, reads as standing in front of it
    return [x, 0, -FIGURE_STANDOFF_M];
  }, [building]);

  // The build-up lifecycle, reused verbatim from the SVG renderer (same hook, same timing table —
  // see the module doc). Seven layers, matching buildUpSequence.ts's BUILD_LAYER_ORDER exactly.
  //
  // Phase 3D: `visible.slab` OR `visible.footings` — never both, per deriveFoundationVisibility in
  // threeSceneModel.ts, but this ONE layer still has to track "is the foundation in scope at all",
  // the same question it always answered, regardless of which representation ends up rendering.
  // Keying it to `visible.slab` alone (as before Phase 3D, when that was the only representation)
  // silently stopped the whole foundation layer from ever mounting for isolated footings — caught
  // live, not hypothetical: footings simply never appeared under any camera angle before this fix.
  const foundation = useLayerLifecycle(visible.slab || visible.footings, LAYER_DURATION_MS.foundation, layerStartOffsetMs('foundation'));
  const columns = useLayerLifecycle(visible.frame, LAYER_DURATION_MS.columns, layerStartOffsetMs('columns'));
  const rafters = useLayerLifecycle(visible.frame, LAYER_DURATION_MS.rafters, layerStartOffsetMs('rafters'));
  const girts = useLayerLifecycle(visible.frame, LAYER_DURATION_MS.purlins, layerStartOffsetMs('purlins'));
  const walls = useLayerLifecycle(visible.walls, LAYER_DURATION_MS.walls, layerStartOffsetMs('walls'));
  const roof = useLayerLifecycle(visible.roof, LAYER_DURATION_MS.roof, layerStartOffsetMs('roof'));
  const gateLayer = useLayerLifecycle(visible.gates, LAYER_DURATION_MS.gates, layerStartOffsetMs('gates'));

  // Shadow-caster policy — a real budget decision, measured rather than assumed. Casting from
  // every mesh doubled the frame cost (175 draw calls at maximum dimensions against a 120 budget),
  // because each caster is drawn again in the shadow pass. Casting is therefore restricted to the
  // meshes that actually define the silhouette on the ground:
  //   • roof + gable ends always cast — together they ARE the building's outline;
  //   • side walls never cast — they sit directly under the eaves, so their shadow falls inside
  //     the roof's own and removing them changes nothing on screen;
  //   • the primary frame casts ONLY when there is no roof over it, which is both the cheap option
  //     and the physically honest one: an enclosed frame casts nothing outside the building. It is
  //     also the state where those shadows matter most, since ground shadows are doing much of the
  //     work of separating the portal frames in the frame-only view.
  const frameCastsShadow = shadows && roof.phase === 'hidden';
  const envelopeCastsShadow = shadows;

  // Phase 3E: the centre support column mounts on the SAME `columns` layer as the external ones —
  // one "columns arrive" moment, not a second one. The truss's bottom chord + webs mount on the
  // SAME `rafters` layer as the top chord (frame.leftRafter/rightRafter, role 'rafter') — a real
  // truss is erected as one assembled unit, not staggered chord-then-web, so it should arrive as
  // one visual moment too. Neither is a new BuildLayer (brief §14's own "prefer grouping over
  // exploding the FSM").
  const columnStruts = scene.struts.filter((s) => s.role === 'column' || s.role === 'internal-column');
  const rafterStruts = scene.struts.filter((s) => s.role === 'rafter' || s.role === 'truss-chord' || s.role === 'truss-web');
  // Phase 3E: wall bracing mounts on the SAME `girts` layer/phase — both are the same "secondary
  // steel, always present, not a user control" kind of thing (brief §11). So do the roof purlins
  // and the roof bracing (03.10, role `purlin` / `brace`).
  const girtStruts = scene.struts.filter((s) => s.role === 'girt' || s.role === 'purlin' || s.role === 'brace');
  // Phase 3F: matched against BOTH cladding-system variants — see MaterialKey's own doc comment
  // in threeSceneModel.ts for why `wall`/`roof` split into `-profiled`/`-sandwich`.
  // Memoised on the scene (10.10): the outlines (EnvelopeOutline) are computed from these, once per configuration
  const wallPanels = useMemo(() => scene.panels.filter((p) => p.material === 'wall-profiled' || p.material === 'wall-sandwich'), [scene]);
  const roofPanels = useMemo(() => scene.panels.filter((p) => p.material === 'roof-profiled' || p.material === 'roof-sandwich'), [scene]);

  return (
    <Canvas
      // No sizing class here: R3F puts inline `width/height: 100%` on its own wrapper div, which
      // wins over any stylesheet rule. The Canvas fills the sized `.hc-preview-canvas` element
      // that HangarPreviewModes provides instead.
      orthographic
      frameloop="demand"
      // 'percentage' (PCFShadowMap), not `true`: R3F's default asks for PCFSoftShadowMap, which three 0.185 deprecates
      // and quietly replaces with PCF anyway — with a console warning on every switch to 3D (03.10). Same shadows.
      shadows={shadows ? 'percentage' : false}
      dpr={[1, maxDpr]}
      // Transparent (10.10): the page's own field shows through — /angary's sheet, the research card, the expanded
      // view — so the 3D sits on the same dark field as the line drawings beside it, in both themes (materials.ts)
      gl={{ antialias: true, preserveDrawingBuffer: true, alpha: true }}
      // No tone mapping (10.10): ACES shifted the steel's hues and flattened the lid against the walls; with the light
      // tuned for it, the surfaces keep the values materials.ts gives them and the ink stays the drawings' own colours
      flat
      // The canvas is decorative: the controls and summary remain the canonical description of the
      // configuration, and HangarPreviewModes supplies the accessible text alternative.
      aria-hidden="true"
    >
      <FitOrthographicCamera scene={scene} bottomInsetPx={bottomInsetPx} topInsetPx={topInsetPx} />
      <InvalidateOnChange scene={scene} />
      <TestRenderSyncAPI />
      <SceneLighting scene={scene} shadows={shadows} shadowMapSize={shadowMapSize} />
      {/* Phase 3F: 'wall-profiled'/'roof-profiled' default colours are the same values the old
          bare 'wall'/'roof' keys used — both cladding-system variants of each share one default
          colour by design (materialPresets.ts's own DEFAULT_WALL_PRESET/DEFAULT_ROOF_PRESET). */}
      <MaterialColorSync
        wallColor={wallColor ?? MATERIALS['wall-profiled'].color}
        roofColor={roofColor ?? MATERIALS['roof-profiled'].color}
        wallSandwichColor={wallSandwichColor}
        roofSandwichColor={roofSandwichColor}
      />

      {/* Opacity drivers — one per material key that animates by fade rather than growth. Always
          mounted (cheap: no geometry, and useFrame only runs on already-invalidated frames — see
          useBuildProgress.ts), so a layer's fade starts the instant its phase changes without
          waiting for a remount. */}
      <MaterialOpacityDriver materialKey="slab" layer={foundation} />
      {/* Phase 3D.1: the isolated footing's pedestal now wears its own material (`footing`, item 6
          — see materials.ts) rather than reusing `slab`, so it needs its own driver on the SAME
          `foundation` layer to keep fading in lockstep with the pad beside it and the slab it
          alternates with — two drivers on one layer, not a second animation system. */}
      <MaterialOpacityDriver materialKey="footing" layer={foundation} />
      <MaterialOpacityDriver materialKey="frame-secondary" layer={girts} />
      <MaterialOpacityDriver materialKey="brace" layer={girts} />
      {/* Phase 3F: one driver per cladding-system variant — only one of each pair is ever actually
          rendered (see MaterialKey's own doc comment), but both need to stay in lockstep with
          `walls`/`roof`'s build-up phase regardless of which is active, same reasoning as
          MaterialColorSync setting colour on both unconditionally. */}
      <MaterialOpacityDriver materialKey="wall-profiled" layer={walls} />
      <MaterialOpacityDriver materialKey="wall-sandwich" layer={walls} />
      <MaterialOpacityDriver materialKey="roof-profiled" layer={roof} />
      <MaterialOpacityDriver materialKey="roof-sandwich" layer={roof} />
      <MaterialOpacityDriver materialKey="gate-recess" layer={gateLayer} />
      {/* Phase 3D.1: the gate leaf (item 4) wears its own `gate` material, sitting in front of
          `gate-recess` on the very same `gateLayer` — without this it would pop in at full opacity
          instead of fading in with the recess it sits in front of. */}
      <MaterialOpacityDriver materialKey="gate" layer={gateLayer} />
      {/* The door rides the same gate layer — both are openings in the same facade and arrive
          together in the build-up, so they must fade together too or the door pops in at full
          opacity over a still-materializing gate. */}
      <MaterialOpacityDriver materialKey="door" layer={gateLayer} />

      {/* The ground (10.10): the page's field itself, with shade drawn on it — the contact shade round the slab on every
          screen, and the key light's shadow where shadows are on (below). Phase 3F's lit floor, a #262a2e pool under the
          model, read as a grey stage on the sheet's field, a third tone the drawings do not have. */}
      <ContactShade building={building} yM={scene.ground.yM} />

      {/* Shadow catcher: invisible except where the building casts onto it — the key light's shadow on the field */}
      {shadows && (
        <mesh
          position={[building.footprint.widthM / 2, scene.ground.yM, building.footprint.lengthM / 2]}
          rotation={[-Math.PI / 2, 0, 0]}
          receiveShadow
        >
          <planeGeometry args={[scene.ground.sizeM, scene.ground.sizeM]} />
          <shadowMaterial opacity={0.5} />
        </mesh>
      )}

      {showScaleFigure && <ScaleFigure position={scaleFigurePosition} />}

      {/* `visible.slab` too (10.10): the slab and isolated footings are alternatives (deriveFoundationVisibility), but the
          slab mounted whenever the foundation did — isolated footings stood on a full slab as well */}
      {foundation.mounted && scene.visible.slab && scene.slab && (
        <SettlingSlab layer={foundation} thicknessM={building.slab.thicknessM}>
          <Panel
            panel={scene.slab}
            interiorPoint={slabInteriorPoint}
            thicknessDirection="inward"
            castShadow={false}
            ink={foundation}
          />
        </SettlingSlab>
      )}

      {/* Isolated footings — the slab's alternative, never both at once (scene.visible already
          resolves that mutual exclusion; see deriveFoundationVisibility in threeSceneModel.ts).
          Mounted on the SAME `foundation` layer as the slab above, so switching foundation type
          uses the identical build-up timing either representation would have used alone. */}
      {foundation.mounted && scene.visible.footings && scene.footings.map((footing) => (
        <Footing key={footing.id} footing={footing} castShadow={shadows} layer={foundation} />
      ))}

      {columns.mounted && columnStruts.map((strut) => (
        <AnimatedStrut key={strut.id} strut={strut} castShadow={frameCastsShadow} layer={columns} />
      ))}
      {rafters.mounted && rafterStruts.map((strut) => (
        <AnimatedStrut key={strut.id} strut={strut} castShadow={frameCastsShadow} layer={rafters} />
      ))}
      {girts.mounted && girtStruts.map((strut) => (
        <StaticStrut key={strut.id} strut={strut} castShadow={false} />
      ))}

      {walls.mounted && wallPanels.map((panel) => (
        <EnvelopePanel key={panel.id} panel={panel} interiorPoint={interiorPoint} castShadow={false} />
      ))}
      {walls.mounted && <EnvelopeOutline panels={wallPanels} interiorPoint={interiorPoint} layer={walls} surface="walls" roofShown={roof.mounted} ribPitchM={ribPitchM} />}
      {walls.mounted && scene.gables.map((gable) => (
        <Gable key={gable.id} gable={gable} castShadow={envelopeCastsShadow} layer={walls} roofShown={roof.mounted} ribPitchM={ribPitchM} />
      ))}

      {/* Gates mount off their OWN layer, not `walls` — matching the technical view's documented
          behaviour (a gate opening still reads even when the walls scope is off), and giving the
          gate reveal its own independently timed materialization per buildUpSequence.ts. */}
      {gateLayer.mounted && scene.recesses.map((recess) => (
        <Panel
          key={recess.id}
          panel={recess}
          interiorPoint={interiorPoint}
          thicknessDirection="inward"
          castShadow={false}
        />
      ))}
      {gateLayer.mounted && scene.leaves.map((leaf) => (
        <GateLeaf key={leaf.id} leaf={leaf} castShadow={envelopeCastsShadow} layer={gateLayer} />
      ))}

      {roof.mounted && roofPanels.map((panel) => (
        <EnvelopePanel key={panel.id} panel={panel} interiorPoint={interiorPoint} castShadow={envelopeCastsShadow} />
      ))}
      {roof.mounted && <EnvelopeOutline panels={roofPanels} interiorPoint={interiorPoint} layer={roof} surface="roof" ribPitchM={ribPitchM} />}
      {roof.mounted && <RidgeCap building={building} roofSystem={scene.envelope.roofSystem} cladding={scene.roofCladding} castShadow={envelopeCastsShadow} layer={roof} />}
    </Canvas>
  );
}

export default ThreeHangarView;
