'use client';

import { Canvas } from '@react-three/fiber';
import type { SceneModel } from '../../lib/configurator/sceneModel';
import { FixedIsometricCamera } from './FixedIsometricCamera';

// Deliberately minimal materials — "stylized industrial", not photorealistic, per the
// architecture recommendation (§H): flat-ish colours + a couple of simple lights, no PBR
// textures, no environment maps. meshStandardMaterial is used only because it responds to
// lighting direction at all (meshBasicMaterial would look completely flat/unlit); roughness is
// pushed high and metalness low on purpose so it doesn't try to look like shiny CGI steel.
const CONCRETE_COLOR = '#8a8f89';
const STEEL_COLOR = '#5b6a78';
const TRUSS_COLOR = '#3f4c58';

const COLUMN_THICKNESS_M = 0.3;
const TRUSS_DEPTH_M = 0.35;
const TRUSS_THICKNESS_M = 0.3;
const FOUNDATION_THICKNESS_M = 0.3;

function Foundation({ widthM, lengthM }: { widthM: number; lengthM: number }) {
  return (
    <mesh position={[widthM / 2, -FOUNDATION_THICKNESS_M / 2, lengthM / 2]} receiveShadow>
      <boxGeometry args={[widthM, FOUNDATION_THICKNESS_M, lengthM]} />
      <meshStandardMaterial color={CONCRETE_COLOR} roughness={0.95} metalness={0.05} />
    </mesh>
  );
}

/** A column is a vertical member on one of the two visible walls the scene model describes —
 * the "front" wall (z=0) or the "side" wall (x=widthM) — the same two faces the SVG renderer
 * draws columns on, since both consume the same SceneModel primitives. */
function Column({ positionM, heightM, face, widthM }: { positionM: number; heightM: number; face: 'front' | 'side'; widthM: number }) {
  const position: [number, number, number] = face === 'front'
    ? [positionM, heightM / 2, 0]
    : [widthM, heightM / 2, positionM];
  return (
    <mesh position={position} castShadow>
      <boxGeometry args={[COLUMN_THICKNESS_M, heightM, COLUMN_THICKNESS_M]} />
      <meshStandardMaterial color={STEEL_COLOR} roughness={0.6} metalness={0.3} />
    </mesh>
  );
}

function Truss({ positionM, widthM, heightM }: { positionM: number; widthM: number; heightM: number }) {
  return (
    <mesh position={[widthM / 2, heightM, positionM]} castShadow>
      <boxGeometry args={[widthM, TRUSS_DEPTH_M, TRUSS_THICKNESS_M]} />
      <meshStandardMaterial color={TRUSS_COLOR} roughness={0.6} metalness={0.3} />
    </mesh>
  );
}

export function HangarSpikeScene({ scene }: { scene: SceneModel }) {
  const { widthM, lengthM, heightM } = scene.dimensions;

  const foundation = scene.primitives.find((p) => p.kind === 'foundation-slab');
  const columns = scene.primitives.filter((p) => p.kind === 'frame-column');
  const trusses = scene.primitives.filter((p) => p.kind === 'frame-truss');

  return (
    <Canvas
      className="r3f-spike-canvas"
      orthographic
      shadows
      dpr={[1, 2]}
    >
      <FixedIsometricCamera widthM={widthM} lengthM={lengthM} heightM={heightM} />
      <ambientLight intensity={0.7} />
      <directionalLight position={[widthM, heightM * 3, lengthM]} intensity={1.1} castShadow />
      <directionalLight position={[-widthM, heightM, -lengthM]} intensity={0.3} />

      {foundation?.visible && <Foundation widthM={widthM} lengthM={lengthM} />}
      {columns.map((column, index) => (
        <Column key={index} positionM={column.positionM} heightM={column.heightM} face={column.face} widthM={widthM} />
      ))}
      {trusses.map((truss, index) => (
        <Truss key={index} positionM={truss.positionM} widthM={truss.widthM} heightM={truss.heightM} />
      ))}
    </Canvas>
  );
}
