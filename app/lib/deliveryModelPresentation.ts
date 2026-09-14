import { deliveryModel } from '../data/deliveryModel';
import type {
  CapabilityLayerId,
  DeliveryFormatId,
  DeliveryModel,
  DocumentBasis,
  EntryStateId,
  Party,
  PerFormat,
  ResponsibilityCell,
  StageId,
} from '../types/deliveryModel';
import type { DeliveryModelFaqAnswer } from '../types/directionPage';
import { formatById, stageById, startStage } from './deliveryModel';

// The shapes existing pages need, built from the Delivery Model so no page retypes a format
// label or a frozen statement. Call these from server components only and hand client components
// the resulting strings as props: importing them into a client module would ship the whole model
// in that bundle.

const model: DeliveryModel = deliveryModel;

const lowerFirst = (text: string) => text.charAt(0).toLocaleLowerCase('uk') + text.slice(1);

export type FormatCard = { id: DeliveryFormatId; number: string; title: string; text: string };

/** The three formats of participation, numbered in model order. */
export function formatCards(): readonly FormatCard[] {
  return model.formats.map((format, index) => ({
    id: format.id,
    number: String(index + 1).padStart(2, '0'),
    title: format.label,
    text: format.summary,
  }));
}

export type EntryPoint = { id: EntryStateId; label: string; startStageTitle: string; startNote?: string };

/** «Що у вас уже є»: where each entry state starts. A second axis, not a fourth format. */
export function entryPoints(): readonly EntryPoint[] {
  return model.entryStates.map((state) => ({
    id: state.id,
    label: state.label,
    startStageTitle: startStage(state.id).title,
    ...(state.startNote ? { startNote: state.startNote } : {}),
  }));
}

/** «Формат співпраці» options after «Ще не визначено». The value is the label, as the form stored before v1. */
export function cooperationOptions(): readonly string[] {
  return model.formats.map((format) => format.label);
}

/** The inquiry form's saved state: a confirmation, then the frozen first-contact statement verbatim. */
export function inquirySuccessMessage(): string {
  return `Дякуємо! Запит надіслано. ${model.statements.firstContact}`;
}

/**
 * The answer to a visitor asking for «під ключ»: their phrase stays in the question, the answer
 * uses the model's formats and the frozen boundary statement.
 */
export function turnkeyAnswer(): string {
  const comprehensive = formatById('comprehensive');
  const workPackage = formatById('work-package');
  const subcontract = formatById('subcontract');
  return [
    `Так, у форматі «${comprehensive.label}»: ${comprehensive.summary}`,
    `Якщо потрібна лише частина робіт — наприклад, каркас, фундамент чи покрівля, — беремо окремий пакет у форматі «${workPackage.label}» або «${subcontract.label}».`,
    model.statements.boundary,
  ].join(' ');
}

const modelFaqAnswers: Record<DeliveryModelFaqAnswer['deliveryModelAnswer'], () => string> = {
  turnkey: turnkeyAnswer,
};

/** An FAQ answer as text: plain answers pass through, model-owned ones are written from the model. */
export function faqAnswerText(answer: string | DeliveryModelFaqAnswer): string {
  return typeof answer === 'string' ? answer : modelFaqAnswers[answer.deliveryModelAnswer]();
}

// --- /yak-pratsyuiemo ---------------------------------------------------------------------------

export type FormatDetail = FormatCard & { anchor: string; coordination: string; interfaces: string };

/** Everything public about each format, with the model's anchor for its section. */
export function formatDetails(): readonly FormatDetail[] {
  return formatCards().map((card) => {
    const format = formatById(card.id);
    return { ...card, anchor: format.anchor, coordination: format.coordination, interfaces: format.interfaces };
  });
}

export type PerFormatRow = { formats: readonly string[]; text: string };

/**
 * A per-format text as rows of «which formats → which wording». Formats that share a wording share
 * a row; a row that covers every format carries no format labels at all.
 */
export function perFormatRows(value: PerFormat<string>): readonly PerFormatRow[] {
  const rows = new Map<string, string[]>();
  for (const format of model.formats) {
    const text = value[format.id] ?? value.default;
    rows.set(text, [...(rows.get(text) ?? []), format.label]);
  }
  return [...rows].map(([text, labels]) => ({ formats: labels.length === model.formats.length ? [] : labels, text }));
}

