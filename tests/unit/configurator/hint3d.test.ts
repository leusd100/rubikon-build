import { describe, expect, it } from 'vitest';
import { crosses, overlaps, type Box } from '../../../app/components/angary/dimetric';
import { deriveDomainModel } from '../../../app/lib/configurator/domainModel';
import { DEFAULT_CONFIGURATOR_STATE } from '../../../app/lib/configurator/types';
import { generalViewGeometry, type GeneralViewFrame } from '../../../app/components/configurator/generalViewGeometry';
import { placeHint3d, type Hint3dInput } from '../../../app/components/configurator/hint3d';

// The sheet's 3D callout (owner, 19.11: «щоб не налазило»): the name lies on nothing, the leader keeps off the values,
// the legend and the chip, and with no clear place there is no callout

const chip: Box = [674, 12, 808, 44];
const base: Hint3dInput = {
  chip,
  bounds: [-24, -24, 844, 598],
  size: { width: 150, height: 14 },
  keepClear: [chip],
  meets: () => false,
  sizeBoxes: [],
  anchor: [652, 128],
  withLeader: true,
};

describe('the 3D callout', () => {
  it('stands beside the chip, on its line, with an arrow to it and a leader from the roof', () => {
    const layout = placeHint3d(base)!;
    expect(layout.tag.anchor).toBe('end');
    expect(layout.tag.box[2]).toBeLessThan(chip[0]);
    expect(layout.connector).not.toBeNull();
    expect(layout.leader?.from).toEqual(base.anchor);
  });

  it('goes under the chip when the place beside it meets the drawing', () => {
    const besideBlocked = (box: Box) => box[3] < chip[3] && box[0] < chip[0];
    const layout = placeHint3d({ ...base, meets: besideBlocked })!;
    expect(layout.tag.box[1]).toBeGreaterThan(chip[3]);
    expect(layout.connector).toBeNull();
  });

  it('drops the leader before it would cross a size\'s value or line, and keeps the name beside the chip', () => {
    // a value right across every way from the roof to a name: no leader is clear, so the name stands alone, with its arrow
    const value: Box = [560, 40, 720, 110];
    const layout = placeHint3d({ ...base, sizeBoxes: [value] })!;
    expect(layout.leader).toBeNull();
    expect(layout.connector).not.toBeNull();
    expect(overlaps(layout.tag.box, value)).toBe(false);
    // the same across a size's line
    const lined = placeHint3d({ ...base, sizeLines: [[[560, 100], [740, 100]]] })!;
    expect(lined.leader).toBeNull();
  });

  it('keeps clear of a legend laid on the picture, and of the picture\'s edge', () => {
    const legend: Box = [380, -20, 660, 60];
    const layout = placeHint3d({ ...base, keepClear: [chip, legend] })!;
    expect(overlaps(layout.tag.box, legend)).toBe(false);
    expect(layout.tag.box[0]).toBeGreaterThanOrEqual(base.bounds[0] + 4);
  });

  it('has no callout at all when nowhere is clear', () => {
    expect(placeHint3d({ ...base, meets: () => true })).toBeNull();
  });

  it('keeps the name inside the drawing\'s box', () => {
    // a chip at the very left: beside it there is no room
    const left: Box = [10, 12, 144, 44];
    const layout = placeHint3d({ ...base, chip: left, keepClear: [left], bounds: [0, 0, 820, 574] })!;
    expect(layout.tag.box[0]).toBeGreaterThanOrEqual(4);
    expect(layout.tag.box[1]).toBeGreaterThan(left[3]);
  });

  // the drawing boxes, chips and paddings measured on /angary at these screens (19.11), the name's width in its type
  it('finds a clear place on the example\'s real drawing at every screen measured, the name clear of it', () => {
    const screens: { name: string; frame: GeneralViewFrame; pad: number; tag: number }[] = [
      { name: '1440', frame: { width: 622, height: 526, annotated: true, keepClear: [[500, -12, 634, 20]] }, pad: 24, tag: 160 },
      { name: '1280×800', frame: { width: 633, height: 350, annotated: true, keepClear: [[512, -12, 645, 20]] }, pad: 24, tag: 160 },
      { name: '1280×720', frame: { width: 633, height: 270, annotated: true, keepClear: [[512, -12, 645, 20]] }, pad: 24, tag: 160 },
      { name: '1024', frame: { width: 412, height: 274, annotated: true, keepClear: [[290, -12, 424, 20]] }, pad: 24, tag: 82 },
      { name: '820', frame: { width: 445, height: 235, annotated: true, keepClear: [[323, -12, 457, 20]] }, pad: 24, tag: 82 },
      { name: '390', frame: { width: 304, height: 186, annotated: true, keepClear: [[176, -2, 306, 26]] }, pad: 10, tag: 82 },
      { name: '360', frame: { width: 274, height: 169, annotated: true, keepClear: [[146, -2, 276, 26]] }, pad: 10, tag: 82 },
    ];
    for (const { name, frame, pad, tag } of screens) {
      const view = generalViewGeometry(deriveDomainModel(DEFAULT_CONFIGURATOR_STATE), frame);
      const [chipAt] = frame.keepClear;
      const layout = placeHint3d({
        chip: chipAt, bounds: [-pad, -pad, frame.width + pad, frame.height + pad], size: { width: tag, height: 14 }, keepClear: frame.keepClear,
        meets: view.meets, sizeBoxes: view.sizeBoxes, anchor: view.hintAnchor, withLeader: frame.width >= 480,
      });
      expect(layout, name).not.toBeNull();
      expect(view.meets(layout!.tag.box), name).toBe(false);
      for (const box of view.sizeBoxes) expect(overlaps(box, layout!.tag.box), name).toBe(false);
      if (layout!.leader) for (const box of view.sizeBoxes) expect(crosses([layout!.leader.from, layout!.leader.to], box), name).toBe(false);
    }
  });
});
