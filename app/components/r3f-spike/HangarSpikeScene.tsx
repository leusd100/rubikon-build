'use client';

import { useMemo } from 'react';
import * as THREE from 'three';
import { Canvas } from '@react-three/fiber';
import type { Member, ParametricBuildingModel } from '../../lib/configurator/parametricModel';
import { FixedIsometricCamera } from './FixedIsometricCamera';

// Dev-only renderer spike. NOT production 3D — there is no route toggle, no lazy loading and no
// material system here, and Phase 3-0 deliberately did not add any.
//
// What changed in Phase 3-0: this spike used to read scene primitives and invent its own gable,
// which is exactly how it ended up drawing a different building from the technical view. It now
// consumes ParametricBuildingModel — the same geometry the SVG consumes — so the two renderers
// are provably showing the same object. That makes it a live demonstration of the cross-renderer
// contract rather than a second, competing source of shape.

const CONCRETE_COLOR = '#8a8f89';
const STEEL_COLOR = '#5b6a78';
const RAFTER_COLOR = '#46525e';

const COLUMN_SECTION_M = 0.3;
const RAFTER_SECTION_M = 0.28;
const GIRT_SECTION_M = 0.12;
const FOUNDATION_THICKNESS_M = 0.3;

const X_AXIS = new THREE.Vector3(1, 0, 0);

/**
 * One structural member drawn as a box along its own centre-line. Orientation comes from a
 * quaternion that rotates the box's local +X onto the member direction — the general solution,
 * rather than per-member hand-computed rotations, which is the arithmetic that produced a real
 * mispositioning bug in the earlier spike.
 */
function Strut({ member, section, color }: { member: Member; section: number; color: string }) {
  const { position, quaternion, length } = useMemo(() => {
    const a = new THREE.Vector3(member.a.x, member.a.y, member.a.z);
    const b = new THREE.Vector3(member.b.x, member.b.y, member.b.z);
    const dir = new THREE.Vector3().subVectors(b, a);
    const len = dir.length();
    const q = new THREE.Quaternion().setFromUnitVectors(X_AXIS, dir.clone().normalize());
    return { position: new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5), quaternion: q, length: len };
  }, [member]);

  return (
    <mesh position={position} quaternion={quaternion} castShadow>
      <boxGeometry args={[length, section, section]} />
      <meshStandardMaterial color={color} roughness={0.6} metalness={0.3} />
    </mesh>
  );
}

export function HangarSpikeScene({
  building,
  showFoundation,
  showFrame,
}: {
  building: ParametricBuildingModel;
  showFoundation: boolean;
  showFrame: boolean;
}) {
  const { widthM, lengthM } = building.footprint;
  const { eaveM, ridgeM } = building.heights;

  return (
    <Canvas className="r3f-spike-canvas" orthographic shadows dpr={[1, 2]}>
      <FixedIsometricCamera widthM={widthM} lengthM={lengthM} heightM={ridgeM} />
      <ambientLight intensity={0.7} />
      <directionalLight position={[widthM, ridgeM * 3, lengthM]} intensity={1.1} castShadow />
      <directionalLight position={[-widthM, eaveM, -lengthM]} intensity={0.3} />

      {showFoundation && (
        <mesh
          position={[widthM / 2, -FOUNDATION_THICKNESS_M / 2, lengthM / 2]}
          receiveShadow
        >
          <boxGeometry args={[building.slab.widthM, FOUNDATION_THICKNESS_M, building.slab.lengthM]} />
          <meshStandardMaterial color={CONCRETE_COLOR} roughness={0.95} metalness={0.05} />
        </mesh>
      )}

      {showFrame && building.frames.map((frame) => (
        <group key={frame.index}>
          <Strut member={frame.leftColumn} section={COLUMN_SECTION_M} color={STEEL_COLOR} />
          <Strut member={frame.rightColumn} section={COLUMN_SECTION_M} color={STEEL_COLOR} />
          <Strut member={frame.leftRafter} section={RAFTER_SECTION_M} color={RAFTER_COLOR} />
          <Strut member={frame.rightRafter} section={RAFTER_SECTION_M} color={RAFTER_COLOR} />
        </group>
      ))}

      {showFrame && building.girts.map((girt, index) => (
        <Strut key={index} member={girt} section={GIRT_SECTION_M} color={RAFTER_COLOR} />
      ))}
    </Canvas>
  );
}
