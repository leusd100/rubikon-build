import { deliveryModel } from '../data/deliveryModel';
import type {
  DeliveryFormat,
  DeliveryFormatId,
  DeliveryModel,
  DeliveryStage,
  EntryStateId,
  PerFormat,
  StageId,
} from '../types/deliveryModel';

// Read through the declared type: `as const` narrows the data to literal tuples, and
// `readonly ['Об’єкт під ключ']` cannot take an arbitrary string in `includes`.
const model: DeliveryModel = deliveryModel;

export function formatById(id: DeliveryFormatId): DeliveryFormat {
  const format = model.formats.find((item) => item.id === id);
  if (!format) throw new Error(`Unknown delivery format: ${id}`);
  return format;
}

export function stageById(id: StageId): DeliveryStage {
  const stage = model.stages.find((item) => item.id === id);
  if (!stage) throw new Error(`Unknown delivery stage: ${id}`);
  return stage;
}

export function forFormat<T>(value: PerFormat<T>, format: DeliveryFormatId): T {
  return value[format] ?? value.default;
}

/** The stage a visitor starts from, given what they already have. */
export function startStage(entry: EntryStateId): DeliveryStage {
  const state = model.entryStates.find((item) => item.id === entry);
  if (!state) throw new Error(`Unknown entry state: ${entry}`);
  return stageById(state.startStage);
}

/**
 * The format a stored «Формат співпраці» value means: a current label or an unambiguous pre-v1 one
 * («Об’єкт під ключ», «Окремий етап робіт»). «Підряд або субпідряд» covered two formats, so it maps
 * to null and stays as it is in D1 — as do an empty value and anything unknown.
 */
export function formatFromCooperation(value: string): DeliveryFormatId | null {
  const label = value.trim();
  if (!label) return null;
  const format = model.formats.find((item) => item.label === label || item.legacyCooperationLabels.includes(label));
  return format ? format.id : null;
}

function perFormatTexts(value: PerFormat<string>) {
  return Object.values(value).filter((text): text is string => typeof text === 'string');
}

/**
 * Every string the site may render from the model. Internal fields — `contractTerm`,
 * `legacyCooperationLabels`, `internalNote`, `legalLayer`, ids and anchors — are left out, which is
 * what lets a guard test hold public copy to the model's rules.
 */
export function publicTexts(source: DeliveryModel): readonly string[] {
  return [
    ...source.positioning.primary,
    ...source.positioning.secondary,
    ...source.formats.flatMap((format) => [format.label, format.summary, format.coordination, format.interfaces]),
    ...source.entryStates.map((state) => state.label),
    ...source.capabilities.flatMap((capability) => (capability.statement ? [capability.label, capability.statement] : [capability.label])),
    ...source.stages.flatMap((stage) => [
      stage.title,
      stage.what,
      ...perFormatTexts(stage.rubikon),
      ...perFormatTexts(stage.client),
      ...perFormatTexts(stage.involved),
      stage.result,
      stage.gate,
      stage.why,
      ...stage.documents.map((document) => document.label),
    ]),
    ...source.responsibility.flatMap((row) => (row.note ? [row.activity, row.note] : [row.activity])),
    source.changePolicy.principle,
    ...source.changePolicy.steps,
    ...source.changePolicy.notPromised,
    ...source.budgetFactors.map((factor) => factor.label),
    ...source.inputs.map((input) => input.label),
    ...Object.values(source.statements),
    source.contactRoles.constructionLead.title,
    source.contactRoles.constructionLead.cta,
  ];
}
