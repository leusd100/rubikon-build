import * as THREE from 'three';

// The 3D view's ink (10.10, owner: «картинка повністю зливається»): the outlines that let the walls, the roof, the
// gables, the gates and the slab read as separate parts on /angary's dark sheet, in the language of the site's line
// drawings — light ink on the dark field, copper for what is opened. Pure geometry here, no React: every function takes
// the SAME placement (matrix, outline points) the mesh it outlines is drawn with, so a line can never drift off its
// surface, and returns flat segment lists in LineSegmentsGeometry.setPositions' own format.
//
// Lines, not a post-processing outline pass: an edge-detection pass (normals/depth) costs a full-screen pass on every
// frame and outlines every rib of a profiled sheet as well — what the owner asked for is the opposite, the parts'
// boundaries drawn and the sheet's ribs left quieter than them.

/** [ax, ay, az, bx, by, bz, …] — two points per segment */
export type Segments = number[];

const UNIT_BOX_CORNERS: Array<[number, number, number]> = [
  [-0.5, -0.5, -0.5], [0.5, -0.5, -0.5], [0.5, 0.5, -0.5], [-0.5, 0.5, -0.5],
  [-0.5, -0.5, 0.5], [0.5, -0.5, 0.5], [0.5, 0.5, 0.5], [-0.5, 0.5, 0.5],
];
const BOX_EDGES: Array<[number, number]> = [
  [0, 1], [1, 2], [2, 3], [3, 0],
  [4, 5], [5, 6], [6, 7], [7, 4],
  [0, 4], [1, 5], [2, 6], [3, 7],
];

/** The twelve edges of the unit box the slab, the footings and the plain panels are drawn with, placed by its matrix */
export function boxEdges(matrix: THREE.Matrix4, out: Segments = []): Segments {
  const corners = UNIT_BOX_CORNERS.map(([x, y, z]) => new THREE.Vector3(x, y, z).applyMatrix4(matrix));
  for (const [a, b] of BOX_EDGES) out.push(corners[a].x, corners[a].y, corners[a].z, corners[b].x, corners[b].y, corners[b].z);
  return out;
}

/** The four edges of a panel's outer face: the local rectangle [0, width] × [0, height] at z = 0, placed by its matrix */
export function faceRectangle(matrix: THREE.Matrix4, widthM: number, heightM: number): Array<[THREE.Vector3, THREE.Vector3]> {
  const p = [
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(widthM, 0, 0),
    new THREE.Vector3(widthM, heightM, 0),
    new THREE.Vector3(0, heightM, 0),
  ].map((point) => point.applyMatrix4(matrix));
  return [[p[0], p[1]], [p[1], p[2]], [p[2], p[3]], [p[3], p[0]]];
}

const pointKey = (p: THREE.Vector3) => `${Math.round(p.x * 1000)},${Math.round(p.y * 1000)},${Math.round(p.z * 1000)}`;

/**
 * One surface's outline from its bays' face rectangles: an edge two bays share is a joint inside the surface, not its
 * boundary, so it goes — a wall reads as one wall, not as ten panels (the bays' joints would draw the frame's columns
 * on the cladding a second time, and the drawing's general view has no such lines). Matched by both ends to the
 * millimetre: neighbouring bays are placed from the same model corners, so their shared edge lands on the same points.
 */
export function surfaceOutline(edges: Array<[THREE.Vector3, THREE.Vector3]>): Array<[THREE.Vector3, THREE.Vector3]> {
  const seen = new Map<string, { a: THREE.Vector3; b: THREE.Vector3; count: number }>();
  for (const [a, b] of edges) {
    const ka = pointKey(a);
    const kb = pointKey(b);
    const key = ka < kb ? `${ka}|${kb}` : `${kb}|${ka}`;
    const entry = seen.get(key);
    if (entry) entry.count += 1;
    else seen.set(key, { a, b, count: 1 });
  }
  return [...seen.values()].filter((entry) => entry.count === 1).map(({ a, b }) => [a, b]);
}

/** Which side of its surface an outline edge is on: the level edges at its top and bottom (a wall's head and foot, a
 *  slope's ridge and eave), or one of its ends (a wall's corners, a slope's rakes) */
export type OutlineSide = 'top' | 'bottom' | 'end';

export function outlineSides(outline: Array<[THREE.Vector3, THREE.Vector3]>): Array<{ a: THREE.Vector3; b: THREE.Vector3; side: OutlineSide }> {
  const ys = outline.flatMap(([a, b]) => [a.y, b.y]);
  const [minY, maxY] = [Math.min(...ys), Math.max(...ys)];
  return outline.map(([a, b]) => {
    const level = Math.abs(a.y - b.y) < 1e-3;
    let side: OutlineSide = 'end';
    if (level && Math.abs(a.y - maxY) < 1e-3) side = 'top';
    else if (level && Math.abs(a.y - minY) < 1e-3) side = 'bottom';
    return { a, b, side };
  });
}

export function pushSegments(out: Segments, edges: Array<{ a: THREE.Vector3; b: THREE.Vector3 }>): Segments {
  for (const { a, b } of edges) out.push(a.x, a.y, a.z, b.x, b.y, b.z);
  return out;
}

/** A closed polygon in a plane of constant z (a gable's pentagon, an opening's rectangle) */
export function polygonAtZ(points: Array<{ x: number; y: number }>, z: number, offsetX = 0, out: Segments = [], skip?: (i: number) => boolean): Segments {
  points.forEach((p, i) => {
    if (skip?.(i)) return;
    const q = points[(i + 1) % points.length];
    out.push(p.x + offsetX, p.y, z, q.x + offsetX, q.y, z);
  });
  return out;
}

/** A mesh geometry's creases — the edges where its faces meet at more than `thresholdDeg` — moved by `offset` */
export function creaseEdges(geometry: THREE.BufferGeometry, thresholdDeg: number, offset: THREE.Vector3 = new THREE.Vector3(), out: Segments = []): Segments {
  const edges = new THREE.EdgesGeometry(geometry, thresholdDeg);
  const position = edges.getAttribute('position');
  for (let i = 0; i < position.count; i += 1) {
    out.push(position.getX(i) + offset.x, position.getY(i) + offset.y, position.getZ(i) + offset.z);
  }
  edges.dispose();
  return out;
}
