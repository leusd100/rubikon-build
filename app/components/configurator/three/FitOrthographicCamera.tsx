'use client';

import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { ThreeSceneModel } from '../../../lib/configurator/threeSceneModel';
import { cameraDirection as sharedCameraDirection } from '../../../lib/configurator/viewProjection';

// Fixed architectural camera. No orbit, no pan, no zoom, no auto-rotate — Phase 3A is explicit
// about that, and a configurator's job is to communicate proportions, not to be spun.
//
// Orthographic, matching the technical view's register: parallel projection keeps equal metres
// equal on screen, which is what makes the two views read as the same object rather than as a
// drawing and a photograph.

/** Fraction of the canvas the building's projected extent should fill. */
const FIT_MARGIN = 0.86;

/**
 * Elevation and azimuth are NOT defined here. They come from viewProjection.ts, which the SVG
 * technical view projects through as well — one camera, two renderers. Defining them twice is
 * exactly how the two views ended up subtly mirrored against each other along the width axis.
 */
function cameraDirection(): THREE.Vector3 {
  const d = sharedCameraDirection();
  return new THREE.Vector3(d.x, d.y, d.z).normalize();
}

export function FitOrthographicCamera({ scene }: { scene: ThreeSceneModel }) {
  const { camera, size, invalidate } = useThree();
  const { min, max, center, size: extent } = scene.bounds;

  useEffect(() => {
    if (!(camera instanceof THREE.OrthographicCamera)) return;

    const radius = Math.hypot(extent.x, extent.y, extent.z);
    const distance = Math.max(radius * 2, 1);
    const dir = cameraDirection();

    camera.position.set(
      center.x + dir.x * distance,
      center.y + dir.y * distance,
      center.z + dir.z * distance,
    );
    camera.up.set(0, 1, 0);
    camera.lookAt(center.x, center.y, center.z);
    camera.updateMatrixWorld();

    // Fit the frustum to the building's ACTUAL projected extent by transforming its eight bounding
    // corners into camera space, rather than guessing from width+length. This is what keeps a
    // 10×10×4 hangar and a 60×120×15 one both framed correctly, including the long/narrow and
    // wide/short aspect ratios the brief calls out — no per-size fudge factor.
    const view = new THREE.Matrix4().copy(camera.matrixWorldInverse);
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const x of [min.x, max.x]) {
      for (const y of [min.y, max.y]) {
        for (const z of [min.z, max.z]) {
          const p = new THREE.Vector3(x, y, z).applyMatrix4(view);
          minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
          minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
        }
      }
    }

    const projectedW = Math.max(maxX - minX, 1e-6);
    const projectedH = Math.max(maxY - minY, 1e-6);
    const aspect = size.width / size.height;

    // Half-extents in world units, chosen so BOTH axes fit, then expressed through the camera's
    // own aspect so the object never stretches.
    const halfH = Math.max(projectedH / 2, projectedW / 2 / aspect) / FIT_MARGIN;
    const halfW = halfH * aspect;

    /* eslint-disable react-hooks/immutability -- three.js cameras are mutated imperatively by
       design; there is no immutable setter for frustum bounds. R3F hands this object out
       specifically to be driven this way. */
    camera.left = -halfW;
    camera.right = halfW;
    camera.top = halfH;
    camera.bottom = -halfH;
    camera.near = 0.01;
    camera.far = distance * 4;
    /* eslint-enable react-hooks/immutability */
    camera.updateProjectionMatrix();

    // frameloop="demand" means nothing renders unless we ask, including after a reframe.
    invalidate();
  }, [camera, size, invalidate, min, max, center, extent]);

  return null;
}
