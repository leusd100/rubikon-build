import type { HangarAttachmentState } from './attachmentContract';
import {
  LIFTING_EQUIPMENT_ORDER,
  PROJECT_STATUS_ORDER,
  PURPOSE_ORDER,
  isBuildRegion,
  type ObjectProfile,
} from './objectProfile';
import { clampRidgeHeightM } from './parametricModel';
import {
  CLADDING_SYSTEM_ORDER,
  CONFIRMED_TOPICS,
  DEFAULT_CONFIGURATOR_STATE,
  DOOR_OPTIONS,
  ENVELOPE_LABELS,
  FOUNDATION_TYPE_ORDER,
  GATES_OPTIONS,
  GATE_TYPE_ORDER,
  SCOPE_ORDER,
  clampDimension,
  type ConfiguratorState,
} from './types';

// The configurator's draft (07.10): a B2B visitor moves between the drawing, their mail and the site, and a reload used
// to bring back the example and drop the brief from the form. The configuration, the open step and whether it is
// attached to the request are kept in this browser only — localStorage, never sent anywhere, no name or phone — for
// DRAFT_DAYS, and read back through the same bounds the controls keep: a stored value the configurator could not have
// produced is replaced by the example's, never trusted.

export const DRAFT_KEY = 'rubikon-hangar-draft';
const DRAFT_VERSION = 1;
const DRAFT_DAYS = 30;

export type HangarDraft = {
  configuration: ConfiguratorState;
  attached: boolean;
  step: number;
};

type Stored = { v: number; savedAt: number; configuration: unknown; attached: unknown; step: unknown };

const oneOf = <T>(options: readonly T[], value: unknown, fallback: T): T => (options.includes(value as T) ? (value as T) : fallback);
const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

function readObjectProfile(raw: unknown): ObjectProfile {
  const value = (raw ?? {}) as Partial<Record<keyof ObjectProfile, unknown>>;
  const fallback = DEFAULT_CONFIGURATOR_STATE.objectProfile;
  return {
    purpose: PURPOSE_ORDER.includes(value.purpose as ObjectProfile['purpose'] & string) ? (value.purpose as ObjectProfile['purpose']) : null,
    project: oneOf(PROJECT_STATUS_ORDER, value.project, fallback.project),
    region: typeof value.region === 'string' && isBuildRegion(value.region) ? value.region : fallback.region,
    lifting: oneOf(LIFTING_EQUIPMENT_ORDER, value.lifting, fallback.lifting),
  };
}

/** A stored configuration read through the controls' own bounds */
export function readConfiguration(raw: unknown): ConfiguratorState {
  const value = (raw ?? {}) as Partial<Record<keyof ConfiguratorState, unknown>>;
  const base = DEFAULT_CONFIGURATOR_STATE;
  const dims = (value.dimensions ?? {}) as Partial<Record<'width' | 'length' | 'height', unknown>>;
  const dimensions = {
    width: clampDimension('width', finite(dims.width) ? dims.width : base.dimensions.width),
    length: clampDimension('length', finite(dims.length) ? dims.length : base.dimensions.length),
    height: clampDimension('height', finite(dims.height) ? dims.height : base.dimensions.height),
  };
  const ridgeEdited = value.ridgeEdited === true;
  return {
    dimensions,
    ridgeHeightM: clampRidgeHeightM(finite(value.ridgeHeightM) ? value.ridgeHeightM : base.ridgeHeightM, dimensions.width, dimensions.height),
    ridgeEdited,
    envelope: oneOf(Object.keys(ENVELOPE_LABELS) as ConfiguratorState['envelope'][], value.envelope, base.envelope),
    wallSystem: oneOf(CLADDING_SYSTEM_ORDER, value.wallSystem, base.wallSystem),
    roofSystem: oneOf(CLADDING_SYSTEM_ORDER, value.roofSystem, base.roofSystem),
    foundationType: oneOf(FOUNDATION_TYPE_ORDER, value.foundationType, base.foundationType),
    scope: Array.isArray(value.scope) ? SCOPE_ORDER.filter((item) => (value.scope as unknown[]).includes(item)) : base.scope,
    gates: oneOf(GATES_OPTIONS, value.gates, base.gates),
    gateType: oneOf(GATE_TYPE_ORDER, value.gateType, base.gateType),
    doors: oneOf(DOOR_OPTIONS, value.doors, base.doors),
    objectProfile: readObjectProfile(value.objectProfile),
    confirmed: Array.isArray(value.confirmed) ? CONFIRMED_TOPICS.filter((topic) => (value.confirmed as unknown[]).includes(topic)) : [],
  };
}

/** The draft in this browser, if there is a recent one; null when there is none, or it cannot be read */
export function readDraft(stepCount: number): HangarDraft | null {
  try {
    const text = window.localStorage.getItem(DRAFT_KEY);
    if (!text) return null;
    const stored = JSON.parse(text) as Stored;
    if (stored?.v !== DRAFT_VERSION || !finite(stored.savedAt)) return null;
    if (Date.now() - stored.savedAt > DRAFT_DAYS * 24 * 3600 * 1000) {
      window.localStorage.removeItem(DRAFT_KEY);
      return null;
    }
    const step = finite(stored.step) ? Math.min(Math.max(Math.round(stored.step), 0), stepCount - 1) : 0;
    return { configuration: readConfiguration(stored.configuration), attached: stored.attached === true, step };
  } catch {
    return null;
  }
}

export function saveDraft(draft: HangarDraft) {
  try {
    const stored: Stored = { v: DRAFT_VERSION, savedAt: Date.now(), ...draft };
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(stored));
  } catch {
    // storage off (a private window, blocked site data): the configurator works as before, without a draft
  }
}

export function clearDraft() {
  try {
    window.localStorage.removeItem(DRAFT_KEY);
  } catch {
    // nothing stored to clear
  }
}

/** Whether an attachment state is the visitor's «attached» */
export const isAttachedState = (state: HangarAttachmentState) => state.status === 'attached';
