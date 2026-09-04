'use client';

import { useEffect, useMemo } from 'react';
import * as THREE from 'three';

// Phase 3C — an optional, purely decorative human scale figure. Answers a real comprehension gap
// ("is 8m tall a lot?") the same way an architectural render's own scale figure does — NOT an
// authored asset: per the brief's §32/§6, no GLTF for anything touching the configurable model,
// and a decorative scale prop is exactly the case that rule exists to keep separate. Built from
// two primitives (three.js's own CapsuleGeometry + SphereGeometry), so there is no licensing
// question, no asset download, and no risk of it ever being mistaken for authored building
// geometry. Never contributes to camera framing bounds (see ThreeHangarView's call site) — same
// "staging, not the object" principle already applied to the ground plane and, in the technical
// view, to the terrain.
//
// Deliberately NOT wired into the build-up lifecycle: it is not a layer of the CONFIGURED
// building (foundation/frame/walls/roof/gates all describe what the customer is ordering; this
// describes nothing about their building at all), so it has no FSM phase of its own — its own
// toggle shows or hides it immediately, independent of scope.

const FIGURE_HEIGHT_M = 1.75; // an average adult standing height — the whole point is a familiar reference
const FIGURE_HEAD_RADIUS_M = 0.11;
const FIGURE_BODY_RADIUS_M = 0.16;
const FIGURE_MATERIAL_COLOR = '#2b2f33'; // dark, quiet silhouette — reads as "a person", never competes with the building's own lighter value-ladder (materials.ts)

export function ScaleFigure({ position }: { position: [number, number, number] }) {
  const bodyLength = FIGURE_HEIGHT_M - FIGURE_HEAD_RADIUS_M * 2 - FIGURE_BODY_RADIUS_M * 2;
  const material = useMemo(
    () => new THREE.MeshStandardMaterial({ color: FIGURE_MATERIAL_COLOR, roughness: 0.9, metalness: 0.02 }),
    [],
  );
  useEffect(() => () => material.dispose(), [material]);

  const bodyCenterY = FIGURE_BODY_RADIUS_M + bodyLength / 2;
  const headCenterY = FIGURE_HEIGHT_M - FIGURE_HEAD_RADIUS_M;

  return (
    <group position={position} aria-hidden="true">
      <mesh position={[0, bodyCenterY, 0]} material={material} castShadow receiveShadow>
        <capsuleGeometry args={[FIGURE_BODY_RADIUS_M, bodyLength, 4, 12]} />
      </mesh>
      <mesh position={[0, headCenterY, 0]} material={material} castShadow receiveShadow>
        <sphereGeometry args={[FIGURE_HEAD_RADIUS_M, 16, 12]} />
      </mesh>
    </group>
  );
}

export default ScaleFigure;
