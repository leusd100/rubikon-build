'use client';

import { Fragment, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react';
import {
  CONTROL_GROUP_TITLES,
  CONTROL_STEPS,
  type ControlGroupId,
} from '../../lib/configurator/controlGroups';
import { NBSP, formatRoofSlope, formatSize, gatesCountPhrase } from '../../lib/configurator/deriveSummary';
import {
  deriveDomainModel,
  materialsSetApart,
  resolveRidgeHeightM,
  withPurpose,
  withRidge,
  withShellAnswer,
  withShellConfirmedAgain,
  withShellMaterial,
  withSpanRuleRidge,
} from '../../lib/configurator/domainModel';
import {
  BUILD_REGIONS,
  LIFTING_EQUIPMENT_ANSWERS,
  LIFTING_EQUIPMENT_ANSWER_ORDER,
  PROJECT_STATUS_LABELS,
  PROJECT_STATUS_ORDER,
  PURPOSE_LABELS,
  PURPOSE_ORDER,
  TEMPERATURE_ORDER,
  UNKNOWN_REGION_LABEL,
  isBuildRegion,
  type ColdStoreTemperature,
  type ObjectProfile,
} from '../../lib/configurator/objectProfile';
import {
  DOOR_DIMENSIONS_M,
  GATE_DIMENSIONS_M,
  RIDGE_HEIGHT_STEP_M,
  clampRidgeHeightM,
  doorFits,
  gateHeightFits,
  maxGateCountThatFits,
  ridgeHeightRangeM,
} from '../../lib/configurator/parametricModel';
import {
  CLADDING_SYSTEM_LABELS,
  CLADDING_SYSTEM_ORDER,
  DIMENSION_BOUNDS,
  FOUNDATION_TYPE_LABELS,
  FOUNDATION_TYPE_ORDER,
  DOOR_LABELS,
  DOOR_SWITCH_ORDER,
  GATES_OPTIONS,
  GATE_TYPE_LABELS,
  GATE_TYPE_ORDER,
  SCOPE_LABELS,
  SCOPE_ORDER,
  clampDimension,
  hasScopeItem,
  toggleScopeItem,
  withConfirmed,
  INTERNAL_SUPPORTS_ANSWERS,
  INTERNAL_SUPPORTS_ORDER,
  SCOPE_MODE_LABELS,
  SCOPE_MODE_ORDER,
  type ScopeMode,
  type CladdingSystem,
  type ConfirmedTopic,
  type ConfiguratorState,
  type DoorCount,
  type Dimensions,
  type EnvelopeChoice,
  type FoundationType,
  type GateType,
  type GatesCount,
} from '../../lib/configurator/types';
import { keepShortWords } from '../../lib/typography';
import { formatNumber } from '../../lib/configurator/formatNumber';
import './configurator-controls.css';

type Props = {
  state: ConfiguratorState;
  onChange: (next: ConfiguratorState) => void;
  /** The open step (CONTROL_STEPS), held by HangarConfigurator: the drawing follows it — the frame on «Каркас» */
  step: number;
  onStep: (step: number) => void;
  /** The foundation type is offered on the research screen only. On /angary the visitor does not choose it: the
   *  designer decides it from the site and the loads (owner, 03.10), so the brief stays «Визначити після розрахунку». */
  foundationChoice?: boolean;
  /** «Що далі» under the last step (10.10, owner): the Delivery Model's first steps after a request, by their titles —
   *  resolved on the server (app/angary/page.tsx), so the model does not ship to the browser */
  nextSteps?: readonly string[];
};

/**
 * Numbers are shown with the Ukrainian decimal comma so the readout above a field and the value
 * inside it never disagree — a native `type="number"` localises its own display, which is how
 * "7.5 м" ended up sitting over a box reading "7,5".
 */
function formatMetres(value: number): string {
  return formatNumber(value, 2);
}

/** Accepts either decimal separator, since the field now displays a comma but keyboards and
 *  pasted values commonly supply a dot. Returns null for anything not yet a number — including
 *  an empty field and a lone "-", both of which are legitimate mid-typing states. */
function parseMetres(raw: string): number | null {
  const normalised = raw.replace(',', '.').trim();
  if (normalised === '' || normalised === '-' || normalised === '.') return null;
  const parsed = Number(normalised);
  return Number.isFinite(parsed) ? parsed : null;
}

/** What the field says after a typed value had to be changed on blur — it used to be clamped in silence (04.10) */
function clampNote(parsed: number | null, min: number, max: number, kept: number, step: number): string | null {
  if (parsed === null) return `Потрібне число в метрах — залишено ${formatMetres(kept)}${NBSP}м.`;
  // the configurator holds the common sizes; a larger hangar is still welcome, said in the request (owner, 08.10)
  if (parsed > max) return `У конфігураторі — до ${formatMetres(max)}${NBSP}м. Більший розмір вкажіть у заявці.`;
  // …and the smallest the same way (10.10, audit F26): «Найменше можливе значення» read as «smaller is not built»
  if (parsed < min) return `У конфігураторі — від ${formatMetres(min)}${NBSP}м.`;
  // …and a value between the steps, which was rounded in silence: «6,7» became 6,5 м with no word (07.10)
  if (Math.abs(parsed - kept) > 1e-9) return `Округлено до ${formatMetres(kept)}${NBSP}м: крок ${formatMetres(step)}${NBSP}м.`;
  return null;
}

/**
 * A dimension entry: slider plus a typed value.
 *
 * The typed field is `type="text"` with `inputMode="decimal"`, not `type="number"`, and it keeps a
 * local draft while focused. Both choices fix the same reported bug: the field used to clamp on
 * every keystroke, so clearing it produced `Number('') === 0`, which clamped to the minimum and
 * overwrote the entry — typing "37" into a field with a minimum of 10 was impossible, because the
 * intermediate "3" was rewritten to "10" before the "7" arrived.
 *
 * Now a partially-typed value is simply held: it is committed the moment it becomes legal, and
 * clamped once on blur. Nothing rewrites the box while the caret is in it.
 */
function NumericField({
  inputId,
  label,
  value,
  min,
  max,
  step,
  hint,
  children,
  clamp,
  onCommit,
}: {
  inputId: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  /** Shown under the field; without one, the range is written for screen readers only */
  hint?: string;
  /** Under the field: the ridge's way back to the span rule */
  children?: ReactNode;
  clamp: (value: number) => number;
  onCommit: (value: number) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  function handleTyped(raw: string) {
    setDraft(raw);
    setNote(null);
    const parsed = parseMetres(raw);
    // Commit live only once the entry is already within range, so the preview keeps up with
    // typing without the field ever being rewritten underneath the caret.
    if (parsed !== null && parsed >= min && parsed <= max) onCommit(clamp(parsed));
  }

  function handleBlur() {
    // A field entered and left without typing commits nothing: the click alone made the example's sizes the visitor's
    // answer (07.10, audit). What they type counts, even when it is the example's own number.
    if (draft === null) return;
    const parsed = parseMetres(draft ?? '');
    // An abandoned or nonsensical entry falls back to the last good value rather than to the
    // minimum — clearing the field and clicking away should not silently reset the object.
    const committed = parsed === null ? value : clamp(parsed);
    setNote(clampNote(parsed, min, max, parsed === null ? value : committed, step));
    // nonsense or an emptied field keeps the last good value and answers nothing
    if (parsed !== null) onCommit(committed);
    setDraft(null);
  }

  const range = `Від ${formatMetres(min)} до ${formatMetres(max)}${NBSP}м${step < 1 ? `, крок ${formatMetres(step)}${NBSP}м` : ''}.`;
  return (
    <div className="hc-field">
      {/* The value once, in its field, with its metre beside it (10.10, audit F114): «24 м» over a field reading «24» showed
          the four sizes as eight numbers */}
      <div className="hc-field-head">
        <label htmlFor={inputId}>{label}</label>
      </div>
      <div className="hc-field-controls">
        {/* Named by the label alone, with its value in metres: it was «Ширина, слайдер» and a bare «10.600000381469727» */}
        <input
          type="range"
          // how far along the track the value is: the drawn part of the track (configurator-controls.css)
          style={{ '--fill': `${((value - min) / Math.max(max - min, 1e-9)) * 100}%` } as CSSProperties}
          aria-label={label}
          aria-valuetext={`${formatMetres(value)} м`}
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(event) => {
            setNote(null);
            onCommit(clamp(Number(event.target.value)));
          }}
        />
        <input
          id={inputId}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          aria-describedby={`${inputId}-hint ${inputId}-note`}
          value={draft ?? formatMetres(value)}
          onChange={(event) => handleTyped(event.target.value)}
          onBlur={handleBlur}
        />
        {/* in the field, after the value: laid over the field's right end (configurator-controls.css) */}
        <span className="hc-field-unit" aria-hidden="true">м</span>
      </div>
      {hint ? (
        <p className="hc-field-hint" id={`${inputId}-hint`} key={hint}>
          {hint}
        </p>
      ) : (
        <span className="hc-visually-hidden" id={`${inputId}-hint`}>{range}</span>
      )}
      {/* Rendered empty, so the live region exists before it has something to say */}
      <p className="hc-field-hint hc-field-note-live" id={`${inputId}-note`} role="status">{note}</p>
      {children}
    </div>
  );
}

/* ── Steps (07.10) ────────────────────────────────────────────────────────────────────────────────────────────────────
   The groups are walked as steps (CONTROL_STEPS: five since the GPT review), one open at a time on every width. The tabs
   carry the steps' names only — in narrow tabs the values were cut to «24 × 60 ×…», and the sizes are in the drawing's
   title block anyway; a phone shows their numbers and names the open step under them. They replace
   the phone accordion (03.10), which opened on «Об’єкт» — four questions the drawing does not answer — and left the
   sizes, the part that moves the drawing, folded. */

/** Brings the steps' tabs back into view after a step changed from below them: under the site header and under what
 *  stays over the steps — a phone's mini drawing (useMiniPreview in HangarConfigurator.tsx) or a portrait tablet's
 *  sticky sheet (09.10, audit F22). Under either the tabs are put right under it, from either side: after «Каркас» a
 *  shorter mini drawing left a 52–83 px gap above them, and a taller one covered them (09.10, audit F52). With nothing
 *  over them they are left alone when already in view. Twice, because arriving at the controls switches the drawing to
 *  its compact size a frame later, and the frame's step measures its taller mini drawing then. */
export function landOnSteps(tabs: HTMLElement) {
  const land = () => {
    const layout = tabs.closest<HTMLElement>('.hangar-configurator-embedded .hc-layout');
    const stage = layout?.querySelector<HTMLElement>('.hc-preview-surface');
    // Stuck, it is measured as it is; a phone's sheet not yet held, by the mini drawing it turns into as the tabs land
    let over = 0;
    if (stage && getComputedStyle(stage).position === 'sticky') over = stage.offsetHeight;
    else if (layout) over = Number.parseFloat(layout.style.getPropertyValue('--hc-mini-h')) || 0;
    const covered = (document.querySelector('.site-header')?.getBoundingClientRect().bottom ?? 0) + over;
    const top = tabs.getBoundingClientRect().top;
    const away = over > 0 ? Math.abs(top - covered - 8) > 1 : top < covered || top > window.innerHeight * 0.5;
    if (away) window.scrollBy({ top: top - covered - 8, behavior: 'instant' });
  };
  land();
  window.requestAnimationFrame(() => window.requestAnimationFrame(land));
}

// The ids the groups have always had: page sections and tests point at them
const GROUP_HEADING_IDS: Record<ControlGroupId, string> = {
  need: 'hc-object-heading',
  space: 'hc-space-heading',
  project: 'hc-project-heading',
  dimensions: 'hc-dimensions-heading',
  envelope: 'hc-envelope-heading',
  cladding: 'hc-cladding-heading',
  foundation: 'hc-foundation-heading',
  scope: 'hc-scope-heading',
  openings: 'hc-gates-heading',
};

function ControlGroup({ id, children }: Readonly<{ id: ControlGroupId; children: ReactNode }>) {
  const headingId = GROUP_HEADING_IDS[id];
  // Not a named region (10.10, audit F133): each group was a landmark of its own, and a screen reader heard «Задача»
  // as the tab, the region and the heading in a row. The heading still opens the group.
  return (
    <section className="hc-control-group" data-group={id}>
      <h3 id={headingId}>{CONTROL_GROUP_TITLES[id]}</h3>
      <div className="hc-group-panel" id={`hc-${id}-panel`}>
        {children}
      </div>
    </section>
  );
}

function StepTabs({
  step,
  answered,
  onSelect,
}: Readonly<{ step: number; answered: readonly boolean[]; onSelect: (index: number, focus?: boolean, land?: boolean) => void }>) {
  // Arrow keys move between the tabs (the tabs pattern): one stop in the tab order, the open step's tab
  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const last = CONTROL_STEPS.length - 1;
    const next = { ArrowRight: index + 1, ArrowLeft: index - 1, Home: 0, End: last }[event.key];
    if (next === undefined) return;
    event.preventDefault();
    onSelect(Math.min(last, Math.max(0, next)), true);
  }
  return (
    <>
    <div className="hc-steps" role="tablist" aria-label="Кроки конфігурації">
      {CONTROL_STEPS.map((item, index) => (
        <button
          key={item.id}
          type="button"
          role="tab"
          id={`hc-step-${item.id}-tab`}
          className="hc-step-tab"
          aria-selected={step === index}
          aria-controls={`hc-step-${item.id}`}
          tabIndex={step === index ? 0 : -1}
          // answered, not merely passed (07.10): a step skipped over looked done
          data-done={answered[index] && step !== index ? '' : undefined}
          // Under the phone's held mini drawing a tab lands the steps under it, as «Далі» does: «Каркас» has a taller
          // mini drawing, and its tabs went under it, a tap on «Обсяг» then hitting «Згорнути» (09.10, audit F52)
          onClick={(event) => onSelect(index, false, event.currentTarget.closest('[data-configuring]') !== null)}
          onKeyDown={(event) => onKeyDown(event, index)}
        >
          {/* The number is in the tab's name, «2 Габарити» (the two are grid items: the name parts them with a space),
              and an answered step says so (10.10, audit F130): a phone shows the number alone, so «Натисни 2» found no
              tab, and «answered» was the copper rim alone */}
          <span className="hc-step-number">{index + 1}</span>
          <span className="hc-step-title">{item.title}</span>
          {answered[index] && step !== index && <span className="hc-visually-hidden">, обрано</span>}
        </button>
      ))}
    </div>
    {/* A phone shows the tabs' numbers only: the step on show is named under them (07.10) */}
    <p className="hc-step-current" aria-hidden="true" key={step}>Крок {step + 1} з {CONTROL_STEPS.length} · {CONTROL_STEPS[step].title}</p>
    </>
  );
}

