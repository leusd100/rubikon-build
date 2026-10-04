import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { homeProofCase } from '../../app/data/homeProof';
import { homeProofContour } from '../../app/data/homeProofContour';

// «Контур за фото» (owner, 04.10): the lines are registered onto ONE exact frame. A replaced, re-cropped or re-encoded
// photo must fail here until they are registered again — a contour drawn over the wrong pixels would claim what the
// photos never showed.

const sha256 = (publicPath: string) => createHash('sha256').update(readFileSync(join(process.cwd(), 'public', publicPath))).digest('hex');

describe('homeProofContour', () => {
  const { photo, variants, lines } = homeProofContour;

  it('is registered on the very photo HOME publishes, byte for byte', () => {
    expect(homeProofCase?.photo.src).toBe(photo.src);
    expect(homeProofCase?.photo.width).toBe(photo.width);
    expect(homeProofCase?.photo.height).toBe(photo.height);
    expect(sha256(photo.src)).toBe(photo.sha256);
    for (const variant of variants) expect(sha256(variant.src), variant.src).toBe(variant.sha256);
  });

  it('keeps every point inside the photo', () => {
    for (const line of lines) {
      expect(line.points.length, line.id).toBeGreaterThanOrEqual(2);
      for (const [x, y] of line.points) {
        expect(x, line.id).toBeGreaterThanOrEqual(0);
        expect(x, line.id).toBeLessThanOrEqual(photo.width);
        expect(y, line.id).toBeGreaterThanOrEqual(0);
        expect(y, line.id).toBeLessThanOrEqual(photo.height);
      }
    }
  });

  it('names each line once, in words — no register ids, no figures', () => {
    const ids = lines.map((line) => line.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const line of lines) {
      expect(line.id, line.id).not.toMatch(/PG\d*/i);
      expect(line.title, line.id).not.toMatch(/PG|\d/);
      expect(line.title.trim().length, line.id).toBeGreaterThan(0);
      // The approximate ones say so in their own title as well as by the dash
      expect(line.title.includes('наближено'), line.id).toBe(line.approximate);
    }
  });

  it('draws the gable outline and both gates; only the left rake of the outline is approximate', () => {
    const byKind = (kind: string) => lines.filter((line) => line.kind === kind);
    expect(byKind('outline').length).toBeGreaterThanOrEqual(1);
    expect(byKind('gate')).toHaveLength(2);
    expect(byKind('gate').every((gate) => !gate.approximate)).toBe(true);
    expect(byKind('outline').filter((line) => line.approximate).map((line) => line.id)).toEqual(['gable-rake-left']);
    expect(byKind('cladding').length).toBeGreaterThan(0);
  });
});
