import type { ConfiguratorState, EnvelopeChoice, GatesCount } from './types';

// The normalized, always-JSON-serializable business object derived from ConfiguratorState.
// This is the layer both the summary and the scene model read from — neither reads raw
// ConfiguratorState directly, so a future object type (grain storage, etc.) only needs its own
// deriveDomainModel-equivalent, not changes to Summary/Scene consumers. It's also, by
// construction, the same shape a future "structured project brief" for lead handoff would need
// (see docs/configurator-poc.md §17/§N of the architecture recommendation) — kept plain data on
// purpose, no functions, nothing renderer-specific.

export type HangarDomainModel = {
  objectType: 'hangar';
  dimensions: { widthM: number; lengthM: number; heightM: number };
  envelope: EnvelopeChoice;
  // Resolved booleans, not a raw scope[] array — every consumer asks "is walls present?", not
  // "does the array contain the string 'walls'?". Resolving this once here means Summary/Scene
  // never re-implement the same `.includes()` check independently.
  scope: {
    foundation: boolean;
    frame: boolean;
    walls: boolean;
    roof: boolean;
  };
  gates: GatesCount;
  areaSqm: number;
};

export function deriveDomainModel(state: ConfiguratorState): HangarDomainModel {
  const { width, length, height } = state.dimensions;
  return {
    objectType: 'hangar',
    dimensions: { widthM: width, lengthM: length, heightM: height },
    envelope: state.envelope,
    scope: {
      foundation: state.scope.includes('foundation'),
      frame: state.scope.includes('frame'),
      walls: state.scope.includes('walls'),
      roof: state.scope.includes('roof'),
    },
    gates: state.gates,
    areaSqm: Math.round(width * length),
  };
}
