import { describe, expect, it } from 'vitest';
import {
  alternativeCladdingDemo,
  createHangarPresentationDemo,
} from '../../../app/lib/configurator/presentationDemo';
import { DEFAULT_CONFIGURATOR_STATE } from '../../../app/lib/configurator/types';

describe('hangar educational presentation demos', () => {
  it('creates a frame-only preview without mutating the business configuration', () => {
    const demo = createHangarPresentationDemo('frame', DEFAULT_CONFIGURATOR_STATE);

    expect(demo.configuration.scope).toEqual(['frame']);
    expect(DEFAULT_CONFIGURATOR_STATE.scope).toEqual(['foundation', 'frame', 'walls', 'roof']);
    expect(demo.configuration.dimensions).toBe(DEFAULT_CONFIGURATOR_STATE.dimensions);
  });

  it('creates the opposite cladding comparison and keeps the original state untouched', () => {
    const target = alternativeCladdingDemo(DEFAULT_CONFIGURATOR_STATE);
    const demo = createHangarPresentationDemo(target, DEFAULT_CONFIGURATOR_STATE);

    expect(target).toBe('sandwich-panel');
    expect(demo.configuration).toMatchObject({
      envelope: 'insulated',
      wallSystem: 'sandwich-panel',
      roofSystem: 'sandwich-panel',
    });
    expect(demo.configuration.scope).toEqual(['foundation', 'frame', 'walls', 'roof']);
    expect(DEFAULT_CONFIGURATOR_STATE.wallSystem).toBe('profiled-sheet');
  });

  it('adds only the scope needed to make an enclosure demo legible', () => {
    const business = { ...DEFAULT_CONFIGURATOR_STATE, scope: ['foundation'] as const };
    const demo = createHangarPresentationDemo('profiled-sheet', {
      ...business,
      scope: [...business.scope],
    });

    expect(demo.configuration.scope).toEqual(['foundation', 'frame', 'walls', 'roof']);
  });
});
