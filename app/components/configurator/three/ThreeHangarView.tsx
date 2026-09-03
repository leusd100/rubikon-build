'use client';

import { useEffect, useMemo } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type {
  GableMesh,
  PanelMesh,
  StrutMesh,
  ThreeSceneModel,
} from '../../../lib/configurator/threeSceneModel';
import { MATERIALS, VIEWPORT_BG } from './materials';
import { FitOrthographicCamera } from './FitOrthographicCamera';

// Phase 3A production 3D view. Fixed camera, procedural geometry, no textures, no post-processing.
//
// Everything geometric here is read from ThreeSceneModel, which in turn copies
// ParametricBuildingModel. The only maths below turns a centre-line or a quad into a box transform
// — renderer mechanics, not building rules.

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

/** Shared material instances, one per key rather than one per mesh — same reasoning. */
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
 * A structural member drawn as a box along its own centre-line. Orientation comes from a
 * quaternion rotating the box's local +X onto the member direction — the general solution. The
 * earlier spike hand-computed rotated centre positions and produced a real, confirmed
 * mispositioning bug; this avoids that class entirely.
 */
function Strut({ strut, castShadow }: { strut: StrutMesh; castShadow: boolean }) {
  const matrix = useMemo(() => {
    const a = v(strut.a);
    const b = v(strut.b);
    const dir = new THREE.Vector3().subVectors(b, a);
    const len = dir.length() || 1e-6;
    const quaternion = new THREE.Quaternion().setFromUnitVectors(X_AXIS, dir.clone().normalize());
    const position = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5);
    const scale = new THREE.Vector3(len, strut.sectionM, strut.sectionM);
    return new THREE.Matrix4().compose(position, quaternion, scale);
  }, [strut]);

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
          which just made the whole building muddy. Starting the ramp at the camera distance means
          the near half is untouched and only the far end grades away. */}
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
  const frameCastsShadow = shadows && !visible.roof;
  const envelopeCastsShadow = shadows;

  const frameStruts = scene.struts.filter((s) => s.material === 'frame-primary');
  const secondaryStruts = scene.struts.filter((s) => s.material === 'frame-secondary');
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

      {visible.slab && scene.slab && (
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
      )}

      {visible.frame && frameStruts.map((strut) => (
        <Strut key={strut.id} strut={strut} castShadow={frameCastsShadow} />
      ))}
      {visible.frame && secondaryStruts.map((strut) => (
        <Strut key={strut.id} strut={strut} castShadow={false} />
      ))}

      {visible.walls && wallPanels.map((panel) => (
        <Panel key={panel.id} panel={panel} interiorPoint={interiorPoint} castShadow={false} />
      ))}
      {visible.walls && scene.gables.map((gable) => (
        <Gable key={gable.id} gable={gable} castShadow={envelopeCastsShadow} />
      ))}
      {visible.walls && scene.recesses.map((recess) => (
        <Panel
          key={recess.id}
          panel={recess}
          interiorPoint={interiorPoint}
          thicknessDirection="inward"
          castShadow={false}
        />
      ))}

      {visible.roof && roofPanels.map((panel) => (
        <Panel key={panel.id} panel={panel} interiorPoint={interiorPoint} castShadow={envelopeCastsShadow} />
      ))}
    </Canvas>
  );
}

export default ThreeHangarView;