// How a document's basis reads: as a tag beside the document, and as the title of its group.
const BASIS: Record<DocumentBasis, { tag: string; title: string }> = {
  typical: { tag: 'типово', title: 'Типово' },
  contract: { tag: 'договір', title: 'Залежить від договору' },
  project: { tag: 'проєкт', title: 'Залежить від проєкту' },
  law: { tag: 'закон', title: 'Регулюється законодавством' },
};

/** A stage's anchor on /yak-pratsyuiemo. */
export function stageAnchor(id: StageId): string {
  return `etap-${stageById(id).number}`;
}

export type StageCard = {
  id: StageId;
  number: string;
  anchor: string;
  title: string;
  what: string;
  result: string;
  gate: string;
  why: string;
  rubikon: readonly PerFormatRow[];
  client: readonly PerFormatRow[];
  involved: readonly PerFormatRow[];
  documents: readonly { label: string; tags: readonly string[] }[];
  designThread: boolean;
  /** Labels of the formats in which the client's general contractor leads the stage. */
  ledByGeneralContractorIn: readonly string[];
};

/** The eight stages with every public field, per-format texts as rows and documents with their basis tags. */
export function stageCards(): readonly StageCard[] {
  return model.stages.map((stage) => ({
    id: stage.id,
    number: stage.number,
    anchor: stageAnchor(stage.id),
    title: stage.title,
    what: stage.what,
    result: stage.result,
    gate: stage.gate,
    why: stage.why,
    rubikon: perFormatRows(stage.rubikon),
    client: perFormatRows(stage.client),
    involved: perFormatRows(stage.involved),
    documents: stage.documents.map((document) => ({ label: document.label, tags: document.basis.map((basis) => BASIS[basis].tag) })),
    designThread: stage.designThread,
    ledByGeneralContractorIn: stage.ledByGeneralContractorIn.map((id) => formatById(id).label),
  }));
}

export type DesignThread = {
  statement: string;
  stages: readonly { number: string; title: string; anchor: string; documents: readonly string[] }[];
  change: string;
};

/**
 * Design as a thread through the route: the frozen design statement, the stages it runs through
 * with the documents that depend on the project, and where a change reaches the design during construction.
 */
export function designThread(): DesignThread {
  return {
    statement: model.statements.design,
    stages: model.stages
      .filter((stage) => stage.designThread)
      .map((stage) => ({
        number: stage.number,
        title: stage.title,
        anchor: stageAnchor(stage.id),
        documents: stage.documents.filter((document) => document.basis.includes('project')).map((document) => document.label),
      })),
    // «Оцінюємо вплив … якщо зачеплено проєкт — через проєктувальника»: the step where a change meets the design.
    change: deliveryModel.changePolicy.steps[1],
  };
}

const LAYER_TITLES: Record<CapabilityLayerId, string> = {
  core: 'Власне ядро',
  flexible: 'Гнучкі пакети',
  partner: 'Профільні партнери',
};

export type CapabilityLayer = {
  id: CapabilityLayerId;
  title: string;
  note?: string;
  items: readonly { id: string; text: string; href?: string }[];
};

/** Who does the work, layer by layer. Items read as their public statement and link to their competency page. */
export function capabilityLayers(): readonly CapabilityLayer[] {
  return (Object.keys(LAYER_TITLES) as CapabilityLayerId[]).map((layer) => ({
    id: layer,
    title: LAYER_TITLES[layer],
    ...(layer === 'flexible' ? { note: model.statements.flexiblePackages } : {}),
    items: model.capabilities
      .filter((capability) => capability.layer === layer)
      .map((capability) => ({
        id: capability.id,
        text: capability.statement ?? capability.label,
        ...(capability.directionId ? { href: `/${capability.directionId}` } : {}),
      })),
  }));
}

type Holder = Party | 'contract-defined' | 'out-of-scope';

// The groups of the per-format view, in reading order: RUBIKON first, then the others, then the
// contract and scope markers.
const HOLDERS: readonly (readonly [Holder, string])[] = [
  ['rubikon', 'RUBIKON виконує'],
  ['rubikon-coordinates', 'RUBIKON координує'],
  ['partner', 'Профільні партнери'],
  ['client', 'Замовник'],
  ['general-contractor', 'Генпідрядник замовника'],
  ['contract-defined', 'Визначається договором'],
  ['out-of-scope', 'Поза обсягом'],
];

