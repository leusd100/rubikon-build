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
      // Owner, 05.10: a client need not know which are measured and which approximate — no line says either
      expect(line.title, line.id).not.toMatch(/наближено|виміряно/);
    }
  });

  it('draws the gable outline and both gates, the gates solid', () => {
    const byKind = (kind: string) => lines.filter((line) => line.kind === kind);
    expect(byKind('outline').length).toBeGreaterThanOrEqual(1);
    expect(byKind('gate')).toHaveLength(2);
    expect(byKind('gate').every((gate) => !gate.approximate)).toBe(true);
    // nothing else: the cladding's strip lines left the data with the proof block's cleanup (09.10) — never drawn since
    // «Контур» went (05.10)
    expect(lines.length).toBe(byKind('outline').length + byKind('gate').length);
  });

  // The study's own record stays in the data — the left rake, which lies off its edge; the right corner, whose edge the
  // study finds outside it, on the trim — but the page draws every line solid and says
  // neither «виміряно» nor «наближено» (owner, 05.10): the accessible name says what the lines are, no more
  it('keeps the study\'s approximate set in the data, and the accessible label free of measured / approximate', () => {
    expect(lines.filter((line) => line.approximate).map((line) => line.id)).toEqual(['gable-corner-right', 'gable-rake-left']);
    const { label } = homeProofContour;
    expect(label).not.toMatch(/\d/);
    expect(label).toContain('Контур за фото');
    expect(label).not.toMatch(/виміряно|наближено/);
    // The outline's solid parts join its dashed ones end to end: one closed outline, round from the apex
    const outline = lines.filter((line) => line.kind === 'outline');
    for (let index = 1; index < outline.length; index += 1) {
      expect(outline[index].points[0], outline[index].id).toEqual(outline[index - 1].points.at(-1));
    }
    expect(outline.at(-1)?.points.at(-1)).toEqual(outline[0].points[0]);
  });
});
