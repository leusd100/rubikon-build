'use client';

import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type {
  GableMesh,
  MaterialKey,
  PanelMesh,
  StrutMesh,
  ThreeSceneModel,
} from '../../../lib/configurator/threeSceneModel';
import { LAYER_DURATION_MS, layerStartOffsetMs } from '../../../lib/configurator/buildUpSequence';
import { MATERIALS, VIEWPORT_BG } from './materials';
import { FitOrthographicCamera } from './FitOrthographicCamera';
import { useLayerLifecycle, type LayerTransitionStyle } from '../useLayerLifecycle';
import { useBuildProgress } from './useBuildProgress';
import { initialProgressForFreshMount } from './buildUpAnimation';

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
  MATERIAL_CACHE.set(key, material);
  return material;
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
function MaterialOpacityDriver({ materialKey, layer }: { materialKey: MaterialKey; layer: LayerTransitionStyle }) {
  const progressRef = useBuildProgress(layer);
  useFrame(() => {
    const material = sharedMaterial(materialKey);
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
function StaticStrut({ strut, castShadow }: { strut: StrutMesh; castShadow: boolean }) {
  const matrix = useMemo(() => grownMatrix(v(strut.a), v(strut.b), strut.sectionM, 1), [strut]);
  return (
    <mesh
      geometry={UNIT_BOX}
      material={sharedMaterial(strut.material)}
      matrix={matrix}
      matrixAutoUpdate={false}
      castShadow={castShadow}
      receiveShadow
    />
  );
}

/** Columns and rafters: the brief's "grow from base" / "materialize along the rafter axis"
 *  vocabulary (§23). `layer` is required (unlike the old single `Strut`) precisely so a girt can
 *  never accidentally pay for this component's `useFrame` subscription — see StaticStrut above. */
function AnimatedStrut({
  strut,
  castShadow,
  layer,
}: {
  strut: StrutMesh;
  castShadow: boolean;
  layer: LayerTransitionStyle;
}) {
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
function Panel({
  panel,
  interiorPoint,
  castShadow,
  thicknessDirection = 'outward',
}: {
  panel: PanelMesh;
  interiorPoint: THREE.Vector3;
  castShadow: boolean;
  thicknessDirection?: 'inward' | 'outward';
}) {
  const matrix = useMemo(() => {
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
  }, [panel, interiorPoint, thicknessDirection]);

  return (
    <mesh
      geometry={UNIT_BOX}
      material={sharedMaterial(panel.material)}
      matrix={matrix}
      matrixAutoUpdate={false}
      castShadow={castShadow}
      receiveShadow
    />
  );
}

/** A gable end extruded from its real pentagon, with gate openings as actual holes in the mesh
 *  rather than dark rectangles painted on top. */
function Gable({ gable, castShadow }: { gable: GableMesh; castShadow: boolean }) {
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

  return (
    <mesh
      geometry={geometry}
      material={sharedMaterial(gable.material)}
      position={[0, 0, gable.zM]}
      castShadow={castShadow}
      receiveShadow
    />
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
}: {
  children: React.ReactNode;
  layer: LayerTransitionStyle;
  thicknessM: number;
}) {
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
 * Lighting: ambient + hemisphere fill + one directional key + a weak opposing fill, plus linear
 * fog. Simple on purpose (no HDRI, no bloom, no post-processing stack).
 *
 * The fog is doing real work rather than being atmosphere: it grades contrast with depth, so the
 * near portal frames separate from the far ones. That was the cheapest available fix for the
 * frame-only readability the earlier spike lost to SVG, and it costs one line instead of an
 * outline post-processing pass.
 */
function SceneLighting({ scene, shadows }: { scene: ThreeSceneModel; shadows: boolean }) {
  const { center, size: extent } = scene.bounds;
  const radius = Math.max(Math.hypot(extent.x, extent.y, extent.z), 1);
  const { ridgeM } = scene.building.heights;
  const { widthM, lengthM } = scene.building.footprint;

  // A directional light aims at its `target`, which defaults to the world origin — and this
  // building's origin is its front-left-bottom CORNER, not its centre. Left at the default the key
  // light rakes across the object at an odd angle and the shadow camera is centred on the corner
  // too. This target sits at the model's real centroid.
  const target = useMemo(() => new THREE.Object3D(), []);

  const keyPosition = useMemo<[number, number, number]>(
    // Tuned on screen against two failure modes, not guessed. Too low (an early ridge-relative
    // height) threw a long raking shadow that read as a smear across the ground; too high
    // (radius * 1.35) put the light almost overhead so the shadow fell directly under the building
    // and was hidden by it, leaving the object apparently floating. This sits between them: the
    // shadow stays attached to the footprint but a visible sliver falls clear of it. Height is
    // driven by the object's own radius, so the angle holds for a 10m hangar and a 120m one alike.
    () => [center.x + widthM * 0.7, center.y + radius * 0.8, center.z - lengthM * 0.45],
    [center, widthM, radius, lengthM],
  );

  return (
    <>
      <color attach="background" args={[VIEWPORT_BG]} />
      {/* Depth-graded contrast, doing real work rather than atmosphere: it separates the near
          portal frames from the far ones, which is the cheapest available fix for the frame-only
          readability the earlier spike lost to SVG — one line instead of an outline post-processing
          pass. Deliberately restrained: an earlier range fogged the object's own centre by ~43%,
          which just made everything muddy. Starting the ramp at the camera distance means the near
          half is untouched and only the far end grades away. */}
      <fog attach="fog" args={[VIEWPORT_BG, radius * 2, radius * 3.8]} />

      <ambientLight intensity={0.78} />
      <hemisphereLight args={['#ccd6dc', '#22252a', 0.7]} />

      <primitive object={target} position={[center.x, center.y, center.z]} />
      <directionalLight
        position={keyPosition}
        target={target}
        intensity={1.85}
        castShadow={shadows}
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-radius * 0.75}
        shadow-camera-right={radius * 0.75}
        shadow-camera-top={radius * 0.75}
        shadow-camera-bottom={-radius * 0.75}
        shadow-camera-near={0.1}
        shadow-camera-far={radius * 6}
        shadow-bias={-0.0006}
        shadow-normalBias={0.02}
      />
      {/* Weak opposing fill so the faces turned away from the key light keep their material value
          instead of going to black — the difference between "an object in space" and "a silhouette". */}
      <directionalLight
        position={[center.x - widthM * 1.2, center.y + ridgeM * 0.9, center.z + lengthM * 1.1]}
        target={target}
        intensity={0.42}
      />
    </>
  );
}

/** frameloop="demand" renders nothing until asked. Any change to the model must therefore
 *  explicitly request a frame, or the canvas would keep showing the previous configuration. */
function InvalidateOnChange({ scene }: { scene: ThreeSceneModel }) {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    invalidate();
  }, [scene, invalidate]);
  return null;
}

export function ThreeHangarView({
  scene,
  shadows = true,
  maxDpr = 2,
}: {
  scene: ThreeSceneModel;
  shadows?: boolean;
  maxDpr?: number;
}) {
  const { visible, building } = scene;
  const interiorPoint = useMemo(
    () =>
      new THREE.Vector3(
        building.footprint.widthM / 2,
        building.heights.eaveM / 2,
        building.footprint.lengthM / 2,
      ),
    [building],
  );

  // The build-up lifecycle, reused verbatim from the SVG renderer (same hook, same timing table —
  // see the module doc). Seven layers, matching buildUpSequence.ts's BUILD_LAYER_ORDER exactly.
  const foundation = useLayerLifecycle(visible.slab, LAYER_DURATION_MS.foundation, layerStartOffsetMs('foundation'));
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

  const columnStruts = scene.struts.filter((s) => s.role === 'column');
  const rafterStruts = scene.struts.filter((s) => s.role === 'rafter');
  const girtStruts = scene.struts.filter((s) => s.role === 'girt');
  const wallPanels = scene.panels.filter((p) => p.material === 'wall');
  const roofPanels = scene.panels.filter((p) => p.material === 'roof');

  return (
    <Canvas
      // No sizing class here: R3F puts inline `width/height: 100%` on its own wrapper div, which
      // wins over any stylesheet rule. The Canvas fills the sized `.hc-preview-canvas` element
      // that HangarPreviewModes provides instead.
      orthographic
      frameloop="demand"
      shadows={shadows}
      dpr={[1, maxDpr]}
      gl={{ antialias: true, preserveDrawingBuffer: true }}
      // The canvas is decorative: the controls and summary remain the canonical description of the
      // configuration, and HangarPreviewModes supplies the accessible text alternative.
      aria-hidden="true"
    >
      <FitOrthographicCamera scene={scene} />
      <InvalidateOnChange scene={scene} />
      <SceneLighting scene={scene} shadows={shadows} />

      {/* Opacity drivers — one per material key that animates by fade rather than growth. Always
          mounted (cheap: no geometry, and useFrame only runs on already-invalidated frames — see
          useBuildProgress.ts), so a layer's fade starts the instant its phase changes without
          waiting for a remount. */}
      <MaterialOpacityDriver materialKey="slab" layer={foundation} />
      <MaterialOpacityDriver materialKey="frame-secondary" layer={girts} />
      <MaterialOpacityDriver materialKey="wall" layer={walls} />
      <MaterialOpacityDriver materialKey="roof" layer={roof} />
      <MaterialOpacityDriver materialKey="gate-recess" layer={gateLayer} />

      {/* Shadow catcher, not a floor. `shadowMaterial` is invisible except where something casts
          onto it, which is exactly what this needs: the building has to read as an object standing
          on a surface, but an actual shaded ground plane fills the canvas edge to edge and turns
          the preview into a framed picture sitting inside its own container (confirmed on screen —
          a lit plane large enough not to show its own edge necessarily covers the whole frame).
          This gives the contact shadow and nothing else, so the viewport stays continuous with the
          surrounding surface. Skipped entirely when shadows are off (mobile), where there would be
          nothing for it to show. */}
      {shadows && (
        <mesh
          position={[building.footprint.widthM / 2, scene.ground.yM, building.footprint.lengthM / 2]}
          rotation={[-Math.PI / 2, 0, 0]}
          receiveShadow
        >
          <planeGeometry args={[scene.ground.sizeM, scene.ground.sizeM]} />
          <shadowMaterial opacity={0.46} />
        </mesh>
      )}

      {foundation.mounted && scene.slab && (
        <SettlingSlab layer={foundation} thicknessM={building.slab.thicknessM}>
          <Panel
            panel={scene.slab}
            // The slab's plane is the ground line and its material grows DOWN from it, so the
            // interior reference sits below grade.
            interiorPoint={new THREE.Vector3(
              building.footprint.widthM / 2,
              -building.slab.thicknessM * 2,
              building.footprint.lengthM / 2,
            )}
            thicknessDirection="inward"
            castShadow={false}
          />
        </SettlingSlab>
      )}

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
        <Panel key={panel.id} panel={panel} interiorPoint={interiorPoint} castShadow={false} />
      ))}
      {walls.mounted && scene.gables.map((gable) => (
        <Gable key={gable.id} gable={gable} castShadow={envelopeCastsShadow} />
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

      {roof.mounted && roofPanels.map((panel) => (
        <Panel key={panel.id} panel={panel} interiorPoint={interiorPoint} castShadow={envelopeCastsShadow} />
      ))}
    </Canvas>
  );
}

export default ThreeHangarView;
