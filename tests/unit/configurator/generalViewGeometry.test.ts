import { describe, expect, it } from 'vitest';
import { deriveDomainModel } from '../../../app/lib/configurator/domainModel';
import { DEFAULT_CONFIGURATOR_STATE, type ConfiguratorState } from '../../../app/lib/configurator/types';
import { generalViewGeometry, PLOT_END_MS, type GeneralViewFrame } from '../../../app/components/configurator/generalViewGeometry';
import { firstViewStageStartsMs } from '../../../app/lib/configurator/buildUpSequence';
import { overlaps, type Box } from '../../../app/components/angary/dimetric';
import { HOME_FRAME_EXAMPLE } from '../../../app/components/home-v2/homeFrameExample';

// «Загальний вигляд» on /angary's sheet (10.10): the clad hangar in the frame drawing's language, laid out in screen px
const DESKTOP: GeneralViewFrame = { width: 640, height: 430, annotated: true, keepClear: [] };
const PHONE: GeneralViewFrame = { width: 360, height: 220, annotated: true, keepClear: [] };
const view = (patch: Partial<ConfiguratorState> = {}, frame: GeneralViewFrame = DESKTOP) => generalViewGeometry(deriveDomainModel({ ...DEFAULT_CONFIGURATOR_STATE, ...patch }), frame);
const partial = (...scope: ConfiguratorState['scope']): Partial<ConfiguratorState> => ({ scopeMode: 'partial', scope, confirmed: ['scope'] });
const numbers = (d: string) => (d.match(/-?\d+(\.\d+)?/g) ?? []).map(Number);
const plain = (text: string) => text.replaceAll(' ', ' ');

describe('the general view', () => {
  it('draws the example clad, its gate cut in the end wall, and its four sizes with their values', () => {
    const g = view();
    expect(g.viewBox).toBe('0 0 640.0 430.0');
    for (const d of [g.planes, g.front, g.edges, g.ground, g.hatch, g.openings]) expect(d.length).toBeGreaterThan(10);
    expect(g.walls?.system).toBe('profiled-sheet');
    expect(g.roof?.system).toBe('profiled-sheet');
    expect(g.frame).toBeNull();
    expect(g.out).toBe('');
    expect(g.sizes.map(({ key }) => key)).toEqual(['width', 'length', 'height', 'ridge']);
    expect(g.sizes.map(({ label }) => plain(label.text))).toEqual(['24 м', '60 м', '8 м', '10,6 м']);
    // the ridge's figures on a plate in the field's colour; nothing outside the box
    expect(g.sizes.find(({ key }) => key === 'ridge')?.plate).toBeDefined();
    for (const value of numbers(`${g.planes}${g.front}${g.edges}${g.ground}`)) expect(Number.isFinite(value)).toBe(true);
    for (const { label } of g.sizes) {
      expect(label.x).toBeGreaterThan(0);
      expect(label.x).toBeLessThan(640);
      expect(label.y).toBeGreaterThan(0);
      expect(label.y).toBeLessThan(430);
    }
  });

  it('draws a sandwich panel by its joints, not the sheet’s ribs', () => {
    const sheet = view();
    const panels = view({ envelope: 'insulated', wallSystem: 'sandwich-panel', roofSystem: 'sandwich-panel', confirmed: ['envelope', 'cladding'] });
    expect(panels.walls?.system).toBe('sandwich-panel');
    expect(panels.roof?.system).toBe('sandwich-panel');
    expect(panels.walls?.d).not.toBe(sheet.walls?.d);
    expect(panels.roof?.d).not.toBe(sheet.roof?.d);
  });

  it('draws a surface out of the request dashed, and the frame where it is not clad', () => {
    const noWalls = view(partial('foundation', 'frame', 'roof'));
    expect(noWalls.walls).toBeNull();
    expect(noWalls.front).toBe('');
    expect(noWalls.openings).toBe('');
    expect(noWalls.out.length).toBeGreaterThan(10);
    expect(noWalls.frame?.front.length).toBeGreaterThan(10);
    const noRoof = view(partial('foundation', 'frame', 'walls'));
    expect(noRoof.roof).toBeNull();
    expect(noRoof.frame?.thin.length).toBeGreaterThan(10);
    // with the centre row the frame shows it
    const centre = view({ ...partial('frame'), internalSupports: 'allowed' });
    const clear = view({ ...partial('frame'), internalSupports: 'not-allowed' });
    expect(centre.frame?.front.length).toBeGreaterThan(clear.frame?.front.length ?? 0);
    // the foundation alone: the outline dashed, no frame
    const foundation = view(partial('foundation'));
    expect(foundation.frame).toBeNull();
    expect(foundation.walls).toBeNull();
    expect(foundation.roof).toBeNull();
  });

  it('lays out a phone’s drawing smaller, and any size the configurator allows', () => {
    const phone = view({}, PHONE);
    expect(phone.viewBox).toBe('0 0 360.0 220.0');
    expect(phone.sizes[0].label.size).toBeLessThan(view().sizes[0].label.size);
    const mini = view({}, { ...PHONE, annotated: false });
    expect(mini.sizes.length).toBeGreaterThanOrEqual(0);
    for (const dimensions of [{ width: 10, length: 10, height: 4 }, { width: 50, length: 120, height: 15 }]) {
      const g = view({ dimensions, confirmed: ['dimensions'] });
      for (const value of numbers(`${g.planes}${g.edges}${g.walls?.d ?? ''}${g.roof?.d ?? ''}`)) expect(Number.isFinite(value)).toBe(true);
    }
  });

  it('keeps clear of what lies on the picture', () => {
    const chip: Box = [470, 10, 630, 50];
    const g = view({}, { ...DESKTOP, keepClear: [chip] });
    for (const { label } of g.sizes) {
      const box: Box = [label.x - 20, label.y - 8, label.x + 20, label.y + 8];
      expect(overlaps(box, chip)).toBe(false);
    }
  });
});