/** Says why the openings shown are not the ones chosen. It used to warn «оберіть менший тип» while the sizes had
 *  already dropped the visitor's gates for good; now they are held and come back (04.10). */
/** The lowest wall height, on the slider's own steps, a gate type stands under */
function wallHeightFor(gateType: GateType): number {
  const { min, max, step } = DIMENSION_BOUNDS.height;
  for (let h = min; h <= max; h += step) if (gateHeightFits(gateType, h)) return h;
  return max;
}

/** Says why the openings shown are not the ones chosen — with the reason (08.10, audit: «лише ті, що вміщуються» while
 *  none did, and the greyed options said nothing) and, since 09.10 (owner), what the scheme draws instead, in the
 *  stamp's terms (deriveSummary heldGatesReason). The choice is held and comes back with the room. */
function heldOpeningsNote(
  state: ConfiguratorState,
  shown: Readonly<{ gates: number; gateType: GateType }>,
  gatesHeld: boolean,
  doorHeld: boolean,
): string | null {
  const back = 'Ваш вибір повернеться, щойно розміри це дозволять.';
  const gate = GATE_DIMENSIONS_M[state.gateType];
  const size = formatSize(gate.widthM, gate.heightM);
  let gates: string | null = null;
  if (gatesHeld && !gateHeightFits(state.gateType, state.dimensions.height)) {
    const drawn = GATE_DIMENSIONS_M[shown.gateType];
    gates = `Ворота ${size} потребують стін від ${formatMetres(wallHeightFor(state.gateType))}${NBSP}м.`;
    if (shown.gates > 0) gates += ` У схемі показано ${GATE_TYPE_LABELS[shown.gateType].toLowerCase()}, ${formatSize(drawn.widthM, drawn.heightM)}.`;
  } else if (gatesHeld) {
    const width = `${formatMetres(state.dimensions.width)}${NBSP}м`;
    gates = shown.gates > 0
      ? `За ширини ${width} вміщуються лише ${gatesCountPhrase(shown.gates)} ${size}${NBSP}— їх показано у схемі.`
      : `Ворота ${size} у такій кількості не вміщуються за ширини ${width}.`;
  }
  const door = doorHeld ? 'Для дверей немає місця за цієї ширини й цих воріт.' : null;
  const said = [gates, door].filter(Boolean).join(' ');
  return said ? keepShortWords(`${said} ${back}`) : null;
}

