import { describe, expect, it } from 'vitest';
import { regionMap } from '../../app/data/regionMap';
import { regionTowns } from '../../app/data/regionTowns';
import { directionFromDnipro, insideRegion, kmFromDnipro, locationLine, nearestTown, placedTowns, reachAnswer, reachAt, reachOfTown, reachTag, toDrawing, toPlace } from '../../app/lib/regionReach';

describe('region reach: the map against the earth', () => {
  it('puts Dnipro within 3 drawing units of the drawing’s own mark', () => {
    const city = toDrawing(regionTowns[0]);
    expect(Math.hypot(city.x - regionMap.dnipro.x, city.y - regionMap.dnipro.y)).toBeLessThan(3);
    expect(kmFromDnipro(regionMap.dnipro)).toBeLessThanOrEqual(1);
  });

  it('turns a place into the drawing and back', () => {
    const place = toPlace(toDrawing({ lon: 35.8667, lat: 48.5167 }));
    expect(place.lon).toBeCloseTo(35.8667, 6);
    expect(place.lat).toBeCloseTo(48.5167, 6);
  });

  it('measures straight-line kilometres from Dnipro', () => {
    expect(reachOfTown('Павлоград')?.km).toBe(61);
    expect(reachOfTown('Кривий Ріг')?.km).toBe(137);
    expect(reachOfTown('Нікополь')?.km).toBe(111);
  });

  it('has every town inside the oblast’s outline, and none twice', () => {
    for (const town of placedTowns) expect(insideRegion(town), town.name).toBe(true);
    expect(new Set(regionTowns.map((town) => town.name)).size).toBe(regionTowns.length);
  });

  it('knows the drawing’s corners are outside the oblast', () => {
    for (const corner of [{ x: 2, y: 2 }, { x: 800, y: 2 }, { x: 2, y: 529 }, { x: 800, y: 529 }]) expect(insideRegion(corner)).toBe(false);
  });
});

describe('region reach: what a point says', () => {
  it('snaps a point near a town to the town', () => {
    const town = placedTowns.find((each) => each.name === 'Павлоград')!;
    const reach = reachAt({ x: town.x + 10, y: town.y - 8 });
    expect(reach.town?.name).toBe('Павлоград');
    expect([reach.x, reach.y]).toEqual([town.x, town.y]);
    expect(reachTag(reach)).toBe('Павлоград · 61 км');
  });

  it('leaves a point far from every town where it is', () => {
    const empty = { x: 180, y: 340 };
    expect(nearestTown(empty)).toBeNull();
    const reach = reachAt(empty);
    expect(reach.town).toBeNull();
    expect(reach.inside).toBe(true);
    expect(reachTag(reach)).toBe(`${reach.km} км`);
    // west of Kryvyi Rih's latitude band, south-west of Dnipro
    expect(directionFromDnipro(reach)).toBe('південний захід');
    expect(reachAnswer(reach)).toBe(`${reach.km} км на південний захід`);
    expect(locationLine(reach)).toBe(`Дніпропетровська обл., ≈${reach.km} км на південний захід від Дніпра`);
  });

  it('says outside, and names no town, past the boundary', () => {
    const reach = reachAt({ x: 790, y: 520 });
    expect(reach.inside).toBe(false);
    expect(reach.town).toBeNull();
    expect(reachTag(reach)).toBe('Поза областю');
  });

  it('names the way from Dnipro by the eight winds', () => {
    expect(directionFromDnipro(reachOfTown('Павлоград')!)).toBe('схід');
    expect(directionFromDnipro(reachOfTown('Нікополь')!)).toBe('південний захід');
    expect(directionFromDnipro(reachOfTown('Царичанка')!)).toBe('північний захід');
    expect(directionFromDnipro(reachOfTown('Синельникове')!)).toBe('південний схід');
  });

  it('calls Dnipro by its name, not «0 км»', () => {
    const reach = reachAt(regionMap.dnipro);
    expect(reachTag(reach)).toBe('Дніпро');
    expect(locationLine(reach)).toBe('Дніпро');
  });

  it('writes a line the form’s 100-character field takes', () => {
    for (const town of placedTowns) {
      const line = locationLine(reachAt(town));
      expect(line.length, town.name).toBeLessThanOrEqual(100);
      if (town.name !== 'Дніпро') expect(line).toBe(`${town.name} і околиці`);
    }
  });
});
