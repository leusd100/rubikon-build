import { describe, expect, it } from 'vitest';
import {
  BUILD_LAYER_ORDER,
  buildLayerForPrimitive,
  layerStartOffsetMs,
  staggerDelayMs,
  totalSequenceDurationMs,
} from '../../../app/lib/configurator/buildUpSequence';
import { buildHangarScene } from '../../../app/lib/configurator/sceneModel';
import { deriveDomainModel } from '../../../app/lib/configurator/domainModel';
import { DEFAULT_CONFIGURATOR_STATE, type ConfiguratorState } from '../../../app/lib/configurator/types';

function stateWith(overrides: Partial<ConfiguratorState>): ConfiguratorState {
  return { ...DEFAULT_CONFIGURATOR_STATE, ...overrides };
}

describe('buildUpSequence timing', () => {
  it('keeps the whole sequence within the ~3s ceiling regardless of hangar size', () => {
    expect(totalSequenceDurationMs()).toBeLessThanOrEqual(3000);
  });

  it('stages layers strictly in the confirmed build order (each starts no earlier than the previous)', () => {
    const offsets = BUILD_LAYER_ORDER.map((layer) => layerStartOffsetMs(layer));
    for (let i = 1; i < offsets.length; i += 1) {
      expect(offsets[i]).toBeGreaterThan(offsets[i - 1]);
    }
  });

  it('caps the total stagger span so a large hangar does not take proportionally longer than a small one', () => {
    const smallSpanEnd = staggerDelayMs('columns', 1, 2); // 2-bay hangar: only two instances
    const largeSpanEnd = staggerDelayMs('columns', 9, 10); // 10-bay hangar: last of ten instances

    // The last instance of a 10-bay layer must not start dramatically later than a 2-bay one —
    // both are bounded by the same MAX_STAGGER_SPAN_MS ceiling for that layer.
    expect(largeSpanEnd).toBeLessThanOrEqual(400);
    expect(smallSpanEnd).toBeLessThanOrEqual(largeSpanEnd + 1);
  });

  it('is deterministic: same (layer, index, count) always yields the same delay', () => {
    expect(staggerDelayMs('walls', 3, 8)).toBe(staggerDelayMs('walls', 3, 8));
  });

  it('gives a single-instance layer zero stagger delay', () => {
    expect(staggerDelayMs('foundation', 0, 1)).toBe(0);
  });

  it('maps every scene primitive kind to a build layer, or explicitly to none for terrain/annotations', () => {
    const domain = deriveDomainModel(stateWith({}));
    const scene = buildHangarScene(domain);
    for (const primitive of scene.primitives) {
      const layer = buildLayerForPrimitive(primitive);
      if (primitive.kind === 'terrain-plane' || primitive.kind === 'dimension-guide') {
        expect(layer).toBeNull();
      } else {
        expect(layer).not.toBeNull();
      }
    }
  });

  it('never restarts a layer with a negative or NaN offset', () => {
    for (const layer of BUILD_LAYER_ORDER) {
      const offset = layerStartOffsetMs(layer);
      expect(Number.isFinite(offset)).toBe(true);
      expect(offset).toBeGreaterThanOrEqual(0);
    }
  });
});
