import { describe, expect, it } from 'vitest';
import { endWallFraming, postSpacingM, sheetOpenings, type EndWallOpening } from '../../../app/components/angary/endWallFraming';
import { buildParametricModel } from '../../../app/lib/configurator/parametricModel';
import { deriveDomainModel } from '../../../app/lib/configurator/domainModel';
import { projectToView } from '../../../app/lib/configurator/viewProjection';
import { DEFAULT_CONFIGURATOR_STATE, type ConfiguratorState, type GateType } from '../../../app/lib/configurator/types';

// The frame tour's end wall (04.10): its posts frame the configurator's gates and never stand in an opening; its wall
// purlins stop at one.

const gate = (xM: number, widthM = 4, heightM = 4): EndWallOpening => ({ kind: 'gate', xM, widthM, heightM });
const door = (xM: number): EndWallOpening => ({ kind: 'door', xM, widthM: 1, heightM: 2.1 });
const inside = (x: number, { xM, widthM }: EndWallOpening) => x > xM + 1e-6 && x < xM + widthM - 1e-6;

/** The tour's own reading: the configurator's model for a state, its openings as the end wall sees them */
function framingFor(patch: Partial<ConfiguratorState> & { width?: number; height?: number }) {
  const { width, height, ...rest } = patch;
  const state: ConfiguratorState = {
    ...DEFAULT_CONFIGURATOR_STATE,
    ...rest,
    dimensions: { ...DEFAULT_CONFIGURATOR_STATE.dimensions, ...(width ? { width } : {}), ...(height ? { height } : {}) },
  };
  const domain = deriveDomainModel(state);
  const openings = sheetOpenings(buildParametricModel(domain).openings, domain.dimensions.widthM, domain.scope.walls);
  const centre = domain.structural.scheme === 'centerSupport';
  return { openings, centre, widthM: domain.dimensions.widthM, eaveM: domain.dimensions.eaveHeightM, ...endWallFraming({ widthM: domain.dimensions.widthM, eaveM: domain.dimensions.eaveHeightM, centre, openings }) };
}

describe('the end wall posts’ rhythm', () => {
  it('keeps the old spacing on a wall with no openings: about every 7 m, at most three; a post halves each span of a centre row', () => {
    expect(endWallFraming({ widthM: 12, eaveM: 8, centre: false, openings: [] }).postXs).toEqual([6]);
    expect(endWallFraming({ widthM: 18, eaveM: 8, centre: false, openings: [] }).postXs).toEqual([6, 12]);
    expect(endWallFraming({ widthM: 23, eaveM: 8, centre: false, openings: [] }).postXs.map((x) => +x.toFixed(2))).toEqual([7.67, 15.33]);
    expect(endWallFraming({ widthM: 24, eaveM: 8, centre: true, openings: [] }).postXs).toEqual([6, 18]);
    expect(endWallFraming({ widthM: 50, eaveM: 8, centre: true, openings: [] }).postXs).toEqual([12.5, 37.5]);
    expect(postSpacingM(10, false)).toBe(5);
    expect(postSpacingM(40, false)).toBe(10);
  });

  it('runs the wall purlins from vertical to vertical at a third and two thirds of the wall', () => {
    const { girts, verticals } = endWallFraming({ widthM: 12, eaveM: 9, centre: false, openings: [] });
    expect(verticals).toEqual([0, 6, 12]);
    expect(girts).toEqual([
      { z: 3, from: 0, to: 6 }, { z: 3, from: 6, to: 12 },
      { z: 6, from: 0, to: 6 }, { z: 6, from: 6, to: 12 },
    ]);
  });
});

