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

/**
 * Fraction of the USABLE frame the building's projected extent should fill.
 *
 * Raised from 0.74 after a live review of fullscreen: at 0.74 the building filled 74% of the
 * frame's width and, because an isometric hangar is a roughly 2.2:1 shape inside a ~1.4:1 canvas,
 * only about half its height — a lot of empty scene around a small object. The remaining 10% is
 * genuine breathing room, not slack; a drawing that touches its own frame reads as cropped.
 */
const FIT_MARGIN = 0.9;

/**
 * Elevation and azimuth are NOT defined here. They come from viewProjection.ts, which the SVG
 * technical view projects through as well — one camera, two renderers. Defining them twice is
 * exactly how the two views ended up subtly mirrored against each other along the width axis.
 */
function cameraDirection(): THREE.Vector3 {
  const d = sharedCameraDirection();
  return new THREE.Vector3(d.x, d.y, d.z).normalize();
}

export function FitOrthographicCamera({
  scene,
  bottomInsetPx = 0,
}: {
  scene: ThreeSceneModel;
  /** Height of the overlay band along the canvas's bottom edge (the dimension readout and its
   *  toggle). The building is framed in what is left ABOVE it rather than centred on the whole
   *  canvas and drawn behind it — reported live, where the model's near corner sat under the
   *  readout. Zero when nothing covers the edge, which puts the framing back to plain centring. */
  bottomInsetPx?: number;
}) {
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

    // Fit against the USABLE band — the canvas minus whatever covers its bottom edge — then grow
    // the frustum back to cover the whole canvas, so the building is sized for the space it can
    // actually occupy while the camera still renders edge to edge.
    const usableHeightPx = Math.max(size.height - bottomInsetPx, 1);
    const usableAspect = size.width / usableHeightPx;
    const halfUsable = Math.max(projectedH / 2, projectedW / 2 / usableAspect) / FIT_MARGIN;
    const halfH = halfUsable * (size.height / usableHeightPx);
    const halfW = halfH * aspect;

    // ...and slide the frustum DOWN by half the inset, which lifts the building by the same amount
    // on screen, centring it in the usable band. Sign is easy to get backwards: the object sits at
    // camera-space y = 0, so lowering the window's centre raises where the object lands in frame.
    const shiftY = (bottomInsetPx / 2) * ((2 * halfH) / size.height);

    /* eslint-disable react-hooks/immutability -- three.js cameras are mutated imperatively by
       design; there is no immutable setter for frustum bounds. R3F hands this object out
       specifically to be driven this way. */
    camera.left = -halfW;
    camera.right = halfW;
    camera.top = halfH - shiftY;
    camera.bottom = -halfH - shiftY;
    camera.near = 0.01;
    camera.far = distance * 4;
    /* eslint-enable react-hooks/immutability */
    camera.updateProjectionMatrix();

    // frameloop="demand" means nothing renders unless we ask, including after a reframe.
    invalidate();
  }, [camera, size, invalidate, min, max, center, extent, bottomInsetPx]);

  return null;
}
