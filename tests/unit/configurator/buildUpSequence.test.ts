import { describe, expect, it } from 'vitest';
import {
  BUILD_LAYER_ORDER,
  BUILD_STAGE_ORDER,
  buildLayerForPrimitive,
  firstViewDurationMs,
  firstViewStageStartsMs,
  isStageReleased,
  layerStartOffsetMs,
  stageSpanMs,
  staggerDelayMs,
  totalSequenceDurationMs,
} from '../../../app/lib/configurator/buildUpSequence';
import { buildTechnicalScene } from '../../../app/lib/configurator/technicalSceneModel';
import { deriveDomainModel } from '../../../app/lib/configurator/domainModel';
import { DEFAULT_CONFIGURATOR_STATE, type ConfiguratorState } from '../../../app/lib/configurator/types';

function stateWith(overrides: Partial<ConfiguratorState>): ConfiguratorState {
  return { ...DEFAULT_CONFIGURATOR_STATE, ...overrides };
}

describe('buildUpSequence timing', () => {
  it('keeps the whole sequence within the ~3s ceiling regardless of hangar size', () => {
    expect(totalSequenceDurationMs()).toBeLessThanOrEqual(3000);
  });

  it('stages columns→rafters→purlins in sequence — the only layers that ever fire together', () => {
    const columns = layerStartOffsetMs('columns');
    const rafters = layerStartOffsetMs('rafters');
    const purlins = layerStartOffsetMs('purlins');
    expect(columns).toBe(0);
    expect(rafters).toBeGreaterThan(columns);
    expect(purlins).toBeGreaterThan(rafters);
  });

  it('gives every independently-triggered layer a zero start offset — nothing waits on a layer it was not triggered alongside', () => {
    // foundation/walls/roof/gates are each toggled by their own checkbox (or the gate count's
    // 0↔some transition); by the time a user acts on one, nothing else is "still building" for
    // it to wait on, regardless of where it sits in the naming convention BUILD_LAYER_ORDER
    // documents. This is the fix for a real bug caught live: an earlier version made unchecking
    // "walls" alone wait out foundation+columns+rafters+purlins' entire combined span first.
    for (const layer of ['foundation', 'walls', 'roof', 'gates'] as const) {
      expect(layerStartOffsetMs(layer)).toBe(0);
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
    const scene = buildTechnicalScene(domain);
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

describe('the first view (/angary, 03.10)', () => {
  it('requests the stages in the order a hangar is built, starting at once', () => {
    expect(BUILD_STAGE_ORDER).toEqual(['foundation', 'frame', 'walls', 'roof', 'gates']);
    const starts = firstViewStageStartsMs();
    expect(starts).toHaveLength(BUILD_STAGE_ORDER.length);
    expect(starts[0]).toBe(0);
  });

  it('hands each stage over while the one before it is still settling — one motion, not five fades', () => {
    const starts = firstViewStageStartsMs();
    for (let index = 1; index < starts.length; index += 1) {
      const previous = BUILD_STAGE_ORDER[index - 1];
      expect(starts[index]).toBeGreaterThan(starts[index - 1]);
      expect(starts[index]).toBeLessThan(starts[index - 1] + stageSpanMs(previous));
    }
  });

  it('takes about two and a half seconds, whatever the hangar', () => {
    expect(firstViewDurationMs()).toBeGreaterThanOrEqual(2000);
    expect(firstViewDurationMs()).toBeLessThanOrEqual(3000);
  });

  it('counts the whole columns → rafters → purlins sequence as the frame stage', () => {
    expect(stageSpanMs('frame')).toBe(totalSequenceDurationMs());
    for (const stage of ['foundation', 'walls', 'roof', 'gates'] as const) {
      expect(stageSpanMs(stage)).toBeGreaterThan(0);
      expect(stageSpanMs(stage)).toBeLessThan(stageSpanMs('frame'));
    }
  });

  it('holds back exactly the stages not yet requested', () => {
    expect(BUILD_STAGE_ORDER.map((stage) => isStageReleased(stage, 0))).toEqual([false, false, false, false, false]);
    expect(BUILD_STAGE_ORDER.map((stage) => isStageReleased(stage, 2))).toEqual([true, true, false, false, false]);
    expect(BUILD_STAGE_ORDER.every((stage) => isStageReleased(stage, BUILD_STAGE_ORDER.length))).toBe(true);
  });
});
