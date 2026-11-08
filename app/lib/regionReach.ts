import { regionMap } from '../data/regionMap';
import { regionGeo, regionTowns, type RegionTown } from '../data/regionTowns';

// «Де ваш об’єкт?» on the region's map: a point of the drawing → the nearest town, the straight-line distance from
// Dnipro, inside the oblast or not, and the line it writes into the form's «Місто або область». Pure, so it is tested
// in node (tests/unit/region-reach.test.ts); RegionMap and RegionReach only draw and say what this returns.

export type Point = { readonly x: number; readonly y: number };
export type PlacedTown = RegionTown & Point;
export type Reach = Point & { readonly town: PlacedTown | null; readonly inside: boolean; readonly km: number };

const { box, lon, lat, dnipro } = regionGeo;

/** A place on the earth → the drawing */
export function toDrawing(place: { lon: number; lat: number }): Point {
  return {
    x: box.x0 + ((place.lon - lon.west) / (lon.east - lon.west)) * (box.x1 - box.x0),
    y: box.y0 + ((lat.north - place.lat) / (lat.north - lat.south)) * (box.y1 - box.y0),
  };
}

/** The drawing → a place on the earth */
export function toPlace({ x, y }: Point) {
  return {
    lon: lon.west + ((x - box.x0) / (box.x1 - box.x0)) * (lon.east - lon.west),
    lat: lat.north - ((y - box.y0) / (box.y1 - box.y0)) * (lat.north - lat.south),
  };
}

/** Straight-line (great-circle) kilometres from Dnipro, rounded */
export function kmFromDnipro(point: Point) {
  const place = toPlace(point);
  const rad = Math.PI / 180;
  const a = Math.sin(((place.lat - dnipro.lat) * rad) / 2) ** 2
    + Math.cos(dnipro.lat * rad) * Math.cos(place.lat * rad) * Math.sin(((place.lon - dnipro.lon) * rad) / 2) ** 2;
  return Math.round(2 * 6371 * Math.asin(Math.sqrt(a)));
}

const WINDS = ['північ', 'північний схід', 'схід', 'південний схід', 'південь', 'південний захід', 'захід', 'північний захід'] as const;

/** Which way from Dnipro, to the nearest of eight winds: a distance alone does not say where a place is */
export function directionFromDnipro(point: Point) {
  const place = toPlace(point);
  const east = (place.lon - dnipro.lon) * Math.cos((dnipro.lat * Math.PI) / 180);
  const north = place.lat - dnipro.lat;
  const degrees = (Math.atan2(east, north) * 180) / Math.PI;
  return WINDS[(Math.round(degrees / 45) + 8) % 8];
}

export const placedTowns: readonly PlacedTown[] = regionTowns.map((town) => ({ ...town, ...toDrawing(town) }));

/** The outline as points, once: regionMap.outline is one closed ring of «M x y L x y … Z». Split on its commands,
    not matched by a pattern of repeated groups (Sonar S8786: backtracking) */
const ring: readonly Point[] = regionMap.outline
  .split(/[MLZ]/)
  .map((pair) => pair.trim())
  .filter(Boolean)
  .map((pair) => {
    const [x, y] = pair.split(' ').map(Number);
    return { x, y };
  });

/** Inside the oblast's outline (even–odd ray cast) */
export function insideRegion({ x, y }: Point) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i], b = ring[j];
    if ((a.y > y) !== (b.y > y) && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

/** How near a town a point must be, in drawing units (about 9 km), for the point to become that town */
export const SNAP_UNITS = 24;

export function nearestTown(point: Point, within = SNAP_UNITS): PlacedTown | null {
  let best: PlacedTown | null = null;
  let distance = within;
  for (const town of placedTowns) {
    const d = Math.hypot(town.x - point.x, town.y - point.y);
    if (d < distance) {
      distance = d;
      best = town;
    }
  }
  return best;
}

/** What a point of the map is: a town near it takes the point over, so the ray ends on the town's dot */
export function reachAt(point: Point): Reach {
  const town = nearestTown(point);
  const at = town ? { x: town.x, y: town.y } : point;
  const inside = insideRegion(at);
  return { ...at, town: inside ? town : null, inside, km: kmFromDnipro(at) };
}

export function reachOfTown(name: string): Reach | null {
  const town = placedTowns.find((each) => each.name === name);
  return town ? reachAt(town) : null;
}

export const isDnipro = (reach: Reach) => reach.town?.name === regionTowns[0].name;

/** The map's own tag beside the point */
export function reachTag(reach: Reach) {
  if (!reach.inside) return 'Поза областю';
  if (isDnipro(reach)) return 'Дніпро';
  return reach.town ? `${reach.town.name} · ${reach.km} км` : `${reach.km} км`;
}

/** Said under the region's words: a town by its name, a point between towns by its distance and its way from Dnipro */
export function reachAnswer(reach: Reach) {
  if (!reach.inside || reach.town) return reachTag(reach);
  return `${reach.km} км на ${directionFromDnipro(reach)}`;
}

/** The form's «Місто або область» (maxLength 100 there, and two columns wide on a desktop): short, and enough to find
    the place — a town and its surroundings, or the distance and the way from Dnipro */
export function locationLine(reach: Reach) {
  if (isDnipro(reach)) return 'Дніпро';
  const line = reach.town
    ? `${reach.town.name} і околиці`
    : `Дніпропетровська обл., ≈${reach.km} км на ${directionFromDnipro(reach)} від Дніпра`;
  return line.slice(0, 100);
}