export type ResponsibilityGroup = { holder: Holder; title: string; activities: readonly string[] };
export type FormatResponsibility = {
  id: DeliveryFormatId;
  anchor: string;
  label: string;
  coordination: string;
  interfaces: string;
  groups: readonly ResponsibilityGroup[];
};

function holds(cell: ResponsibilityCell, holder: Holder): boolean {
  return typeof cell === 'string' ? cell === holder : cell.includes(holder as Party);
}

/** The responsibility matrix read one format at a time: each activity under whoever holds it. */
export function responsibilityByFormat(): readonly FormatResponsibility[] {
  return model.formats.map((format) => ({
    id: format.id,
    anchor: `vidpovidalnist-${format.anchor}`,
    label: format.label,
    coordination: format.coordination,
    interfaces: format.interfaces,
    groups: HOLDERS.map(([holder, title]) => ({
      holder,
      title,
      activities: model.responsibility.filter((row) => holds(row.cells[format.id], holder)).map((row) => row.activity),
    })).filter((group) => group.activities.length > 0),
  }));
}

/** The matrix notes: the «або», «залежно» and scope nuances the grouped view cannot carry. */
export function responsibilityNotes(): readonly { activity: string; note: string }[] {
  return model.responsibility.flatMap((row) => (row.note ? [{ activity: row.activity, note: row.note }] : []));
}

export type DocumentGroup = { basis: DocumentBasis; title: string; documents: readonly { label: string; stage: string }[] };

/** Every stage document grouped by what it depends on; a document with several bases sits in each group. */
export function documentGroups(): readonly DocumentGroup[] {
  return (Object.keys(BASIS) as DocumentBasis[]).map((basis) => ({
    basis,
    title: BASIS[basis].title,
    documents: model.stages.flatMap((stage) =>
      stage.documents
        .filter((document) => document.basis.includes(basis))
        .map((document) => ({ label: document.label, stage: `${stage.number} ${stage.title}` })),
    ),
  }));
}

const BUDGET_GROUP_TITLES = { object: 'Об’єкт', site: 'Майданчик', organisation: 'Організація робіт' } as const;
type BudgetGroupId = keyof typeof BUDGET_GROUP_TITLES;

/** The budget and timeline factors, grouped by object, site and organisation. */
export function budgetGroups(): readonly { id: BudgetGroupId; title: string; factors: readonly string[] }[] {
  return (Object.keys(BUDGET_GROUP_TITLES) as BudgetGroupId[]).map((id) => ({
    id,
    title: BUDGET_GROUP_TITLES[id],
    factors: model.budgetFactors.filter((factor) => factor.group === id).map((factor) => factor.label),
  }));
}

/** What is needed at the start. */
export function startInputs(): readonly string[] {
  return model.inputs.map((input) => input.label);
}

/** The /yak-pratsyuiemo FAQ: real doubts of a B2B client, answered only in the model's words. */
export function deliveryFaq(): readonly (readonly [string, string])[] {
  const workPackage = formatById('work-package');
  const entries = entryPoints();
  const route = entries.map((entry) => `${lowerFirst(entry.label)} — старт з етапу «${entry.startStageTitle}»`).join('; ');
  const startNotes = entries.flatMap((entry) => (entry.startNote ? [entry.startNote] : []));
  const { statements } = model;
  const { changePolicy } = deliveryModel;
  return [
    ['Чи обов’язково мати готовий проєкт?', [`Ні. Не обов’язково починати з нуля — маршрут залежить від того, що вже підготовлено: ${route}.`, ...startNotes].join(' ')],
    ['Чи можна замовити лише один пакет робіт?', `Так, у форматі «${workPackage.label}»: ${workPackage.summary} ${workPackage.interfaces}`],
    ['Хто залучає проєктувальника?', statements.design],
    ['Чи працюєте ви із субпідрядниками?', `Так. ${statements.team} ${statements.principle}`],
    ['Хто закуповує матеріали?', statements.materials],
    ['Як погоджуються зміни?', `${changePolicy.principle} ${changePolicy.steps[2]}`],
  ];
}