describe('a gate on the end wall', () => {
  it('is framed by a post at either jamb, with none inside it (12 m: the post stood at 6, in the 4–8 m gate)', () => {
    const framing = endWallFraming({ widthM: 12, eaveM: 8, centre: false, openings: [gate(4)] });
    expect(framing.postXs).toEqual([4, 8]);
    // the lower wall purlin (2.67 m) stops at the gate; the upper one (5.33 m) passes over it
    expect(framing.girts.filter(({ z }) => z < 4).map(({ from, to }) => [from, to])).toEqual([[0, 4], [8, 12]]);
    expect(framing.girts.filter(({ z }) => z > 4).map(({ from, to }) => [from, to])).toEqual([[0, 4], [4, 8], [8, 12]]);
  });

  it('lets a column next to it frame that side, keeps the rhythm elsewhere and leaves out a stub of wall purlin', () => {
    // the default 24 × 60 × 8: the gate stepped aside of column Б, 7.5–11.5
    const framing = endWallFraming({ widthM: 24, eaveM: 8, centre: true, openings: [gate(7.5)] });
    expect(framing.postXs).toEqual([3.75, 7.5, 18]);
    expect(framing.verticals).toEqual([0, 3.75, 7.5, 12, 18, 24]);
    const lower = framing.girts.filter(({ z }) => z < 4).map(({ from, to }) => [from, to]);
    expect(lower).toEqual([[0, 3.75], [3.75, 7.5], [12, 18], [18, 24]]);
  });

  it('frames two gates side by side with their own jambs', () => {
    const framing = endWallFraming({ widthM: 18, eaveM: 8, centre: false, openings: [gate(4.28), gate(9.72)] });
    expect(framing.postXs.map((x) => +x.toFixed(2))).toEqual([4.28, 8.28, 9.72, 13.72]);
  });
});

describe('the door', () => {
  it('moves a post that would stand in it to the nearest place clear of it', () => {
    // no gates: the door at a quarter of the width, where the post of a centre row's half stood
    const framing = endWallFraming({ widthM: 24, eaveM: 8, centre: true, openings: [door(5.5)] });
    expect(framing.postXs.every((x) => x <= 5.5 - 0.3 + 1e-9 || x >= 6.5 + 0.3 - 1e-9)).toBe(true);
    expect(framing.postXs).toHaveLength(2);
    // the lower wall purlin at 2.67 m passes over the 2.1 m door; on a 4 m wall (1.33 m) it stops at the door
    expect(framing.girts.filter(({ z }) => z < 3).every(({ from, to }) => from >= 0 && to <= 24)).toBe(true);
    const low = endWallFraming({ widthM: 24, eaveM: 4, centre: true, openings: [door(5.5)] });
    expect(low.girts.filter(({ z }) => z < 2).some(({ from, to }) => from < 6 && to > 6)).toBe(false);
  });

  it('keeps one post where two wanted ones would move to the same side of it', () => {
    const framing = endWallFraming({ widthM: 4, eaveM: 6, centre: false, openings: [door(1.5)] });
    expect(framing.postXs.length).toBeLessThanOrEqual(1);
  });
});

describe('every configuration the configurator allows', () => {
  it('never stands a post in a gate or the door, and never runs a wall purlin across an opening below its head', () => {
    const problems: string[] = [];
    for (let width = 10; width <= 50; width += 1) {
      for (const gates of [0, 1, 2] as const) {
        for (const gateType of ['standard', 'double'] as GateType[]) {
          for (const doors of [0, 1] as const) {
            for (const height of [4, 8, 12]) {
              const { openings, postXs, girts } = framingFor({ width, height, gates, gateType, doors });
              for (const opening of openings) {
                for (const x of postXs) if (inside(x, opening)) problems.push(`W${width} H${height} ${gates}×${gateType} ${doors}: post ${x} in ${opening.kind}`);
                for (const { z, from, to } of girts) {
                  if (opening.heightM > z && from < opening.xM + opening.widthM - 1e-6 && to > opening.xM + 1e-6) {
                    problems.push(`W${width} H${height} ${gates}×${gateType} ${doors}: purlin ${from}–${to} at ${z} across ${opening.kind}`);
                  }
                }
              }
            }
          }
        }
      }
    }
    expect(problems).toEqual([]);
  });

  it('frames the default gate at 10–17 m with posts at its jambs', () => {
    for (const width of [10, 12, 16, 17]) {
      const { openings, postXs } = framingFor({ width });
      const [only] = openings;
      expect(only.kind).toBe('gate');
      expect(postXs).toContain(only.xM);
      expect(postXs).toContain(only.xM + only.widthM);
    }
  });
});

