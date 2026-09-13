import type { DirectionId } from '../data/directions';

// RUBIKON Delivery Model: how RUBIKON BUILD works — formats of participation, who does which work,
// the eight stages, responsibility, documents and changes. Types only; the frozen content is
// app/data/deliveryModel.ts, the human-readable version docs/delivery-model.md.

/** Stable ids, stored by D1 and inquiry attachments. Labels may change; ids only in a major version. */
export type DeliveryFormatId = 'comprehensive' | 'work-package' | 'subcontract';
export type EntryStateId = 'task-only' | 'site-inputs' | 'concept' | 'design-docs';
export type StageId =
  | 'request'
  | 'inputs'
  | 'engineering'
  | 'scope-budget'
  | 'contract'
  | 'preparation'
  | 'construction'
  | 'handover';
export type CapabilityLayerId = 'core' | 'flexible' | 'partner';
export type CapabilityId =
  | 'steel'
  | 'roofing'
  | 'foundations'
  | 'envelope'
  | 'gates'
  | 'industrial-floors'
  | 'other-construction'
  | 'design'
  | 'mep'
  | 'ventilation'
  | 'landscaping'
  | 'process-equipment';
/** Who does a piece of work in a given format. */
export type Party = 'rubikon' | 'rubikon-coordinates' | 'partner' | 'client' | 'general-contractor';
/** Why a document appears: usually does, depends on the contract, on the project, or is required by law. */
export type DocumentBasis = 'typical' | 'contract' | 'project' | 'law';

/** Text that differs by format; `default` covers every format not listed. */
export type PerFormat<T> = { default: T } & Partial<Record<DeliveryFormatId, T>>;

export type DeliveryFormat = {
  id: DeliveryFormatId;
  label: string;
  /** Section anchor on /yak-pratsyuiemo, without '#'. */
  anchor: string;
  summary: string;
  /** Who coordinates the object. */
  coordination: string;
  /** Who answers for the interfaces between work packages. */
  interfaces: string;
  /** The contract term — internal until the lawyer confirms it; never rendered. */
  contractTerm?: { label: string; status: 'pending-legal' };
  /** Form and D1 values from before v1 that unambiguously mean this format. Internal. */
  legacyCooperationLabels: readonly string[];
};

/** «Що у вас уже є» — where a visitor enters the eight stages. Not a format. */
export type EntryState = { id: EntryStateId; label: string; startStage: StageId };

export type Capability = {
  id: CapabilityId;
  layer: CapabilityLayerId;
  label: string;
  /** Public sentence, quoted verbatim. */
  statement?: string;
  /** The competency page this work lives on. */
  directionId?: DirectionId;
  /** Never rendered. */
  internalNote?: string;
};

export type StageDocument = { label: string; basis: readonly DocumentBasis[] };

export type DeliveryStage = {
  id: StageId;
  /** '01' … '08' */
  number: string;
  title: string;
  what: string;
  rubikon: PerFormat<string>;
  client: PerFormat<string>;
  involved: PerFormat<string>;
  result: string;
  /** «Перехід далі, коли…» */
  gate: string;
  why: string;
  documents: readonly StageDocument[];
  /** Design runs through several stages as a thread, not a single point. */
  designThread: boolean;
  /** Formats in which the client's general contractor leads this stage. */
  ledByGeneralContractorIn: readonly DeliveryFormatId[];
};

export type ResponsibilityCell = readonly Party[] | 'contract-defined' | 'out-of-scope';

export type ResponsibilityRow = {
  id: string;
  activity: string;
  cells: Record<DeliveryFormatId, ResponsibilityCell>;
  note?: string;
  /** Legal layer: every format reads 'contract-defined' until the lawyer's review. */
  legalLayer?: true;
};

export type DeliveryModel = {
  /** Semver: patch for wording, minor for additions, major for taxonomy or ids. */
  version: string;
  frozenAt: string;
  positioning: { primary: readonly string[]; secondary: readonly string[] };
  formats: readonly DeliveryFormat[];
  entryStates: readonly EntryState[];
  capabilities: readonly Capability[];
  stages: readonly DeliveryStage[];
  responsibility: readonly ResponsibilityRow[];
  changePolicy: { principle: string; steps: readonly string[]; notPromised: readonly string[] };
  budgetFactors: readonly { id: string; label: string; group: 'object' | 'site' | 'organisation' }[];
  inputs: readonly { id: string; label: string }[];
  /** Public sentences, quoted verbatim by every page that needs them. */
  statements: {
    principle: string;
    team: string;
    design: string;
    flexiblePackages: string;
    materials: string;
    firstContact: string;
    experience: string;
    boundary: string;
  };
  contactRoles: { constructionLead: { title: string; cta: string } };
  /** Topics kept neutral until the lawyer's review. Internal; never rendered. */
  legalLayer: readonly { id: string; topic: string }[];
};
