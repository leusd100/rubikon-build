import { describe, expect, it } from 'vitest';
import { buildCladdingLines, claddingStepM } from '../../../app/lib/configurator/claddingLines';
import { deriveDomainModel } from '../../../app/lib/configurator/domainModel';
import { buildParametricModel } from '../../../app/lib/configurator/parametricModel';
import { DEFAULT_CONFIGURATOR_STATE, type ConfiguratorState } from '../../../app/lib/configurator/types';

// The cladding's lines on the technical drawing (07.10): a profiled sheet's ribs upright, a sandwich panel's joints across
// the wall, both down the roof — so a visitor who picks one sees the drawing change

function linesFor(overrides: Partial<ConfiguratorState>) {
  const state = { ...DEFAULT_CONFIGURATOR_STATE, ...overrides };
  const building = buildParametricModel(deriveDomainModel(state));
  return { building, lines: buildCladdingLines(building, state.wallSystem, state.roofSystem) };
}

describe('the drawing’s cladding lines', () => {
  it('keeps about forty lines along the longest side, a whole metre apart at least', () => {
    expect(claddingStepM(24, 60)).toBe(2);
    expect(claddingStepM(12, 18)).toBe(1);
    expect(claddingStepM(50, 120)).toBe(3);
  });

  it('hangs a profiled sheet’s ribs upright, from the ground to the eave and the gable’s edge', () => {
    const { building, lines } = linesFor({ wallSystem: 'profiled-sheet' });
    const { eaveM, ridgeM } = building.heights;
    expect(lines.side.length).toBeGreaterThan(20);
    for (const [from, to] of lines.side) {
      expect([from.x, from.y, to.y]).toEqual([building.footprint.widthM, 0, eaveM]);
      expect(to.z).toBe(from.z);
    }
    // on the gable the ribs rise to its top: the one at the middle reaches near the ridge, the outer ones the eave
    const tops = lines.front.map(([, to]) => to.y);
    expect(Math.max(...tops)).toBeGreaterThan(eaveM);
    expect(Math.max(...tops)).toBeLessThanOrEqual(ridgeM);
    for (const [from, to] of lines.front) expect(to.x).toBe(from.x);
  });

  it('lays a sandwich panel’s joints across the wall, one per panel, and narrows them up the gable', () => {
    const { building, lines } = linesFor({ wallSystem: 'sandwich-panel' });
    const { widthM: W, lengthM: L } = building.footprint;
    for (const [from, to] of lines.side) {
      expect(from.y).toBe(to.y);
      expect([from.z, to.z]).toEqual([0, L]);
    }
    // a joint every metre between the ground and the 8 m eave, none on either edge
    expect(building.heights.eaveM).toBe(8);
    expect(lines.side.map(([from]) => from.y)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    const widths = lines.front.map(([from, to]) => to.x - from.x);
    expect(widths[0]).toBeCloseTo(W);
    expect(widths.at(-1)!).toBeLessThan(W);
    for (const [from, to] of lines.front) expect((from.x + to.x) / 2).toBeCloseTo(W / 2);
  });

  it('runs the roof’s lines down both slopes, the panels’ joints twice as far apart as the sheet’s ribs', () => {
    const sheet = linesFor({ roofSystem: 'profiled-sheet' });
    const panels = linesFor({ roofSystem: 'sandwich-panel' });
    const { eaveM, ridgeM } = sheet.building.heights;
    for (const [from, to] of sheet.lines.roof) {
      expect(from.y).toBe(eaveM);
      expect(to.y).toBe(ridgeM);
      expect(to.x).toBe(sheet.building.footprint.widthM / 2);
    }
    expect(sheet.lines.roof.length % 2).toBe(0);
    expect(panels.lines.roof.length).toBeLessThan(sheet.lines.roof.length);
    expect(panels.lines.roof.length).toBeGreaterThanOrEqual(Math.floor(sheet.lines.roof.length / 2) - 2);
  });

  it('draws different lines for the two systems', () => {
    expect(linesFor({ wallSystem: 'profiled-sheet' }).lines.side).not.toEqual(linesFor({ wallSystem: 'sandwich-panel' }).lines.side);
  });
});
