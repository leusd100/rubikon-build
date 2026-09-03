'use client';

import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';

const ISO_DIRECTION = new THREE.Vector3(1, 1, 1).normalize();
const ISO_ANGLE_RAD = Math.PI / 6; // 30° — the same true-isometric receding angle the SVG
                                    // renderer uses (isometricProjection.ts's ISO_ANGLE_RAD);
                                    // (1,1,1) camera direction + orthographic projection is what
                                    // produces this angle in 3D, not a coincidence.
const FIT_MARGIN = 0.8; // leave ~20% breathing room, same spirit as the SVG's VIEWBOX_PADDING

/**
 * A genuinely fixed camera — no orbit/pan/zoom controls, per the brief (§I of the architecture
 * recommendation: a configurator communicates proportions, it isn't a "spin the product" viewer).
 * Orthographic (parallel) projection along the true isometric direction, matching the SVG
 * renderer's visual register. No drei `<OrthographicCamera makeDefault>` needed — `<Canvas
 * orthographic>` (a core R3F prop) already makes the default camera orthographic; this component
 * only points it and fits the frustum to the object's actual projected size.
 */
export function FixedIsometricCamera({ widthM, lengthM, heightM }: { widthM: number; lengthM: number; heightM: number }) {
  const { camera, size } = useThree();

  useEffect(() => {
    const maxDim = Math.max(widthM, lengthM, heightM);
    const distance = maxDim * 4;
    camera.position.copy(ISO_DIRECTION).multiplyScalar(distance);
    camera.lookAt(0, heightM * 0.3, 0);

    if (camera instanceof THREE.OrthographicCamera) {
      // Fit the frustum to the object's *actual* isometric-projected footprint — analytically,
      // not a guessed fudge factor — the closest 3D equivalent to the SVG renderer's own
      // bounding-box-driven viewBox (isometricProjection.ts's `boundsOf`).
      const projectedWidth = (widthM + lengthM) * Math.cos(ISO_ANGLE_RAD);
      const projectedHeight = (widthM + lengthM) * Math.sin(ISO_ANGLE_RAD) + heightM;
      const zoomX = (size.width * FIT_MARGIN) / projectedWidth;
      const zoomY = (size.height * FIT_MARGIN) / projectedHeight;
      // react-hooks/immutability flags direct property writes on a hook-returned value on the
      // (correct, in general) assumption that React owns it — but `camera` here is a long-lived
      // three.js object R3F hands out specifically to be mutated imperatively; that's the
      // library's own documented pattern (there is no immutable "setZoom" — OrthographicCamera's
      // zoom/near/far are plain mutable properties by design), not something this component can
      // route through setState instead.
      // eslint-disable-next-line react-hooks/immutability -- three.js camera is mutated by design, see comment above
      camera.zoom = Math.min(zoomX, zoomY);
      camera.near = 0.1;
      camera.far = distance * 4;
      camera.updateProjectionMatrix();
    }
  }, [camera, size, widthM, lengthM, heightM]);

  return null;
}
