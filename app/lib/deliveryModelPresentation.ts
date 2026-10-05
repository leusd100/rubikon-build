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

/** The inquiry form's saved state: a confirmation, then what the frozen first-contact statement says happens next —
 *  verbatim, without its opening request («Розкажіть, що потрібно побудувати…»), which after sending asked the
 *  visitor to tell it all again (UX review 2026-10). */
export function inquirySuccessMessage(): string {
  const next = model.statements.firstContact.replace(/^[^.!?]*[.!?]\s*/, '');
  return `Дякуємо! Запит надіслано. ${next}`;
}

/**
 * The answer to a visitor asking for «під ключ»: their phrase stays in the question, the answer
 * uses the model's formats and the frozen boundary statement.
 */
export function turnkeyAnswer(): string {
  const comprehensive = formatById('comprehensive');
  return [
    `Можемо взяти на себе погоджений комплекс будівельних робіт і відповідати за його результат — формат «${comprehensive.label}».`,
    'Проєкт та дозволи замовник забезпечує окремо.',
    'Якщо потрібні спеціалізовані системи, узгодимо з вами, як будівельні роботи мають врахувати їхні вимоги.',
    'Склад робіт і відповідальність кожного учасника погоджуємо до початку робіт.',
    'Роботи, які замовник замовляє окремо, залишаються поза погодженим обсягом RUBIKON.',
  ].join(' ');
}

const modelFaqAnswers: Record<DeliveryModelFaqAnswer['deliveryModelAnswer'], () => string> = {
  turnkey: turnkeyAnswer,
  // A hangar buyer's first questions (UX review 2026-10): who designs, who buys the materials
  design: () => model.statements.design,
  materials: () => model.statements.materials,
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

export type FormatToken = { id: DeliveryFormatId; number: string; label: string; anchor: string };

/**
 * The presentation tokens 01 / 02 / 03 — the formats' own card numbers — that stand for a format
 * wherever a text repeats per format, so the long names are read once, in the legend.
 */
export function formatTokens(): readonly FormatToken[] {
  return formatCards().map((card) => ({ id: card.id, number: card.number, label: card.title, anchor: formatById(card.id).anchor }));
}

export type PerFormatRow = { formats: readonly FormatToken[]; text: string };

/**
 * A per-format text as rows of «which formats → which wording». Formats that share a wording share
 * a row; a row that covers every format carries no format tokens at all.
 */
export function perFormatRows(value: PerFormat<string>): readonly PerFormatRow[] {
  const tokens = formatTokens();
  const rows = new Map<string, FormatToken[]>();
  for (const token of tokens) {
    const text = value[token.id] ?? value.default;
    rows.set(text, [...(rows.get(text) ?? []), token]);
  }
  return [...rows].map(([text, formats]) => ({ formats: formats.length === tokens.length ? [] : formats, text }));
}

// How a document's basis reads: as a tag beside the document, and as the title of its group.
const BASIS: Record<DocumentBasis, { tag: string; title: string }> = {
  typical: { tag: 'типово', title: 'Типово' },
  contract: { tag: 'договір', title: 'Залежить від договору' },
  project: { tag: 'проєкт', title: 'Залежить від проєкту' },
  law: { tag: 'закон', title: 'Регулюється законодавством' },
};

export type BasisBadge = { basis: DocumentBasis; tag: string; title: string };

const basisBadge = (basis: DocumentBasis): BasisBadge => ({ basis, tag: BASIS[basis].tag, title: BASIS[basis].title });

/** The four document bases, in the order their badges are explained. */
export function basisLegend(): readonly BasisBadge[] {
  return (Object.keys(BASIS) as DocumentBasis[]).map(basisBadge);
}

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
  documents: readonly { label: string; badges: readonly BasisBadge[] }[];
  designThread: boolean;
  /** Labels of the formats in which the client's general contractor leads the stage. */
  ledByGeneralContractorIn: readonly string[];
};

/** The eight stages with every public field, per-format texts as rows and documents with their basis badges. */
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
    documents: stage.documents.map((document) => ({ label: document.label, badges: document.basis.map(basisBadge) })),
    designThread: stage.designThread,
    ledByGeneralContractorIn: stage.ledByGeneralContractorIn.map((id) => formatById(id).label),
  }));
}