/** «Обсязі робіт» in a step's hint is the way there (10.10, audit F32): the hints sent the visitor to a section with no
 *  link to it. Without JS every step is open and the anchor jumps to it; with JS it opens the step, as a tab does. */
function ScopeLink({ onOpen }: Readonly<{ onOpen: () => void }>) {
  return (
    <a
      className="hc-note-link"
      href="#hc-step-check"
      onClick={(event) => {
        event.preventDefault();
        onOpen();
      }}
    >
      «Обсязі робіт»
    </a>
  );
}

/** In a narrow tile «Ще не знаю» breaks as «Ще / не знаю», not «Ще не / знаю» (10.10, audit F103: at 375 px) */
const NOT_YET = `Ще не${NBSP}знаю`;

/** A tile's words on two lines: the answer, and what it brings under it — «Теплий» / «сендвіч-панелі». One name for a
 *  screen reader, «Теплий — сендвіч-панелі», the dash said only to it (10.10, round 5) */
type TileWords = { word: string; detail?: string; apart?: boolean };

/** «Який ангар потрібен?» answered from the client's side (10.10, owner): the warmth and the material in one answer. It
 *  was «Чи потрібне утеплення?» over «Без утеплення / Утеплений», then the walls and the roof one by one. */
const SHELL_PRESET_ORDER: EnvelopeChoice[] = ['cold', 'insulated', 'undecided'];
const SHELL_PRESET_WORDS: Record<EnvelopeChoice, TileWords> = {
  // by the insulation, as the stamp says it (10.10, owner): «Холодний / Теплий» stood beside «Холодильний склад»
  cold: { word: 'Без утеплення', detail: 'профнастил' },
  insulated: { word: 'Утеплений', detail: 'сендвіч-панелі' },
  undecided: { word: NOT_YET },
};

/** «Яка температура всередині?» — a cold store's one more question (10.10, owner); its answer goes to the manager only */
const TEMPERATURE_WORDS: Record<ColdStoreTemperature, TileWords> = {
  // what it does, and on which side of zero (10.10, owner: «краще писати не "плюсова"»)
  chilled: { word: 'Охолодження', detail: `від 0${NBSP}°C` },
  frozen: { word: 'Заморозка', detail: `нижче 0${NBSP}°C` },
  unknown: { word: NOT_YET },
};

function TileLabel({ word, detail, apart = false }: Readonly<TileWords>) {
  // «Ще не знаю» has nothing under it and is not yet an answer: its words stay as quiet as the chips' (audit F110)
  if (!detail) return <span>{word}</span>;
  return (
    <span>
      <strong className="hc-tile-word">{word}</strong>
      <small className="hc-tile-detail" data-apart={apart ? '' : undefined}><i className="hc-visually-hidden"> — </i>{detail}</small>
    </span>
  );
}

const DIMENSION_FIELD_LABELS: Record<keyof Dimensions, string> = {
  width: 'Ширина',
  length: 'Довжина',
  height: 'Висота стін',
};