// 09.10, audit F18: the general view and the 3D put the model's x = 0 at the front wall's right corner, the sheet puts
// axis А on the left — the gates and the door stood on the other side of the centre on «Каркас»
describe('the openings on the sheet', () => {
  const stateFor = (patch: Partial<ConfiguratorState>): ConfiguratorState => ({ ...DEFAULT_CONFIGURATOR_STATE, ...patch });

  it.each([
    ['24 × 60 × 8, a gate and the door', stateFor({ gates: 1, doors: 1 })],
    ['10 × 10 × 4, the door', stateFor({ dimensions: { width: 10, length: 10, height: 4 }, gates: 1, doors: 1 })],
    ['20 × 40 × 6, the door alone', stateFor({ dimensions: { width: 20, length: 40, height: 6 }, gates: 0, doors: 1 })],
    ['36 × 60 × 8, two gates and the door', stateFor({ dimensions: { width: 36, length: 60, height: 8 }, gates: 2, doors: 1 })],
    ['24 × 60 × 8 with no columns inside', stateFor({ gates: 1, doors: 1, internalSupports: 'not-allowed' })],
  ])('stand in the order and on the side the general view and the 3D show them: %s', (_, state) => {
    const domain = deriveDomainModel(state);
    const W = domain.dimensions.widthM;
    const model = buildParametricModel(domain).openings;
    // the general view and the 3D: one camera (viewProjection.ts), left to right on the screen
    const onScreen = (x: number) => projectToView({ x, y: 0, z: 0 }).x;
    const general = model.map(({ kind, rect }) => ({ kind, at: onScreen(rect.xM + rect.widthM / 2) - onScreen(W / 2) }))
      .sort((a, b) => a.at - b.at);
    // the sheet: its x runs left to right, from axis А
    const sheet = sheetOpenings(model, W, true).map(({ kind, xM, widthM }) => ({ kind, at: xM + widthM / 2 - W / 2 }))
      .sort((a, b) => a.at - b.at);
    expect(model.length).toBeGreaterThan(0);
    expect(sheet.map((o) => o.kind)).toEqual(general.map((o) => o.kind));
    expect(sheet.map((o) => Math.sign(Math.round(o.at * 1000)))).toEqual(general.map((o) => Math.sign(Math.round(o.at * 1000))));
    // mirrored, not moved: each as far from the centre as in the model
    const distances = (list: readonly { at: number }[]) => list.map((o) => +Math.abs(o.at).toFixed(3)).sort((a, b) => a - b);
    expect(distances(sheet)).toEqual(distances(model.map(({ rect }) => ({ at: rect.xM + rect.widthM / 2 - W / 2 }))));
  });

  // 09.10, audit F124: the general view and the stamp drop the gates without walls in the request; the sheet drew them,
  // and its posts and wall purlins still stepped round them
  it('are none without walls in the request, and the end wall is framed as a wall with no openings', () => {
    const domain = deriveDomainModel(stateFor({ gates: 1, doors: 1, scopeMode: 'partial', scope: ['foundation', 'frame', 'roof'] }));
    const openings = sheetOpenings(buildParametricModel(domain).openings, domain.dimensions.widthM, domain.scope.walls);
    expect(openings).toEqual([]);
    const { widthM, eaveHeightM } = domain.dimensions;
    const centre = domain.structural.scheme === 'centerSupport';
    expect(endWallFraming({ widthM, eaveM: eaveHeightM, centre, openings }).postXs).toEqual(
      endWallFraming({ widthM, eaveM: eaveHeightM, centre, openings: [] }).postXs,
    );
    expect(framingFor({ gates: 1, doors: 1, scopeMode: 'partial', scope: ['foundation', 'frame', 'roof'] }).openings).toEqual([]);
  });
});