export type DesignThread = {
  statement: string;
  stages: readonly { number: string; title: string; anchor: string; documents: readonly string[] }[];
  change: string;
  /**
   * The eight stages as a mini-route. Only the model's design-thread stages are marked: the change
   * policy is not tied to a stage in the model, so the page does not place it on the route.
   */
  route: readonly { number: string; design: boolean }[];
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
    route: model.stages.map((stage) => ({ number: stage.number, design: stage.designThread })),
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

/** /pro-nas «Що робимо самі, а що організовуємо»: the three capability layers under the client's words (the layer names
 *  stay internal). Each work keeps its label and, where the model has one, its public statement and competency page;
 *  `short` is the label without a tail that only repeats the group's own title. */
const LEDGER_TITLES: Record<CapabilityLayerId, string> = {
  core: 'Виконуємо власною командою',
  flexible: 'Організовуємо під проєкт',
  partner: 'Профільні виконавці або замовник',
};

export type CapabilityLedgerColumn = {
  id: CapabilityLayerId;
  title: string;
  note?: string;
  items: readonly { id: string; label: string; short: string; statement?: string; href?: string }[];
};

/** «Земляні роботи — організовуємо під проєкт із потрібною технікою» under «Організовуємо під проєкт» is «Земляні
 *  роботи»; a tail that says something the title does not («Благоустрій — погоджений виконавець або замовник») stays. */
function shortLabel(label: string, title: string) {
  const [name, tail] = label.split(/\s—\s/);
  return tail?.toLowerCase().startsWith(title.toLowerCase()) ? name : label;
}

export function capabilityLedger(): readonly CapabilityLedgerColumn[] {
  return (Object.keys(LEDGER_TITLES) as CapabilityLayerId[]).map((layer) => ({
    id: layer,
    title: LEDGER_TITLES[layer],
    ...(layer === 'flexible' ? { note: model.statements.flexiblePackages } : {}),
    items: model.capabilities
      .filter((capability) => capability.layer === layer)
      .map((capability) => ({
        id: capability.id,
        label: capability.label,
        short: shortLabel(capability.label, LEDGER_TITLES[layer]),
        ...(capability.statement ? { statement: capability.statement } : {}),
        ...(capability.directionId ? { href: `/${capability.directionId}` } : {}),
      })),
  }));
}

type Holder = Party | 'contract-defined' | 'out-of-scope';
type ResponsibilityRow = DeliveryModel['responsibility'][number];

// Who holds an activity, in reading order: RUBIKON first, then the others, then the contract and
// scope markers.
const HOLDERS: readonly (readonly [Holder, string])[] = [
  ['rubikon', 'RUBIKON виконує'],
  ['rubikon-coordinates', 'RUBIKON координує'],
  ['rubikon-organizes', 'RUBIKON організовує'],
  ['partner', 'Профільні партнери'],
  ['client', 'Замовник'],
  ['general-contractor', 'Генпідрядник замовника'],
  ['contract-defined', 'Визначається договором'],
  ['out-of-scope', 'Поза обсягом'],
];

export type HolderLabel = { holder: Holder; title: string };
export type ResponsibilityActivity = { activity: string; note?: number };
export type SharedResponsibility = { title: string; holders: readonly HolderLabel[]; activities: readonly ResponsibilityActivity[] };
export type ComparedResponsibility = ResponsibilityActivity & { cells: readonly { format: FormatToken; holders: readonly HolderLabel[] }[] };
export type FormatResponsibility = FormatToken & {
  panel: string;
  rows: readonly (ResponsibilityActivity & { holders: readonly HolderLabel[] })[];
};
export type ResponsibilityComparison = {
  shared: readonly SharedResponsibility[];
  compared: readonly ComparedResponsibility[];
  byFormat: readonly FormatResponsibility[];
  notes: readonly { number: number; activity: string; note: string }[];
};

function holdersOf(cell: ResponsibilityCell): HolderLabel[] {
  return HOLDERS.filter(([holder]) => (typeof cell === 'string' ? cell === holder : cell.includes(holder as Party))).map(([holder, title]) => ({ holder, title }));
}

const holderKey = (holders: readonly HolderLabel[]) => holders.map((label) => label.holder).join('+');

/**
 * The responsibility matrix, regrouped for reading without changing a cell. Activities whose holders
 * are the same in every format are listed once; the others are compared format by format — as a
 * matrix on wide screens and, on phones, one format at a time: that format's column of the matrix. The notes are numbered in model order
 * and each activity that has one carries its number.
 */
export function responsibilityComparison(): ResponsibilityComparison {
  const tokens = formatTokens();
  const notes = model.responsibility
    .flatMap((row) => (row.note ? [{ id: row.id, activity: row.activity, note: row.note }] : []))
    .map((item, index) => ({ ...item, number: index + 1 }));
  const activityOf = (row: ResponsibilityRow): ResponsibilityActivity => {
    const note = notes.find((item) => item.id === row.id)?.number;
    return note ? { activity: row.activity, note } : { activity: row.activity };
  };
  // Every format is compared against the first one; a row is shared when none of them differs.
  const reference = (row: ResponsibilityRow) => holdersOf(row.cells.comprehensive);
  const isShared = (row: ResponsibilityRow) => tokens.every((token) => holderKey(holdersOf(row.cells[token.id])) === holderKey(reference(row)));

  const shared = new Map<string, { title: string; holders: HolderLabel[]; activities: ResponsibilityActivity[] }>();
  for (const row of model.responsibility.filter(isShared)) {
    const holders = reference(row);
    const group = shared.get(holderKey(holders)) ?? { title: holders.map((label) => label.title).join(' · '), holders, activities: [] };
    group.activities.push(activityOf(row));
    shared.set(holderKey(holders), group);
  }
  const compared = model.responsibility.filter((row) => !isShared(row));

  return {
    shared: [...shared.values()],
    compared: compared.map((row) => ({ ...activityOf(row), cells: tokens.map((format) => ({ format, holders: holdersOf(row.cells[format.id]) })) })),
    byFormat: tokens.map((format) => ({
      ...format,
      panel: `vidpovidalnist-${format.anchor}`,
      rows: compared.map((row) => ({ ...activityOf(row), holders: holdersOf(row.cells[format.id]) })),
    })),
    notes: notes.map(({ number, activity, note }) => ({ number, activity, note })),
  };
}

// The phases the documents are read in: the stages up to the contract together, then each later
// stage on its own. A phase without a title takes its stage's title.
const DOCUMENT_PHASES: readonly { from: StageId; to: StageId; title?: string }[] = [
  { from: 'request', to: 'contract', title: 'Від запиту до договору' },
  { from: 'preparation', to: 'preparation' },
  { from: 'construction', to: 'construction' },
  { from: 'handover', to: 'handover' },
];

export type RouteDocument = { label: string; stage: { number: string; title: string; anchor: string }; badges: readonly BasisBadge[] };
export type DocumentPhase = { id: string; title: string; range: string; documents: readonly RouteDocument[] };

/** Every stage document once, in route order, grouped by phase and badged with each basis it depends on. */
export function documentRoute(): readonly DocumentPhase[] {
  const index = (id: StageId) => model.stages.findIndex((stage) => stage.id === id);
  return DOCUMENT_PHASES.map((phase) => {
    const first = stageById(phase.from);
    const last = stageById(phase.to);
    return {
      id: `dokumenty-${first.number}`,
      title: phase.title ?? first.title,
      range: first.number === last.number ? first.number : `${first.number}–${last.number}`,
      documents: model.stages.slice(index(phase.from), index(phase.to) + 1).flatMap((stage) =>
        stage.documents.map((document) => ({
          label: document.label,
          stage: { number: stage.number, title: stage.title, anchor: stageAnchor(stage.id) },
          badges: document.basis.map(basisBadge),
        })),
      ),
    };
  });
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

/** The /yak-pratsyuiemo FAQ: only what a first-time client still asks after reading the page. A direct answer first,
 *  one clarification after; every fact is the model's (team, boundary, the inputs stage, the handover documents). */
export function deliveryFaq(): readonly (readonly [string, string])[] {
  const { statements } = model;
  const handover = stageById('handover');
  const documents = handover.documents.map((document) => document.label.toLowerCase());
  return [
    ['Хто закуповує матеріали?', statements.materials],
    ['Чи залучаєте інших виконавців?', 'Так. Спеціалізовані роботи виконують профільні виконавці. Хто їх залучає й координує і за який результат відповідає RUBIKON, фіксуємо в договорі до початку робіт.'],
    ['Чи оглядаєте майданчик перед розрахунком?', 'Так, якщо умови майданчика впливають на розрахунок. Спершу даємо перелік потрібних даних під ваш тип об’єкта, далі погоджуємо огляд і фіксуємо умови.'],
    [
      'Як відбувається приймання і які документи я отримаю?',
      `Перевіряємо свої роботи, усуваємо зауваження й передаємо їх на приймання — замовнику, а в субпідряді генпідряднику. Зазвичай це ${documents[0]}, ${documents[1]} та ${documents[2]}; точний склад визначає договір.`,
    ],
  ];
}

// ---------------------------------------------------------------------------------------------------------------------
// The public /yak-pratsyuiemo projection (v2): the same truth as above, told as what happens with the client's task.
// Four steps instead of eight stages, the three formats as client choices, and one map of who answers for what. Each
// item names the model stages or responsibility rows it stands for, so tests can hold it to the model.

export type ProcessStep = { number: string; title: string; text: string; result: string; stages: readonly StageId[] };

/** Four client-facing steps covering the eight model stages in order. Each result is the client's side of the last
 *  covered stages' results — what is settled and what the next step needs — and never promises beyond them. */
export function processSteps(): readonly ProcessStep[] {
  const steps: readonly Omit<ProcessStep, 'number'>[] = [
    {
      title: 'Уточнюємо задачу',
      text: 'Розбираємо, що потрібно побудувати або виконати, де розташований об’єкт, що вже підготовлено і які є обмеження.',
      result: 'Коротко зафіксована задача й список даних, які потрібно додати.',
      stages: ['request'],
    },
    {
      title: 'Перевіряємо проєкт і дані про об’єкт',
      text: 'Переглядаємо креслення або параметри об’єкта, за потреби — умови майданчика, й узгоджуємо рішення для робіт, які беремо на себе.',
      result: 'Зрозуміло, на чому можна будувати пропозицію і що ще треба уточнити.',
      stages: ['inputs', 'engineering'],
    },
    {
      title: 'Узгоджуємо обсяг і кошторис',
      text: 'Визначаємо, які роботи бере на себе RUBIKON, і рахуємо їх, коли проєктних даних достатньо.',
      result: 'Пропозиція з переліком наших робіт, умовами старту й кошторисом. Після погодження — договір.',
      stages: ['scope-budget', 'contract'],
    },
    {
      title: 'Виконуємо та передаємо роботи',
      text: 'Готуємо матеріали й виконавців, виконуємо погоджені роботи у взаємодії з іншими учасниками й передаємо результат.',
      result: 'Прийняті роботи, акти й виконавча документація — у складі, погодженому договором.',
      stages: ['preparation', 'construction', 'handover'],
    },
  ];
  return steps.map((step, index) => ({ ...step, number: String(index + 1).padStart(2, '0') }));
}

export type ParticipationChoice = {
  id: DeliveryFormatId;
  /** The model name — the same in the form, on /napryamky and in the responsibility switcher. */
  title: string;
  /** The same format said as the client's situation. */
  headline: string;
  text: string;
  coordination: string;
  /** Who signs with RUBIKON, and who coordinates the object — the two things that tell the formats apart. */
  contractWith: 'Замовник' | 'Генпідрядник';
  coordinator: string;
  rubikonCoordinates: boolean;
};

const CHOICE_TERMS: Record<DeliveryFormatId, Pick<ParticipationChoice, 'headline' | 'contractWith' | 'coordinator' | 'rubikonCoordinates'>> = {
  comprehensive: { headline: 'Комплекс робіт під координацією RUBIKON', contractWith: 'Замовник', coordinator: 'RUBIKON — у погодженому обсязі', rubikonCoordinates: true },
  'work-package': { headline: 'Окремі роботи за договором із замовником', contractWith: 'Замовник', coordinator: 'Замовник або його генпідрядник', rubikonCoordinates: false },
  subcontract: { headline: 'Роботи за договором із генпідрядником', contractWith: 'Генпідрядник', coordinator: 'Генпідрядник', rubikonCoordinates: false },
};

/** After «Координує об’єкт» on the map: the qualifier the model's coordination sentence carries for that format. */
const COORDINATOR_NOTE: Record<DeliveryFormatId, string> = {
  comprehensive: 'у погодженому обсязі',
  'work-package': 'сам або через свого генпідрядника',
  subcontract: '',
};

/** The three formats as a client's choice, largest scope first; names, texts and coordination are the model's. */
export function participationChoices(): readonly ParticipationChoice[] {
  return model.formats.map((format) => ({
    id: format.id,
    title: format.label,
    text: format.summary,
    coordination: format.coordination,
    ...CHOICE_TERMS[format.id],
  }));
}

type MapItem = { text: string; rows: readonly string[] };
export type ResponsibilityArea = { id: 'rubikon' | 'client' | 'specialists'; title: string; lead: string; items: readonly MapItem[] };

/** Who answers for what, as three areas instead of a matrix. Rows are ids of `deliveryModel.responsibility`. */
export function responsibilityMap(): { principle: string; areas: readonly ResponsibilityArea[]; boundary: string; materials: string } {
  const { statements } = model;
  const core = model.capabilities.filter((capability) => capability.layer === 'core').map((capability) => capability.label.toLowerCase());
  return {
    principle: statements.responsibility,
    areas: [
      {
        id: 'rubikon',
        title: 'RUBIKON',
        lead: 'Погоджений будівельний обсяг і його результат.',
        items: [
          { text: `Власні роботи: ${core.join(', ')}`, rows: ['steel', 'roofing', 'foundations'] },
          { text: 'Організація виконання й узгодження робіт у погодженому обсязі', rows: ['interfaces', 'steel-fabrication'] },
          { text: 'Кошторис на погоджений обсяг', rows: ['estimate'] },
          { text: 'Контроль якості своїх робіт', rows: ['quality-control'] },
        ],
      },
      {
        id: 'client',
        title: 'Замовник',
        lead: 'Те, що залишається на боці замовника.',
        items: [
          { text: 'Проєкт — самостійно або через окремого проєктувальника', rows: ['design'] },
          { text: 'Вихідні дані й доступ до майданчика', rows: ['site-inputs'] },
          { text: 'Дозволи й введення в експлуатацію', rows: ['permits'] },
          { text: 'Зовнішні мережі й підключення', rows: ['external-utilities'] },
          { text: 'Приймання робіт', rows: ['acceptance'] },
        ],
      },
      {
        id: 'specialists',
        title: 'Профільні спеціалісти',
        lead: 'Вузькі дисципліни, які виконують фахівці свого профілю.',
        items: [
          { text: 'Проєктування — проєктувальник замовника', rows: ['design'] },
          { text: 'Електрика, вода, каналізація, опалення й вентиляція', rows: ['engineering-systems'] },
          { text: 'Спеціальне технологічне обладнання', rows: ['process-equipment'] },
          { text: 'Вишукування, технічний і авторський нагляд', rows: ['surveys', 'supervision'] },
        ],
      },
    ],
    boundary: statements.boundary,
    materials: statements.materials,
  };
}

export type CostFactor = { title: string; detail?: string; ids: readonly string[] };

/** What drives cost and time, as seven scannable factors covering all thirteen model factors once. */
export function costFactors(): readonly CostFactor[] {
  const groups: readonly { title: string; ids: readonly string[] }[] = [
    { title: 'Габарити', ids: ['dimensions'] },
    { title: 'Конструктив і навантаження', ids: ['structure', 'loads'] },
    { title: 'Фундамент', ids: ['foundation'] },
    { title: 'Утеплення', ids: ['insulation'] },
    { title: 'Технологія й обладнання', ids: ['technology', 'special-equipment'] },
    { title: 'Умови майданчика', ids: ['logistics', 'operating-facility', 'site-access', 'installation-constraints'] },
    { title: 'Залежності від інших робіт і строки', ids: ['timeline', 'contractor-dependencies'] },
  ];
  const label = (id: string) => {
    const factor = model.budgetFactors.find((item) => item.id === id);
    if (!factor) throw new Error(`Unknown budget factor: ${id}`);
    return factor.label;
  };
  return groups.map((group) => ({
    title: group.title,
    ids: group.ids,
    detail: group.ids.length > 2 ? group.ids.map(label).join(', ').toLowerCase() : undefined,
  }));
}

export type ChangeStep = { title: string; detail: string };

/** The model's change procedure (changePolicy.steps) as four short steps: a verb-first title and the rest of the step. */
export function changeSteps(): readonly ChangeStep[] {
  const steps: readonly ChangeStep[] = [
    { title: 'Фіксуємо зміну', detail: 'Хто ініціював, що змінюється і чому.' },
    { title: 'Оцінюємо вплив', detail: 'На роботи, вартість, строки, взаємодію з іншими виконавцями й проєктні документи. Якщо зачеплено проєкт — залучаємо проєктувальника.' },
    { title: 'Погоджуємо письмово', detail: 'До виконання — у формі, яку визначає договір.' },
    { title: 'Виконуємо', detail: 'І відображаємо зміну в документах приймання.' },
  ];
  if (steps.length !== model.changePolicy.steps.length) throw new Error('changeSteps is out of step with changePolicy.steps');
  return steps;
}

// ----- Responsibility by format (the map's format switcher) -----------------------------------------------------------

export type ResponsibilityZone = 'rubikon' | 'client' | 'specialists';
/** RUBIKON's part in a work, from the matrix: does it (rubikon), coordinates it or organises it. */
export type RubikonRole = 'executes' | 'coordinates' | 'organizes';
type ZoneNotes = Partial<Record<ResponsibilityZone, Partial<Record<DeliveryFormatId, string>>>>;
export type SwitchItem = {
  text: string;
  rows: readonly string[];
  zones: Record<ResponsibilityZone, readonly DeliveryFormatId[]>;
  rubikonRole: Partial<Record<DeliveryFormatId, RubikonRole>>;
  /** How the parties share a work that sits in more than one zone, per zone and format — in the model's words. */
  notes: ZoneNotes;
};
export type SwitchFormat = {
  id: DeliveryFormatId;
  label: string;
  clientTitle: string;
  principle: string;
  outOfScope: readonly string[];
  /** The card that carries «Координує об’єкт» in this format, and the qualifier after it. */
  coordinator: { zone: 'rubikon' | 'client'; note: string };
};

/** A holder of a responsibility cell → the map zone it belongs to. The general contractor stands in the client's place. */
function zoneOf(holder: string): ResponsibilityZone | null {
  if (holder.startsWith('rubikon')) return 'rubikon';
  if (holder === 'client' || holder === 'general-contractor') return 'client';
  if (holder === 'partner') return 'specialists';
  return null;
}

/** RUBIKON's part in a work, from the holders of its cells: does it, else coordinates it, else organises it. */
function rubikonRoleOf(holders: readonly string[]): RubikonRole | undefined {
  if (holders.includes('rubikon')) return 'executes';
  if (holders.includes('rubikon-coordinates')) return 'coordinates';
  if (holders.includes('rubikon-organizes')) return 'organizes';
  return undefined;
}

const ROLE_NOTE: Record<Exclude<RubikonRole, 'executes'>, string> = { coordinates: 'координуємо', organizes: 'організовуємо' };

/** Where RUBIKON coordinates or organises rather than does the work, its card says so — unless a fuller note is curated. */
function withRoleNotes(notes: ZoneNotes, roles: Partial<Record<DeliveryFormatId, RubikonRole>>): ZoneNotes {
  const rubikon = { ...notes.rubikon };
  for (const [format, role] of Object.entries(roles) as [DeliveryFormatId, RubikonRole][]) {
    if (role !== 'executes' && !rubikon[format]) rubikon[format] = ROLE_NOTE[role];
  }
  return Object.keys(rubikon).length ? { ...notes, rubikon } : notes;
}

/**
 * The responsibility map per format: the same list of works, each placed in the zones the model's matrix names for that
 * format. Rows the format leaves out of our scope are listed apart; the legal-layer row stays out of the public map.
 */
export function responsibilityByFormat(): { formats: readonly SwitchFormat[]; items: readonly SwitchItem[] } {
  // Notes come from the rows' own notes, the stage texts and the customer-scope statement (tests hold each to its source).
  const every = (note: string) => Object.fromEntries(model.formats.map((format) => [format.id, note])) as Record<DeliveryFormatId, string>;
  const curated: readonly { text: string; rows: readonly string[]; notes?: ZoneNotes }[] = [
    {
      text: 'Структурування задачі й перелік вихідних даних',
      rows: ['task-framing'],
      notes: { rubikon: { subcontract: 'уточнюємо межі нашого пакета' }, client: { subcontract: 'описує пакет робіт і графік' } },
    },
    { text: 'Вихідні дані й доступ до майданчика', rows: ['site-inputs'] },
    { text: 'Проєкт і проєктування', rows: ['design'] },
    {
      text: 'Узгодження будівельних рішень з іншими роботами',
      rows: ['interfaces'],
      notes: { rubikon: { 'work-package': 'узгоджуємо свою частину робіт' }, client: { 'work-package': 'координує об’єкт загалом' } },
    },
    { text: 'Кошторис', rows: ['estimate'] },
    {
      text: 'Матеріали',
      rows: ['materials'],
      notes: {
        rubikon: { ...every('або надає замовник — залежно від договору'), subcontract: 'або надає генпідрядник — залежно від договору' },
        client: every('або закуповує RUBIKON — залежно від договору'),
      },
    },
    { text: 'Монтаж металоконструкцій, покрівлі, фундаменти й бетон', rows: ['steel', 'roofing', 'foundations'] },
    { text: 'Виготовлення металоконструкцій', rows: ['steel-fabrication'] },
    {
      text: 'Огородження, ворота, промислові підлоги',
      rows: ['flexible-packages'],
      notes: { rubikon: every('склад і виконавців визначаємо під проєкт'), specialists: every('склад і виконавців визначаємо під проєкт') },
    },
    {
      text: 'Електрика, вода, каналізація, опалення й вентиляція',
      rows: ['engineering-systems'],
      notes: {
        rubikon: { comprehensive: 'координуємо в погодженому комплексі' },
        client: { comprehensive: 'або окремо на стороні замовника' },
        specialists: { comprehensive: 'виконують' },
      },
    },
    { text: 'Зовнішні мережі й підключення', rows: ['external-utilities'] },
    {
      text: 'Спеціальне технологічне обладнання',
      rows: ['process-equipment'],
      notes: { client: every('окремо, із профільними спеціалістами'), specialists: every('підбір, постачання й монтаж') },
    },
    { text: 'Контроль якості своїх робіт', rows: ['quality-control'] },
    { text: 'Дозволи й введення в експлуатацію', rows: ['permits'] },
    {
      text: 'Вишукування, технічний і авторський нагляд',
      rows: ['surveys', 'supervision'],
      notes: {
        client: every('через своїх спеціалістів'),
        specialists: { ...every('спеціалісти замовника'), subcontract: 'спеціалісти генпідрядника' },
      },
    },
    { text: 'Приймання робіт', rows: ['acceptance'] },
  ];
  const rowById = (id: string) => {
    const row = model.responsibility.find((item) => item.id === id);
    if (!row) throw new Error(`Unknown responsibility row: ${id}`);
    return row;
  };
  const formatIds = model.formats.map((format) => format.id);
  const holdersOf = (rows: readonly string[], format: DeliveryFormatId) => rows.flatMap((id) => {
    const cell = rowById(id).cells[format];
    return typeof cell === 'string' ? [cell] : [...cell];
  });
  const items = curated.map(({ text, rows, notes = {} }) => {
    const zones: Record<ResponsibilityZone, DeliveryFormatId[]> = { rubikon: [], client: [], specialists: [] };
    const rubikonRole: Partial<Record<DeliveryFormatId, RubikonRole>> = {};
    for (const format of formatIds) {
      const holders = holdersOf(rows, format);
      for (const zone of new Set(holders.map(zoneOf))) if (zone) zones[zone].push(format);
      const role = rubikonRoleOf(holders);
      if (role) rubikonRole[format] = role;
    }
    return { text, rows, zones, rubikonRole, notes: withRoleNotes(notes, rubikonRole) };
  });
  // How the parties work together in each format (the promise of result is already said in the scope block above).
  const principles = Object.fromEntries(model.formats.map((format) => [format.id, format.interfaces])) as Record<DeliveryFormatId, string>;
  const formats = model.formats.map((format) => ({
    id: format.id,
    label: format.label,
    clientTitle: format.id === 'subcontract' ? 'Генпідрядник' : 'Замовник',
    principle: principles[format.id],
    outOfScope: curated.filter(({ rows }) => rows.every((id) => rowById(id).cells[format.id] === 'out-of-scope')).map(({ text }) => text),
    coordinator: {
      zone: CHOICE_TERMS[format.id].rubikonCoordinates ? 'rubikon' as const : 'client' as const,
      note: COORDINATOR_NOTE[format.id],
    },
  }));
  return { formats, items };
}
