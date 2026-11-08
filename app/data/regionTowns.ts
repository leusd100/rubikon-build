// Where a visitor points on the region's map (RegionMap, «Де ваш об’єкт?»): the towns it names and how a point of the
// drawing turns into a place. Coordinates are WGS 84, the town centres to two or so decimals; every town lies inside the
// oblast's outline (tests/unit/region-reach.test.ts). Distances are straight lines from Dnipro, said so wherever they show.

/**
 * The drawing (regionMap.viewBox) against the earth: the outline's bounding box in the drawing and the oblast's bounding
 * box in degrees, from the OpenStreetMap boundary of UA-12. A plain equirectangular fit of one box to the other puts
 * Dnipro within about 2 units of the drawing's own mark (regionMap.dnipro), which is under a kilometre here.
 */
export const regionGeo = {
  box: { x0: 6, x1: 796, y0: 6, y1: 525 },
  lon: { west: 32.98373, east: 36.92715 },
  lat: { south: 47.47388, north: 49.18304 },
  dnipro: { lon: 35.0462, lat: 48.4647 },
} as const;

export type RegionTown = { readonly name: string; readonly lon: number; readonly lat: number };

/** Dnipro first: a point at the city is the city, not «0 km» */
export const regionTowns: readonly RegionTown[] = [
  { name: 'Дніпро', lon: 35.0462, lat: 48.4647 },
  { name: 'Апостолове', lon: 33.72, lat: 47.66 },
  { name: 'Васильківка', lon: 36.03, lat: 48.21 },
  { name: 'Верхньодніпровськ', lon: 34.33, lat: 48.65 },
  { name: 'Вільногірськ', lon: 34.02, lat: 48.48 },
  { name: 'Жовті Води', lon: 33.5, lat: 48.35 },
  { name: 'Камʼянське', lon: 34.6133, lat: 48.5167 },
  { name: 'Кривий Ріг', lon: 33.3918, lat: 47.9105 },
  { name: 'Марганець', lon: 34.6278, lat: 47.6458 },
  { name: 'Межова', lon: 36.73, lat: 48.25 },
  { name: 'Нікополь', lon: 34.4, lat: 47.5667 },
  { name: 'Павлоград', lon: 35.8667, lat: 48.5167 },
  { name: 'Петриківка', lon: 34.63, lat: 48.73 },
  { name: 'Підгородне', lon: 35.1, lat: 48.57 },
  { name: 'Покров', lon: 34.12, lat: 47.65 },
  { name: 'Пʼятихатки', lon: 33.69, lat: 48.41 },
  { name: 'Самар', lon: 35.2333, lat: 48.6333 },
  { name: 'Синельникове', lon: 35.52, lat: 48.32 },
  { name: 'Тернівка', lon: 36.08, lat: 48.52 },
  { name: 'Томаківка', lon: 34.75, lat: 47.81 },
  { name: 'Царичанка', lon: 34.48, lat: 48.94 },
];
