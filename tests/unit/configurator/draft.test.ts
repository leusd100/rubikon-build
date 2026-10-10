import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DRAFT_KEY, clearDraft, isAttachedState, readConfiguration, readDraft, saveDraft } from '../../../app/lib/configurator/draft';
import { DEFAULT_CONFIGURATOR_STATE, type ConfiguratorState } from '../../../app/lib/configurator/types';

// The configurator's draft (07.10): kept in this browser only, for 30 days, and read back through the controls' bounds

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); },
    values,
  };
}

const OWN: ConfiguratorState = {
  ...DEFAULT_CONFIGURATOR_STATE,
  dimensions: { width: 30, length: 72, height: 9 },
  envelope: 'insulated',
  wallSystem: 'sandwich-panel',
  roofSystem: 'sandwich-panel',
  gates: 2,
  confirmed: ['dimensions', 'envelope'],
  scopeMode: 'partial',
  scope: ['frame', 'walls'],
  objectProfile: { purpose: 'storage', project: 'none', region: 'Київська область', lifting: 'none', temperature: 'unknown' },
};

describe('the configurator draft', () => {
  let storage: ReturnType<typeof memoryStorage>;
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-08T12:00:00Z'));
    storage = memoryStorage();
    vi.stubGlobal('window', { localStorage: storage });
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('gives back what was saved: the configuration, the step and whether it is attached', () => {
    saveDraft({ configuration: OWN, attached: true, step: 3 });
    expect(readDraft(5)).toEqual({ configuration: OWN, attached: true, step: 3 });
  });

  it('has none when nothing was saved, and forgets one cleared', () => {
    expect(readDraft(5)).toBeNull();
    saveDraft({ configuration: OWN, attached: false, step: 1 });
    clearDraft();
    expect(readDraft(5)).toBeNull();
  });

  it('is forgotten after 30 days', () => {
    saveDraft({ configuration: OWN, attached: false, step: 1 });
    vi.advanceTimersByTime(31 * 24 * 3600 * 1000);
    expect(readDraft(5)).toBeNull();
    expect(storage.values.has(DRAFT_KEY)).toBe(false);
  });

  it('reads nothing from another version, a broken record or blocked storage', () => {
    storage.setItem(DRAFT_KEY, JSON.stringify({ v: 2, savedAt: Date.now(), configuration: OWN, attached: true, step: 0 }));
    expect(readDraft(5)).toBeNull();
    storage.setItem(DRAFT_KEY, '{not json');
    expect(readDraft(5)).toBeNull();
    vi.stubGlobal('window', { get localStorage() { throw new Error('blocked'); } });
    expect(readDraft(5)).toBeNull();
    expect(() => saveDraft({ configuration: OWN, attached: true, step: 0 })).not.toThrow();
    expect(() => clearDraft()).not.toThrow();
  });

  it('keeps the step inside the steps there are', () => {
    storage.setItem(DRAFT_KEY, JSON.stringify({ v: 1, savedAt: Date.now(), configuration: OWN, attached: 'yes', step: 9 }));
    expect(readDraft(5)).toMatchObject({ step: 4, attached: false });
    storage.setItem(DRAFT_KEY, JSON.stringify({ v: 1, savedAt: Date.now(), configuration: OWN, attached: true, step: 'two' }));
    expect(readDraft(5)?.step).toBe(0);
  });
});

describe('a stored configuration is read through the controls’ bounds', () => {
  it('replaces what the configurator could not have produced with the example’s value', () => {
    const read = readConfiguration({
      dimensions: { width: 999, length: 'long', height: -3 },
      ridgeHeightM: 99,
      envelope: 'warm',
      wallSystem: 'brick',
      gates: 7,
      scope: ['roof', 'basement', 'frame'],
      confirmed: ['dimensions', 'colour'],
      scopeMode: 'all',
      objectProfile: { purpose: 'spaceport', project: 'ready', region: 'Atlantis', lifting: 'none' },
      sizesUnknown: 'yes',
    });
    expect(read.dimensions.width).toBe(50);
    expect(read.dimensions.length).toBe(DEFAULT_CONFIGURATOR_STATE.dimensions.length);
    expect(read.dimensions.height).toBeGreaterThan(0);
    expect(read.ridgeHeightM).toBeLessThan(99);
    expect(read.envelope).toBe(DEFAULT_CONFIGURATOR_STATE.envelope);
    expect(read.wallSystem).toBe(DEFAULT_CONFIGURATOR_STATE.wallSystem);
    expect(read.gates).toBe(DEFAULT_CONFIGURATOR_STATE.gates);
    // the known works in their reading order, the unknown dropped
    expect(read.scope).toEqual(['frame', 'roof']);
    expect(read.confirmed).toEqual(['dimensions']);
    expect(read.scopeMode).toBe(DEFAULT_CONFIGURATOR_STATE.scopeMode);
    expect(read.objectProfile).toEqual({ purpose: null, project: 'ready', region: DEFAULT_CONFIGURATOR_STATE.objectProfile.region, lifting: 'none', temperature: 'unknown' });
    expect(read.sizesUnknown).toBe(false);
  });

  it('reads nothing at all as the untouched example', () => {
    expect(readConfiguration(undefined)).toEqual(DEFAULT_CONFIGURATOR_STATE);
  });

  it('tells an attached state', () => {
    expect(isAttachedState({ status: 'attached' } as Parameters<typeof isAttachedState>[0])).toBe(true);
    expect(isAttachedState({ status: 'detached' } as Parameters<typeof isAttachedState>[0])).toBe(false);
  });
});