// The first view's frame (owner, 19.11): only when asked for, inside the drawing, and drawn before the walls close over it
describe('the first view\'s frame plot', () => {
  const build = (patch: Partial<ConfiguratorState> = {}, frame: GeneralViewFrame = DESKTOP) =>
    generalViewGeometry(deriveDomainModel({ ...DEFAULT_CONFIGURATOR_STATE, ...patch }), frame, true).build;

  it('is not drawn unless the first view asks for it — the drawing is the one the server sends', () => {
    expect(view().build).toBeUndefined();
    expect(view({}, PHONE).build).toBeUndefined();
  });

  it('plots the example\'s whole frame: columns, roof members, members along it and bracing, with both skins', () => {
    const plot = build()!;
    const kinds = new Set(plot.members.map((member) => member.kind));
    expect([...kinds].sort()).toEqual(['brace', 'chord', 'front', 'long', 'post']);
    // each member named by its place in the building: a stable React key
    expect(new Set(plot.members.map((member) => member.id)).size).toBe(plot.members.length);
    expect(plot.walls.length).toBeGreaterThan(10);
    expect(plot.roof.length).toBeGreaterThan(10);
  });

  it('has nothing to plot without the frame, and no skin for a surface out of the request', () => {
    expect(build(partial('foundation', 'walls', 'roof'))).toBeUndefined();
    const open = build(partial('foundation', 'frame', 'roof'))!;
    expect(open.walls).toBe('');
    expect(open.roof.length).toBeGreaterThan(10);
  });

  it('draws every member before the walls\' stage begins, however long the hangar', () => {
    // from the frame stage's release to the walls' (buildUpSequence: index 1 → 2)
    const [, frameAt, wallsAt] = firstViewStageStartsMs();
    expect(PLOT_END_MS).toBeLessThanOrEqual(wallsAt - frameAt);
    for (const dimensions of [{ width: 10, length: 10, height: 4 }, { width: 24, length: 60, height: 8 }, { width: 50, length: 120, height: 15 }]) {
      const plot = build({ dimensions })!;
      for (const member of plot.members) expect(member.at + member.dur).toBeLessThanOrEqual(PLOT_END_MS);
    }
  });

  it('keeps every member inside the drawing\'s box', () => {
    for (const frame of [DESKTOP, PHONE]) {
      for (const member of build({}, frame)!.members) {
        const values = numbers(member.d);
        for (let index = 0; index < values.length; index += 2) {
          expect(values[index]).toBeGreaterThanOrEqual(0);
          expect(values[index]).toBeLessThanOrEqual(frame.width);
          expect(values[index + 1]).toBeGreaterThanOrEqual(0);
          expect(values[index + 1]).toBeLessThanOrEqual(frame.height);
        }
      }
    }
  });
});

describe('HOME\'s «Каркас» example', () => {
  it('keeps the one gate and no door HOME showed (owner, 19.11), whatever the configurator\'s example', () => {
    expect([HOME_FRAME_EXAMPLE.gates, HOME_FRAME_EXAMPLE.gateType, HOME_FRAME_EXAMPLE.doors]).toEqual([1, 'standard', 0]);
    expect(HOME_FRAME_EXAMPLE.dimensions).toEqual(DEFAULT_CONFIGURATOR_STATE.dimensions);
  });
});
