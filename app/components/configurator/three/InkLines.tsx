'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js';
import type { LayerTransitionStyle } from '../useLayerLifecycle';
import type { Segments } from './inkOutlines';
import { useBuildProgress } from './useBuildProgress';

/**
 * One set of ink lines on the 3D model (10.10) — see inkOutlines.ts for what is drawn and why.
 *
 * Screen-space lines (LineSegments2): a width in CSS pixels whatever the device pixel ratio and the building's size.
 * WebGL's own lines are one DEVICE pixel wide — half a CSS pixel on a phone or a Retina screen, which read as a hairline
 * on a 24 m hangar and vanished on a 120 m one — and a ribbon in world units would thin out as the building grows and
 * the camera pulls back. One instanced draw call per set, whatever its segment count.
 *
 * Fades with its layer's build-up, as the surface it outlines does (MaterialOpacityDriver): the same layer, the same
 * progress hook, its own material — so a wall's outline arrives with the wall and leaves with it.
 *
 * Lifted toward the camera by INK_LIFT_PX of depth: the ink lies ON the surface it outlines, and a wide line's outer
 * half lies over the surface where it recedes or comes forward — tied in depth, the surface won half the pixels and the
 * line broke into dashes. The camera is orthographic, so a move along its own axis changes depth only, never where the
 * line falls on screen. Pushing the surfaces back instead (polygonOffset) was tried first and is worse: its slope term
 * on a grazing roof slope pushed the roof behind the rafters and the columns behind the walls, and every bay showed
 * through as a dark line. The lift is in pixels of the current framing, so it is the same on a phone and on a 4K
 * screen, for a 12 m hangar and a 120 m one; edges hidden by less than it are not drawn (EnvelopeOutline, Gable).
 */
const INK_LIFT_PX = 2.5;
const INK_RENDER_ORDER = 10;

/** The pen grows a little with the picture: widths are set for the sheet's ~300–580 px field, and in the expanded view
 *  (900 px and more) the same 1.25 px read as a hairline round a building three times the size. Up to 1.6×, from 480 px. */
function penScale(heightPx: number): number {
  return Math.min(1.6, Math.max(1, heightPx / 480));
}

export function InkLines({
  segments,
  color,
  widthPx,
  opacity = 1,
  layer,
}: {
  segments: Segments;
  color: string;
  widthPx: number;
  /** The ink's own strength once settled: a quieter line (a gate's sections) is the same ink at less opacity */
  opacity?: number;
  layer: LayerTransitionStyle;
}) {
  const size = useThree((s) => s.size);
  const invalidate = useThree((s) => s.invalidate);
  const geometry = useMemo(() => {
    const g = new LineSegmentsGeometry();
    g.setPositions(segments);
    return g;
  }, [segments]);
  useEffect(() => () => geometry.dispose(), [geometry]);

  // Always transparent: the ink is laid over the surfaces, and fades with them
  const material = useMemo(
    () => new LineMaterial({ color, linewidth: widthPx, transparent: true, opacity, depthWrite: false }),
    [color, widthPx, opacity],
  );
  useEffect(() => () => material.dispose(), [material]);
  // The width is in the resolution's pixels: the canvas's CSS size, not its drawing buffer's
  useEffect(() => {
    material.resolution.set(size.width, size.height);
    material.setValues({ linewidth: widthPx * penScale(size.height) });
    invalidate();
  }, [material, size, widthPx, invalidate]);

  // Drawn after every surface: while a layer fades its surfaces turn transparent and join the lines in the transparent
  // pass, sorted by distance — a fading wall nearer the camera than its outline's centre was painted over it, and the
  // outline left a beat before the wall did
  const line = useMemo(() => {
    const object = new LineSegments2(geometry, material);
    object.renderOrder = INK_RENDER_ORDER;
    return object;
  }, [geometry, material]);

  // Driven through the mounted object's ref, as the struts' matrices are (AnimatedStrut): per-frame writes to a three.js
  // object, not to React state
  const lineRef = useRef<LineSegments2>(null);
  const progressRef = useBuildProgress(layer);
  useFrame((state) => {
    const mounted = lineRef.current;
    if (!mounted) return;
    mounted.material.opacity = opacity * progressRef.current;
    const camera = state.camera;
    if (camera instanceof THREE.OrthographicCamera) {
      const worldPerPx = (camera.top - camera.bottom) / camera.zoom / Math.max(state.size.height, 1);
      camera.getWorldDirection(mounted.position).multiplyScalar(-INK_LIFT_PX * worldPerPx);
    }
  });

  return <primitive ref={lineRef} object={line} />;
}
