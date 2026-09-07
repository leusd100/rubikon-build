import type { CladdingSystem, ConfiguratorState, ScopeItem } from './types';

export type HangarPresentationDemoKind = 'frame' | 'profiled-sheet' | 'sandwich-panel';

export type HangarPresentationDemo = {
  kind: HangarPresentationDemoKind;
  label: string;
  configuration: ConfiguratorState;
};

const DEMO_LABELS: Record<HangarPresentationDemoKind, string> = {
  frame: 'Показ каркаса',
  'profiled-sheet': 'Показ огородження · профнастил',
  'sandwich-panel': 'Показ огородження · сендвіч-панель',
};

function withRequiredScope(scope: ScopeItem[], required: ScopeItem[]): ScopeItem[] {
  const result = [...scope];
  for (const item of required) {
    if (!result.includes(item)) result.push(item);
  }
  return result;
}

/**
 * Builds a temporary presentation of the customer's current object. The returned configuration
 * is consumed by the existing preview only; controls, summary, attachment and lead payload keep
 * reading the authoritative business configuration from HangarInquiryContext.
 */
export function createHangarPresentationDemo(
  kind: HangarPresentationDemoKind,
  businessConfiguration: ConfiguratorState,
): HangarPresentationDemo {
  if (kind === 'frame') {
    return {
      kind,
      label: DEMO_LABELS[kind],
      configuration: {
        ...businessConfiguration,
        scope: ['frame'],
      },
    };
  }

  const system: CladdingSystem = kind === 'sandwich-panel' ? 'sandwich-panel' : 'profiled-sheet';
  return {
    kind,
    label: DEMO_LABELS[kind],
    configuration: {
      ...businessConfiguration,
      envelope: system === 'sandwich-panel' ? 'insulated' : 'cold',
      wallSystem: system,
      roofSystem: system,
      scope: withRequiredScope(businessConfiguration.scope, ['frame', 'walls', 'roof']),
    },
  };
}

export function alternativeCladdingDemo(configuration: ConfiguratorState): CladdingSystem {
  return configuration.wallSystem === 'profiled-sheet' && configuration.roofSystem === 'profiled-sheet'
    ? 'sandwich-panel'
    : 'profiled-sheet';
}