export function ConfiguratorControls({ state, onChange, step, onStep: setStep, foundationChoice = true, nextSteps }: Readonly<Props>) {
  const tabsRef = useRef<HTMLDivElement>(null);
  // The same resolved model the summary reads, so a folded header and the ridge hint never disagree with the stamp
  const domain = useMemo(() => deriveDomainModel(state), [state]);
  // The ridge's legal range depends on the CURRENT width and eave height, so it is recomputed on every render rather
  // than read from a static table. The value shown is the resolved one: the span rule's until the visitor edits it.
  const ridgeRange = ridgeHeightRangeM(state.dimensions.width, state.dimensions.height);
  // The ridge's fold is the visitor's to open and close (08.10, review): tied to ridgeEdited, «Підбирати ухил за
  // шириною» folded it away with the new value and dropped focus to the page. It opens by itself for an edited ridge
  // (a restored draft), once.
  const [ridgeOpen, setRidgeOpen] = useState(state.ridgeEdited);
  const [ridgeEditedSeen, setRidgeEditedSeen] = useState(state.ridgeEdited);
  if (state.ridgeEdited !== ridgeEditedSeen) {
    setRidgeEditedSeen(state.ridgeEdited);
    if (state.ridgeEdited) setRidgeOpen(true);
  }
  // «Налаштувати окремо» is the visitor's to open and close, as the ridge's fold is; it opens by itself once the materials
  // stand apart from the answer above them (a restored draft, a mix set in it), so nothing chosen is ever folded away
  const shellApart = materialsSetApart(state);
  const [shellOpen, setShellOpen] = useState(shellApart);
  const [shellApartSeen, setShellApartSeen] = useState(shellApart);
  if (shellApart !== shellApartSeen) {
    setShellApartSeen(shellApart);
    if (shellApart) setShellOpen(true);
  }
  const ridgeValue = resolveRidgeHeightM(state);
  // The range, then the slope and where it comes from (10.10, audit F102): three sentences repeated the field's number
  // and gave the slope in percent too
  const ridgeRangeText = `Від ${formatMetres(ridgeRange.min)} до ${formatMetres(ridgeRange.max)}${NBSP}м.`;
  const slope = formatRoofSlope(domain.roof.pitchDeg);
  const Slope = slope.charAt(0).toUpperCase() + slope.slice(1);
  // The visitor's ridge is kept as typed and held in the range here (04.10), so a ridge the sizes moved is said to be the
  // range's end, not «ваше значення» — the hint used to call a clamped 8,3 м the visitor's after they typed 11,5 м
  let ridgeHint = `${ridgeRangeText} ${Slope}${NBSP}— підібраний за шириною ангара.`;
  if (state.ridgeEdited) {
    const typed = `Ваші ${formatMetres(state.ridgeHeightM)}${NBSP}м повернуться, щойно розміри це дозволять.`;
    if (ridgeValue === state.ridgeHeightM) ridgeHint = `${ridgeRangeText} ${Slope}${NBSP}— за вашою висотою в конику.`;
    else if (ridgeValue > state.ridgeHeightM) ridgeHint = `${ridgeRangeText} Показано найнижчий коник для цих розмірів, ${slope}. ${typed}`;
    else ridgeHint = `${ridgeRangeText} Показано найвищий коник для цих розмірів, ${slope}. ${typed}`;
  }
  ridgeHint = keepShortWords(ridgeHint);

  /** Opens a step. From the buttons under a step the visitor is below the tabs: bring them back into view. */
  function selectStep(index: number, focus = false, land = false) {
    setStep(index);
    window.requestAnimationFrame(() => {
      const tabs = tabsRef.current;
      if (!tabs) return;
      if (focus || land) tabs.querySelector<HTMLButtonElement>(`#hc-step-${CONTROL_STEPS[index].id}-tab`)?.focus({ preventScroll: true });
      if (land) landOnSteps(tabs);
    });
  }

  /** «Обсязі робіт» in a hint opens that step, its tab focused (10.10, audit F32) */
  const openScope = () => selectStep(CONTROL_STEPS.findIndex((item) => item.id === 'check'), false, true);

  // The sizes change only the sizes (04.10). The gates, the door and an edited ridge stay as the visitor chose them and are
  // held to what fits by deriveDomainModel, which the drawing, the stamp, the lead and these controls all read: dragging
  // the width to 12 and back to 24 used to cost the second gate and the door for good, and a typed «5,5» lost the
  // «Для заїзду техніки» gate to the «5» on the way. The same rule as the scope's — a choice is held, never cleared.
  function setDimension(key: keyof Dimensions, value: number) {
    onChange(withConfirmed({ ...state, dimensions: { ...state.dimensions, [key]: value } }, 'dimensions'));
  }

  function setRidge(ridgeHeightM: number) {
    // Only a changed value is the visitor's own ridge: focusing the field and leaving it (a blur commits the value it
    // shows) must not stop the ridge following the width.
    if (ridgeHeightM === ridgeValue) return;
    onChange(withConfirmed(withRidge(state, ridgeHeightM), 'dimensions'));
  }

  function setObjectProfile(answer: Partial<ObjectProfile>) {
    onChange({ ...state, objectProfile: { ...state.objectProfile, ...answer } });
  }

  // «Який ангар потрібен?» (10.10, owner): a preset brings its materials and answers both topics; a material set under
  // «Налаштувати окремо» answers the same question in detail (domainModel.ts withShellAnswer, withShellMaterial). Still
  // a starting point, never a lock (brief §18): the fold changes either surface after the preset.
  function setShellPreset(envelope: EnvelopeChoice) {
    onChange(withShellAnswer(state, envelope));
  }

  /** A chosen answer pressed again is an answer (07.10, audit): agreeing with the example's value counts as the visitor's
   *  — and changes nothing else (an «Утеплений» pressed again does not reset materials the visitor changed) */
  function confirmTopic(topic: ConfirmedTopic) {
    onChange(withConfirmed(state, topic));
  }

  function setShellMaterial(surface: 'wallSystem' | 'roofSystem', system: CladdingSystem) {
    onChange(withShellMaterial(state, surface, system));
  }

  function setFoundationType(foundationType: FoundationType) {
    onChange({ ...state, foundationType });
  }

  // Each opening control sets only its own choice (04.10). A door the new gates leave no room for is held, not dropped,
  // like a gate the sizes leave no room for: deriveDomainModel places what fits, and the rest returns with the room.
  function setGates(gates: GatesCount) {
    onChange(withConfirmed({ ...state, gates }, 'openings'));
  }

  function setGateType(gateType: GateType) {
    onChange(withConfirmed({ ...state, gateType }, 'openings'));
  }

  function setDoors(doors: DoorCount) {
    onChange(withConfirmed({ ...state, doors }, 'openings'));
  }

  // The mode alone (07.10, audit: switching wiped the list): «Комплекс робіт» and «Допоможіть визначити» draw the whole
  // set (domainModel.ts drawnScope), «Окремі роботи» the visitor's list, kept while they looked at another mode
  function setScopeMode(scopeMode: ScopeMode) {
    onChange(withConfirmed({ ...state, scopeMode }, 'scope'));
  }

  function setScope(item: (typeof SCOPE_ORDER)[number]) {
    onChange(withConfirmed({ ...state, scope: toggleScopeItem(state.scope, item) }, 'scope'));
  }

  // The openings as placed — held to what fits at these sizes (deriveDomainModel). The controls show these; the
  // visitor's own choice stays in the state and returns once it fits (04.10).
  const shown = { gates: domain.gates, gateType: domain.gateType, doors: domain.doors };
  const gatesHeld = state.gates !== shown.gates || state.gateType !== shown.gateType;
  const doorHeld = state.doors !== shown.doors;
  // what the drawing, the stamp and the lead treat as asked for: the mode's works (drawnScope), not the kept list
  const wallsInScope = domain.scope.walls;
  const heldNote = wallsInScope ? heldOpeningsNote(state, shown, gatesHeld, doorHeld) : null;
  // Gates or a door the visitor chose, left out with the walls (10.10, audit F32): said beside the box that did it
  const openingsWithoutWalls = !wallsInScope && state.confirmed.includes('openings') && (state.gates > 0 || state.doors > 0);
  const roofInScope = domain.scope.roof;
  const foundationInScope = domain.scope.foundation;
  // "Контур" sets the wall AND roof systems together, so it stays available while either surface
  // is being asked for.
  const hasEnvelopeScope = wallsInScope || roofInScope;
  const { objectProfile } = state;
  // the warm hangar a cold store brought, not yet answered: both topics still the (purpose's) example's (10.10)
  const coldStore = objectProfile.purpose === 'coldStore';
  const coldStoreSuggestion = coldStore && domain.exampleTopics.includes('envelope') && domain.exampleTopics.includes('cladding');
  /** A cold store is never in profiled sheet (10.10, owner): its «Без утеплення» and the sheet in the fold are off */
  const sheetOff = (system: CladdingSystem) => coldStore && system === 'profiled-sheet';
  // A step is answered once the visitor set something in it themselves (types.ts ConfirmedTopic)
  const answered = CONTROL_STEPS.map((item) => {
    if (item.id === 'task') return objectProfile.purpose !== null || objectProfile.region !== 'unknown';
    if (item.id === 'size') return state.confirmed.includes('dimensions') || state.sizesUnknown;
    if (item.id === 'shell') return ['envelope', 'cladding', 'openings'].some((topic) => state.confirmed.includes(topic as ConfirmedTopic));
    if (item.id === 'frame') return state.internalSupports !== 'unknown' || objectProfile.lifting !== 'unknown';
    return state.confirmed.includes('scope') || objectProfile.project !== 'unknown';
  });

  // neutral (10.10, audit F42): «…після перегляду проєкту» stayed beside «Ще немає», while the stamp said «проєкту ще немає»
  let scopeNote = 'Остаточний склад робіт уточнимо разом.';
  if (state.scopeMode === 'help') scopeNote = 'Розберемо разом, що робимо ми, а що організуємо, — після перегляду ваших даних.';
  // an empty list is said so, without blocking the request (07.10, audit)
  else if (state.scopeMode === 'partial' && state.scope.length === 0) scopeNote = 'Позначте хоча б одну роботу або оберіть «Допоможіть визначити».';
  // At the configurator's largest sizes, the way to a larger hangar (owner, 08.10: the common sizes here, the rest in the request)
  const atLargest = state.dimensions.width === DIMENSION_BOUNDS.width.max || state.dimensions.length === DIMENSION_BOUNDS.length.max;

  // The groups, each placed in its step below — «Стіни й покрівля» is folded into «Який ангар потрібен?» (10.10)
  const groups: Partial<Record<ControlGroupId, ReactNode>> = {
    // «Об’єкт» (owner, 03.10) is split by where each answer matters (07.10, controlGroups.ts). Every question is optional
    // and starts unanswered, so a visitor who skips it sends nothing from it.
    need: (
      <ControlGroup id="need">
        {/* «Відповіді», not «Дві відповіді» (10.10): a cold store adds a third */}
        <p className="hc-field-note hc-object-note">Відповіді можна пропустити: від них залежить, що запропонуємо.</p>
        <div className="hc-field">
          <div className="hc-field-head">
            <span id="hc-purpose-label">Для чого ангар?</span>
          </div>
          {/* «Ще не знаю» is a chip of its own (07.10): a chosen chip pressed again used to take the answer back, which no
              radio button does */}
          <div className="hc-option-cards hc-chips" role="radiogroup" aria-labelledby="hc-purpose-label">
            {PURPOSE_ORDER.map((option) => (
              <label key={option} className="hc-option-card">
                <input
                  type="radio"
                  name="hc-purpose"
                  value={option}
                  checked={objectProfile.purpose === option}
                  // a cold store brings the warm hangar as the example's, until the visitor answers (10.10)
                  onChange={() => onChange(withPurpose(state, option))}
                />
                <span>{PURPOSE_LABELS[option]}</span>
              </label>
            ))}
            <label className="hc-option-card">
              <input
                type="radio"
                name="hc-purpose"
                value=""
                checked={objectProfile.purpose === null}
                onChange={() => onChange(withPurpose(state, null))}
              />
              <span>Ще не знаю</span>
            </label>
          </div>
        </div>
        {/* A cold store's one more question, under its purpose (10.10, owner). The answer goes to the manager as said: the
            configurator draws nothing from it and claims nothing — no panel, no insulation value. */}
        {objectProfile.purpose === 'coldStore' && (
          <div className="hc-field hc-follow-up">
            <div className="hc-field-head">
              <span id="hc-temperature-label">Яка температура всередині?</span>
            </div>
            <div className="hc-option-cards hc-tiles" role="radiogroup" aria-labelledby="hc-temperature-label">
              {TEMPERATURE_ORDER.map((option) => (
                <label key={option} className="hc-option-card">
                  <input
                    type="radio"
                    name="hc-temperature"
                    value={option}
                    checked={objectProfile.temperature === option}
                    onChange={() => setObjectProfile({ temperature: option })}
                  />
                  <TileLabel {...TEMPERATURE_WORDS[option]} />
                </label>
              ))}
            </div>
          </div>
        )}
        <div className="hc-field">
          <div className="hc-field-head">
            <label htmlFor="hc-object-region">Де будуємо?</label>
          </div>
          <select
            id="hc-object-region"
            className="hc-select"
            value={objectProfile.region}
            onChange={(event) => {
              const region = event.target.value;
              if (isBuildRegion(region)) setObjectProfile({ region });
            }}
          >
            <option value="unknown">{UNKNOWN_REGION_LABEL}</option>
            {BUILD_REGIONS.map((region) => (
              <option key={region} value={region}>{region}</option>
            ))}
          </select>
        </div>
      </ControlGroup>
    ),
    space: (
      <ControlGroup id="space">
        <div className="hc-field">
          {/* the client's question, not the engineer's (10.10, owner): «Колони всередині ангара: Можна / Не можна» */}
          <div className="hc-field-head">
            <span id="hc-supports-label">Потрібен простір без колон усередині?</span>
          </div>
          <div className="hc-option-cards hc-chips" role="radiogroup" aria-labelledby="hc-supports-label">
            {INTERNAL_SUPPORTS_ORDER.map((option) => (
              <label key={option} className="hc-option-card">
                <input
                  type="radio"
                  name="hc-supports"
                  value={option}
                  checked={state.internalSupports === option}
                  onChange={() => onChange({ ...state, internalSupports: option })}
                />
                <span>{INTERNAL_SUPPORTS_ANSWERS[option]}</span>
              </label>
            ))}
          </div>
          {/* No type of structure (10.10, audit F37): it promised «ферму» where 12–20 m draw a portal frame. In the answers'
              words since round 5 (10.10): it sent the visitor to a «Не можна» no longer there */}
          <p className="hc-field-note">
            {keepShortWords('Ряд колон посередині ділить ширину на два прольоти. Без колон — один проліт на всю ширину: '
              + 'креслення покаже такий каркас, а конструкцію під нього підбере проєктувальник.')}
          </p>
          {/* «Колони можна» where the drawing has no centre row to show — a portal frame, under 18 m (10.10, owner: the
              answer «не працює» when nothing on the drawing moved): why, and that the answer still goes on */}
          {state.internalSupports === 'allowed' && domain.structural.scheme !== 'centerSupport' && (
            <p className="hc-field-note">
              {keepShortWords(`На ширині ${formatNumber(state.dimensions.width)}${NBSP}м креслення показує раму без колон посередині. Вашу відповідь передамо проєктувальнику.`)}
            </p>
          )}
        </div>
        <div className="hc-field">
          {/* asked as the client would say it (10.10, owner); the lead names the equipment (objectProfile.ts) */}
          <div className="hc-field-head">
            <span id="hc-lifting-label">Буде кран-балка або тельфер?</span>
          </div>
          <div className="hc-option-cards hc-chips" role="radiogroup" aria-labelledby="hc-lifting-label">
            {LIFTING_EQUIPMENT_ANSWER_ORDER.map((option) => (
              <label key={option} className="hc-option-card">
                <input
                  type="radio"
                  name="hc-lifting"
                  value={option}
                  checked={objectProfile.lifting === option}
                  onChange={() => setObjectProfile({ lifting: option })}
                />
                <span>{LIFTING_EQUIPMENT_ANSWERS[option]}</span>
              </label>
            ))}
          </div>
        </div>
      </ControlGroup>
    ),
    // The group's heading is its one question (10.10, audit F42, F51): «Проєкт», «Проєкт є?» and «Є проєкт» in a row
    project: (
      <ControlGroup id="project">
        <div className="hc-field">
          <div className="hc-option-cards hc-chips" role="radiogroup" aria-labelledby="hc-project-heading">
            {PROJECT_STATUS_ORDER.map((option) => (
              <label key={option} className="hc-option-card">
                <input
                  type="radio"
                  name="hc-project"
                  value={option}
                  checked={objectProfile.project === option}
                  onChange={() => setObjectProfile({ project: option })}
                />
                <span>{PROJECT_STATUS_LABELS[option]}</span>
              </label>
            ))}
          </div>
        </div>
      </ControlGroup>
    ),
    dimensions: (
      <ControlGroup id="dimensions">
        {(['width', 'length', 'height'] as const).map((key) => (
          <NumericField
            key={key}
            inputId={`hc-dimension-${key}`}
            label={DIMENSION_FIELD_LABELS[key]}
            value={state.dimensions[key]}
            min={DIMENSION_BOUNDS[key].min}
            max={DIMENSION_BOUNDS[key].max}
            step={DIMENSION_BOUNDS[key].step}
            clamp={(v) => clampDimension(key, v)}
            onCommit={(v) => setDimension(key, v)}
          />
        ))}
        {/* «Точних розмірів ще немає» (07.10): a request without invented numbers — the drawing keeps its sizes as an
            orientation, and the lead says the sizes are still to be found */}
        <label className="hc-checkbox-row hc-sizes-unknown">
          <input type="checkbox" checked={state.sizesUnknown} onChange={() => onChange({ ...state, sizesUnknown: !state.sizesUnknown })} />
          <span>Точних розмірів ще немає — уточнимо разом</span>
        </label>
        {state.sizesUnknown && <p className="hc-field-note">На кресленні — орієнтовні розміри, їх можна змінювати.</p>}
        {atLargest && (
          <p className="hc-field-note">
            У конфігураторі — до {DIMENSION_BOUNDS.width.max}{NBSP}×{NBSP}{DIMENSION_BOUNDS.length.max}{NBSP}м. Більший ангар? Вкажіть розміри в заявці.
          </p>
        )}
        {/* The ridge is a refinement, not a first question (07.10): folded, unless the visitor set it */}
        <details className="hc-more" open={ridgeOpen} onToggle={(event) => setRidgeOpen(event.currentTarget.open)}>
          {/* what it does, not the field's name again (10.10, audit F102); the field's own label is for screen readers
              (configurator-controls.css, F51) */}
          <summary>Змінити висоту в конику</summary>
        <NumericField
          inputId="hc-dimension-ridge"
          label="Висота в конику"
          value={ridgeValue}
          min={ridgeRange.min}
          max={ridgeRange.max}
          step={RIDGE_HEIGHT_STEP_M}
          hint={ridgeHint}
          clamp={(v) => clampRidgeHeightM(v, state.dimensions.width, state.dimensions.height)}
          onCommit={setRidge}
        >
          {/* The way back to the span rule, which an edited ridge never had (04.10) */}
          {state.ridgeEdited && (
            <button
              type="button"
              className="hc-field-reset"
              onClick={() => {
                onChange(withConfirmed(withSpanRuleRidge(state), 'dimensions'));
                // the button goes with the edit: the field it belonged to keeps the focus and shows the new value
                window.requestAnimationFrame(() => document.getElementById('hc-dimension-ridge')?.focus());
              }}
            >
              {/* an action, not a mode (10.10, audit F102: «Підбирати…») */}
              Повернути ухил за шириною
            </button>
          )}
        </NumericField>
        </details>
      </ControlGroup>
    ),
    // «Який ангар потрібен?» (10.10, owner): one question, three answers that bring their materials; the walls and the roof
    // one by one under «Налаштувати окремо». The step asked five things — the insulation, the walls, the roof, the gates,
    // the door — and asks three: this, the gates, the door.
    envelope: (
      <ControlGroup id="envelope">
        <div className="hc-option-cards hc-tiles" role="radiogroup" aria-labelledby="hc-envelope-heading">
          {SHELL_PRESET_ORDER.map((option) => {
            const words = SHELL_PRESET_WORDS[option];
            // the chosen preset's materials changed in the fold: its tile no longer promises them
            const apart = option === state.envelope && option !== 'undecided' && shellApart;
            const off = !hasEnvelopeScope || (coldStore && option === 'cold');
            return (
              <label key={option} className="hc-option-card" aria-disabled={off}>
                <input
                  type="radio"
                  name="hc-envelope"
                  value={option}
                  checked={state.envelope === option}
                  disabled={off}
                  onChange={() => setShellPreset(option)}
                  onClick={() => { if (state.envelope === option) onChange(withShellConfirmedAgain(state)); }}
                />
                <TileLabel word={words.word} detail={apart ? 'налаштовано окремо' : words.detail} apart={apart} />
              </label>
            );
          })}
        </div>
        {/* The warm hangar a cold store brings is a suggestion (10.10): «з прикладу» in the stamp until answered, and here
            the way to answer it */}
        {/* a cold store: why there is no «Без утеплення», and while its warm hangar is a suggestion, the way to answer it */}
        {hasEnvelopeScope && coldStore && (
          <p className="hc-field-note">
            {keepShortWords(coldStoreSuggestion
              ? 'Холодильному складу потрібні утеплені стіни й покрівля, тому «Без утеплення» тут недоступний. Натисніть «Утеплений», щоб підтвердити.'
              : 'Холодильному складу потрібні утеплені стіни й покрівля, тому «Без утеплення» тут недоступний.')}
          </p>
        )}
        {!hasEnvelopeScope && (
          <p className="hc-field-note hc-field-note-warning">
            Утеплення стосується стін і{NBSP}покрівлі — увімкніть їх в{NBSP}<ScopeLink onOpen={openScope} />, щоб обрати.
          </p>
        )}
        {/* The walls and the roof one by one: the rare case, folded (10.10) — open while they stand apart from the answer */}
        <details className="hc-more hc-shell-more" open={shellOpen} onToggle={(event) => setShellOpen(event.currentTarget.open)}>
          <summary>Налаштувати окремо</summary>
          <div className="hc-field">
            <div className="hc-field-head">
              <span id="hc-wall-system-label">Стіни</span>
            </div>
            <div className="hc-option-cards" role="radiogroup" aria-labelledby="hc-wall-system-label">
              {CLADDING_SYSTEM_ORDER.map((option) => (
                <label key={option} className="hc-option-card" aria-disabled={!wallsInScope || sheetOff(option)}>
                  <input
                    type="radio"
                    name="hc-wall-system"
                    checked={state.wallSystem === option}
                    disabled={!wallsInScope || sheetOff(option)}
                    onChange={() => setShellMaterial('wallSystem', option)}
                    onClick={() => { if (state.wallSystem === option) setShellMaterial('wallSystem', option); }}
                  />
                  <span>{CLADDING_SYSTEM_LABELS[option]}</span>
                </label>
              ))}
            </div>
            {!wallsInScope && <p className="hc-field-note">Стіни не входять в обсяг робіт.</p>}
          </div>
          <div className="hc-field">
            <div className="hc-field-head">
              <span id="hc-roof-system-label">Покрівля</span>
            </div>
            <div className="hc-option-cards" role="radiogroup" aria-labelledby="hc-roof-system-label">
              {CLADDING_SYSTEM_ORDER.map((option) => (
                <label key={option} className="hc-option-card" aria-disabled={!roofInScope || sheetOff(option)}>
                  <input
                    type="radio"
                    name="hc-roof-system"
                    checked={state.roofSystem === option}
                    disabled={!roofInScope || sheetOff(option)}
                    onChange={() => setShellMaterial('roofSystem', option)}
                    onClick={() => { if (state.roofSystem === option) setShellMaterial('roofSystem', option); }}
                  />
                  <span>{CLADDING_SYSTEM_LABELS[option]}</span>
                </label>
              ))}
            </div>
            {!roofInScope && <p className="hc-field-note">Покрівля не входить в обсяг робіт.</p>}
          </div>
        </details>
      </ControlGroup>
    ),
    // The foundation type is offered on the research screen only (see Props.foundationChoice)
    foundation: foundationChoice ? (
      <ControlGroup id="foundation">
        <div className="hc-option-cards" role="radiogroup" aria-labelledby="hc-foundation-heading">
          {FOUNDATION_TYPE_ORDER.map((option) => (
            <label key={option} className="hc-option-card" aria-disabled={!foundationInScope}>
              <input
                type="radio"
                name="hc-foundation-type"
                checked={state.foundationType === option}
                disabled={!foundationInScope}
                onChange={() => setFoundationType(option)}
              />
              <span>{FOUNDATION_TYPE_LABELS[option]}</span>
            </label>
          ))}
        </div>
        {!foundationInScope && (
          <p className="hc-field-note hc-field-note-warning">
            Фундамент не входить в обсяг заявки.
          </p>
        )}
        <p className="hc-field-note">
          Тут можна вказати попереднє побажання: тип фундаменту визначає проєктувальник за даними майданчика й навантаженнями.
        </p>
      </ControlGroup>
    ) : null,
    // "Обсяг заявки" is the master fact for everything else. A cladding system, a colour or an opening for a surface the
    // customer is not asking for is not something they can order, and offering it is how the summary ended up
    // contradicting its own Обсяг line. Those controls are DISABLED, never cleared: dropping walls to look at the frame
    // and putting them back must not cost the visitor their gate choice.
    scope: (
      <ControlGroup id="scope">
        {/* The whole set, some works, or help to decide (07.10): four boxes ticked in advance read as already chosen */}
        <div className="hc-option-cards hc-chips" role="radiogroup" aria-labelledby="hc-scope-heading">
          {SCOPE_MODE_ORDER.map((option) => (
            <label key={option} className="hc-option-card">
              <input
                type="radio"
                name="hc-scope-mode"
                checked={state.scopeMode === option}
                onChange={() => setScopeMode(option)}
                onClick={() => { if (state.scopeMode === option) confirmTopic('scope'); }}
              />
              <span>{SCOPE_MODE_LABELS[option]}</span>
            </label>
          ))}
        </div>
        {state.scopeMode === 'partial' && (
          <div className="hc-option-list hc-scope-list">
            {SCOPE_ORDER.map((item) => {
              const checked = hasScopeItem(state.scope, item);
              return (
                <label key={item} className="hc-checkbox-row">
                  <input type="checkbox" checked={checked} onChange={() => setScope(item)} />
                  <span>{SCOPE_LABELS[item]}</span>
                </label>
              );
            })}
          </div>
        )}
        {openingsWithoutWalls && (
          <p className="hc-field-note">Ворота й{NBSP}двері без стін у{NBSP}заявку не потрапляють; ваш вибір збережеться.</p>
        )}
        <p className="hc-field-note">
          {scopeNote}
        </p>
      </ControlGroup>
    ),
    openings: (
      <ControlGroup id="openings">
        {!wallsInScope && (
          <p className="hc-field-note hc-field-note-warning">
            Ворота й{NBSP}двері — це прорізи в{NBSP}стінах. Увімкніть «Стіни» в{NBSP}<ScopeLink onOpen={openScope} />, щоб їх
            обрати. Поточний вибір збережеться.
          </p>
        )}
        {/* The question and its short answers on one row (10.10): «Ворота» over three tiles took a row of its own */}
        <div className="hc-inline-field">
          <div className="hc-field-head">
            <span id="hc-gate-count-label">Ворота</span>
          </div>
          <div className="hc-option-cards hc-option-cards-compact" role="radiogroup" aria-labelledby="hc-gate-count-label">
            {GATES_OPTIONS.map((option) => {
              // Phase 3F.1, brief §B2-B3: a gate count is only offered if the CURRENTLY selected
              // gate type actually fits that many times at the current width/eave height — real,
              // fixed-size gates (GATE_DIMENSIONS_M), not scaled to fit. 0 is always available.
              const disabled = option > 0 && (!wallsInScope
                || !gateHeightFits(shown.gateType, state.dimensions.height)
                || option > maxGateCountThatFits(shown.gateType, state.dimensions.width));
              return (
                <label key={option} className="hc-option-card" aria-disabled={disabled}>
                  <input
                    type="radio"
                    name="hc-gates"
                    checked={shown.gates === option}
                    disabled={disabled}
                    onChange={() => setGates(option)}
                    onClick={() => { if (shown.gates === option) confirmTopic('openings'); }}
                  />
                  <span>{option}</span>
                </label>
              );
            })}
          </div>
        </div>
        {/* Only meaningful once there is a gate to size, so it is hidden at zero rather than
            shown disabled — a control that cannot do anything is noise. */}
        {shown.gates > 0 && (
          <div
            className="hc-option-cards hc-gate-types"
            role="radiogroup"
            aria-label="Тип воріт"
          >
            {GATE_TYPE_ORDER.map((option) => {
              // Phase 3F.1: a type is only offered if it clears the eave line at the CURRENT
              // count already selected — switching type never silently rescales anything.
              const disabled = !wallsInScope
                || !gateHeightFits(option, state.dimensions.height)
                || shown.gates > maxGateCountThatFits(option, state.dimensions.width);
              return (
                <label key={option} className="hc-option-card" aria-disabled={disabled}>
                  <input
                    type="radio"
                    name="hc-gate-type"
                    checked={shown.gateType === option}
                    disabled={disabled}
                    onChange={() => setGateType(option)}
                    onClick={() => { if (shown.gateType === option) confirmTopic('openings'); }}
                  />
                  {/* the size in the name (07.10), not in a note under the buttons */}
                  <span>{GATE_TYPE_LABELS[option]} · {formatSize(GATE_DIMENSIONS_M[option].widthM, GATE_DIMENSIONS_M[option].heightM)}</span>
                </label>
              );
            })}
          </div>
        )}
        {/* «Службові двері: Так / Ні» (10.10, owner): one switch on the question's row — «Двері» over «Без дверей» and «1»
            read as a count to tune. The door's size and place are said once it is asked for. */}
        <div className="hc-field hc-door-field hc-inline-field">
          <div className="hc-field-head">
            <span id="hc-doors-label">Службові двері</span>
          </div>
          <div className="hc-option-cards hc-chips hc-door-options" role="radiogroup" aria-labelledby="hc-doors-label">
            {DOOR_SWITCH_ORDER.map((option) => {
              // Disabled rather than hidden, and only ever for a real reason: at this width the
              // door has no position clear of the corners, the gates and the centre-support line —
              // where one stands, as the model decides it (09.10, audit F60: the same scheme)
              const disabled = option > 0 && (!wallsInScope
                || !doorFits(shown.gates, shown.gateType, state.dimensions.width, domain.structural.scheme === 'centerSupport'));
              return (
                <label className="hc-option-card" key={option}>
                  <input
                    type="radio"
                    name="hc-doors"
                    value={option}
                    checked={shown.doors === option}
                    disabled={disabled}
                    aria-disabled={disabled}
                    onChange={() => setDoors(option)}
                    onClick={() => { if (shown.doors === option) confirmTopic('openings'); }}
                  />
                  <span>{DOOR_LABELS[option]}</span>
                </label>
              );
            })}
          </div>
          {/* Without gates the door goes to the quarter points of the gable end (doorCandidateXs): it said «поруч із
              воротами» there too (04.10) */}
          {wallsInScope && shown.doors > 0 && (
            <p className="hc-field-note">
              Двері {formatSize(DOOR_DIMENSIONS_M.widthM, DOOR_DIMENSIONS_M.heightM)}. Місце підбираємо автоматично{NBSP}—{' '}
              {shown.gates > 0 ? <>поруч із{NBSP}воротами, поза колонами.</> : <>у{NBSP}торцевій стіні, поза колонами.</>}
            </p>
          )}
        </div>

        {heldNote && <p className="hc-field-note hc-field-note-warning">{heldNote}</p>}
      </ControlGroup>
    ),
  };

  return (
    <div className="hc-controls" data-steps="">
      <div ref={tabsRef}>
        <StepTabs step={step} answered={answered} onSelect={selectStep} />
      </div>
      {CONTROL_STEPS.map((item, index) => {
        const previous = CONTROL_STEPS[index - 1];
        const next = CONTROL_STEPS[index + 1];
        return (
          <div
            key={item.id}
            className="hc-step-panel"
            role="tabpanel"
            id={`hc-step-${item.id}`}
            aria-labelledby={`hc-step-${item.id}-tab`}
            hidden={step !== index}
          >
            {item.groups.map((group) => <Fragment key={group}>{groups[group]}</Fragment>)}
            {/* «Каркас»: what to show of the frame — filled by the drawing's own frame view (ConfiguratorFrameView) */}
            {item.id === 'frame' && <div className="hc-frame-panel" id="hc-frame-panel" />}
            {/* after the last step, before the stamp: what happens once the brief is sent, in the route's own words —
                the whole route, with what the visitor does at each step, is the section under the configurator */}
            {!next && nextSteps && nextSteps.length > 0 && (
              <div className="hc-next" role="group" aria-labelledby="hc-next-title">
                <p className="hc-next-title" id="hc-next-title">Що далі, після запиту</p>
                <ol className="hc-next-steps">
                  {nextSteps.map((title, number) => (
                    <li key={title}><span className="hc-next-number" aria-hidden="true">{String(number + 1).padStart(2, '0')}</span>{title}</li>
                  ))}
                </ol>
                <a className="hc-next-more" href="#process">Увесь шлях і хто відповідає <span aria-hidden="true">↓</span></a>
              </div>
            )}
            <div className="hc-step-nav">
              {previous && (
                // the arrow alone, so the next step's button keeps the row beside it; named for what it opens
                <button
                  type="button"
                  className="hc-step-back"
                  aria-label={`Назад: ${previous.title}`}
                  title={`Назад: ${previous.title}`}
                  onClick={() => selectStep(index - 1, false, true)}
                >
                  <span aria-hidden="true">←</span>
                </button>
              )}
              {next ? (
                <button type="button" className="hc-step-next" onClick={() => selectStep(index + 1, false, true)}>
                  Далі: {next.title} <span aria-hidden="true">→</span>
                </button>
              ) : (
                // «До підсумку», as the stamp is named for screen readers (10.10, audit F10): «До зведення» read as «to
                // the construction» on a builder's site
                <a className="hc-step-next" href="#hc-stamp">
                  До підсумку <span aria-hidden="true">↓</span>
                </a>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
