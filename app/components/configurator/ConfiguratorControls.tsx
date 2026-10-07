'use client';

import { Fragment, useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import {
  CONTROL_GROUP_TITLES,
  CONTROL_STEPS,
  stepOfGroup,
  type ControlGroupId,
} from '../../lib/configurator/controlGroups';
import { NBSP, formatRoofSlope, formatSize } from '../../lib/configurator/deriveSummary';
import { deriveDomainModel, resolveRidgeHeightM, withRidge, withSpanRuleRidge } from '../../lib/configurator/domainModel';
import {
  BUILD_REGIONS,
  LIFTING_EQUIPMENT_LABELS,
  LIFTING_EQUIPMENT_ORDER,
  PROJECT_STATUS_LABELS,
  PROJECT_STATUS_ORDER,
  PURPOSE_LABELS,
  PURPOSE_ORDER,
  UNKNOWN_REGION_LABEL,
  isBuildRegion,
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
  ENVELOPE_LABELS,
  ENVELOPE_MATERIAL_PRESET,
  FOUNDATION_TYPE_LABELS,
  FOUNDATION_TYPE_ORDER,
  DOOR_LABELS,
  DOOR_OPTIONS,
  GATES_OPTIONS,
  GATE_TYPE_LABELS,
  GATE_TYPE_ORDER,
  SCOPE_LABELS,
  SCOPE_ORDER,
  clampDimension,
  hasScopeItem,
  toggleScopeItem,
  withConfirmed,
  INTERNAL_SUPPORTS_LABELS,
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
};

/**
 * Numbers are shown with the Ukrainian decimal comma so the readout above a field and the value
 * inside it never disagree — a native `type="number"` localises its own display, which is how
 * "7.5 м" ended up sitting over a box reading "7,5".
 */
function formatMetres(value: number): string {
  return value.toLocaleString('uk-UA', { maximumFractionDigits: 2 });
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
  if (parsed > max) return `Найбільше можливе значення — ${formatMetres(max)}${NBSP}м.`;
  if (parsed < min) return `Найменше можливе значення — ${formatMetres(min)}${NBSP}м.`;
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
    const parsed = parseMetres(draft ?? '');
    // An abandoned or nonsensical entry falls back to the last good value rather than to the
    // minimum — clearing the field and clicking away should not silently reset the object.
    const committed = parsed === null ? value : clamp(parsed);
    if (draft !== null) setNote(clampNote(parsed, min, max, parsed === null ? value : committed, step));
    onCommit(committed);
    setDraft(null);
  }

  const range = `Від ${formatMetres(min)} до ${formatMetres(max)}${NBSP}м${step < 1 ? `, крок ${formatMetres(step)}${NBSP}м` : ''}.`;
  return (
    <div className="hc-field">
      <div className="hc-field-head">
        <label htmlFor={inputId}>{label}</label>
        <span className="hc-field-value">{formatMetres(value)}{NBSP}м</span>
      </div>
      <div className="hc-field-controls">
        {/* Named by the label alone, with its value in metres: it was «Ширина, слайдер» and a bare «10.600000381469727» */}
        <input
          type="range"
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
      </div>
      {hint ? (
        <p className="hc-field-hint" id={`${inputId}-hint`}>
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

const PHONE_QUERY = '(max-width: 760px)';

/** Brings the steps' tabs back into view after a step changed from below them: under the site header, and on a phone
 *  under the mini drawing held below it as well (useMiniPreview in HangarConfigurator.tsx). Twice, because arriving at
 *  the controls switches the drawing to its compact size a frame later. Left alone when they are already in view. */
function landOnSteps(tabs: HTMLElement) {
  const land = () => {
    const phone = window.matchMedia(PHONE_QUERY).matches;
    const stage = phone ? tabs.closest('.hangar-configurator-embedded .hc-layout')?.querySelector<HTMLElement>('.hc-preview-surface') : null;
    const covered = (document.querySelector('.site-header')?.getBoundingClientRect().bottom ?? 0) + (stage?.offsetHeight ?? 0);
    const top = tabs.getBoundingClientRect().top;
    if (top < covered || top > window.innerHeight * 0.5) window.scrollBy({ top: top - covered - 8, behavior: 'instant' });
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
  return (
    <section className="hc-control-group" aria-labelledby={headingId} data-group={id}>
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
}: Readonly<{ step: number; answered: readonly boolean[]; onSelect: (index: number, focus?: boolean) => void }>) {
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
          onClick={() => onSelect(index)}
          onKeyDown={(event) => onKeyDown(event, index)}
        >
          <span className="hc-step-number" aria-hidden="true">{index + 1}</span>
          <span className="hc-step-title">{item.title}</span>
        </button>
      ))}
    </div>
    {/* A phone shows the tabs' numbers only: the step on show is named under them (07.10) */}
    <p className="hc-step-current" aria-hidden="true">Крок {step + 1} з {CONTROL_STEPS.length} · {CONTROL_STEPS[step].title}</p>
    </>
  );
}

/** Says why the openings shown are not the ones chosen. It used to warn «оберіть менший тип» while the sizes had
 *  already dropped the visitor's gates for good; now they are held and come back (04.10). */
function heldOpeningsNote(gatesHeld: boolean, doorHeld: boolean): string | null {
  if (gatesHeld && doorHeld) {
    return 'Обрані ворота й двері не поміщаються за поточних розмірів будівлі, тому в конфігурації лише те, що поміщається. Ваш вибір повернеться, щойно розміри це дозволять.';
  }
  if (gatesHeld) {
    return 'Обрані ворота не поміщаються за поточних розмірів будівлі, тому в конфігурації лише ті, що поміщаються. Ваш вибір повернеться, щойно розміри це дозволять.';
  }
  if (doorHeld) return 'Для дверей немає місця за цієї ширини й цих воріт, тому в конфігурації їх немає. Вони повернуться, щойно місце знайдеться.';
  return null;
}

/** «Чи потрібне утеплення?» answered in the visitor's words (07.10) */
const ENVELOPE_CHOICE_WORDS: Record<EnvelopeChoice, string> = { cold: 'Без утеплення', insulated: 'Утеплений', undecided: 'Ще не знаю' };

const DIMENSION_FIELD_LABELS: Record<keyof Dimensions, string> = {
  width: 'Ширина',
  length: 'Довжина',
  height: 'Висота стін',
};

export function ConfiguratorControls({ state, onChange, step, onStep: setStep, foundationChoice = true }: Readonly<Props>) {
  const tabsRef = useRef<HTMLDivElement>(null);
  // The same resolved model the summary reads, so a folded header and the ridge hint never disagree with the stamp
  const domain = useMemo(() => deriveDomainModel(state), [state]);
  // The ridge's legal range depends on the CURRENT width and eave height, so it is recomputed on every render rather
  // than read from a static table. The value shown is the resolved one: the span rule's until the visitor edits it.
  const ridgeRange = ridgeHeightRangeM(state.dimensions.width, state.dimensions.height);
  const ridgeValue = resolveRidgeHeightM(state);
  const ridgeRangeText = `Діапазон для цієї ширини й висоти стін: ${formatMetres(ridgeRange.min)}–${formatMetres(ridgeRange.max)}${NBSP}м.`;
  const ridgeNow = `Коник ${formatMetres(ridgeValue)}${NBSP}м · ${formatRoofSlope(domain.roof.pitchDeg, true)}`;
  // The visitor's ridge is kept as typed and held in the range here (04.10), so a ridge the sizes moved is said to be the
  // range's end, not «ваше значення» — the hint used to call a clamped 8,3 м the visitor's after they typed 11,5 м
  let ridgeHint = `${ridgeNow}. Поки ви не задали коник самі, ухил підбирається за шириною ангара. ${ridgeRangeText}`;
  if (state.ridgeEdited) {
    const typed = `Ваші ${formatMetres(state.ridgeHeightM)}${NBSP}м повернуться, щойно розміри це дозволять.`;
    if (ridgeValue === state.ridgeHeightM) ridgeHint = `${ridgeNow} — ваше значення. ${ridgeRangeText}`;
    else if (ridgeValue > state.ridgeHeightM) ridgeHint = `${ridgeNow} — найнижчий для цієї ширини й висоти стін. ${typed}`;
    else ridgeHint = `${ridgeNow} — найвищий для цієї ширини й висоти стін. ${typed}`;
  }

  // A link elsewhere on the page that names a group (the frame drawing's «Змінити габарити ↑», data-open-group) opens its
  // step and lands on the group's heading: with the steps, «Розміри» may be behind another tab.
  useEffect(() => {
    const openFromLink = (event: MouseEvent) => {
      const link = (event.target as Element | null)?.closest<HTMLAnchorElement>('a[data-open-group]');
      const id = link?.dataset.openGroup as ControlGroupId | undefined;
      if (!id || !(id in GROUP_HEADING_IDS)) return;
      const tabs = tabsRef.current;
      if (!tabs) return;
      event.preventDefault();
      // the address follows the visitor back up: it kept «#inquiry» from an earlier reveal (04.10)
      if (link?.hash) window.history.replaceState(null, '', link.hash);
      setStep(stepOfGroup(id));
      window.requestAnimationFrame(() => landOnSteps(tabs));
    };
    document.addEventListener('click', openFromLink);
    return () => document.removeEventListener('click', openFromLink);
  }, [setStep]);

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

  function setEnvelope(envelope: EnvelopeChoice) {
    // brief §18: cold/insulated set a sensible STARTING wall/roof system, not a locked rule — a
    // later independent override of either still sticks (see ENVELOPE_MATERIAL_PRESET's own doc
    // comment). `undecided` applies nothing: "independent material choices remain available" is
    // the brief's own wording for that specific option.
    const preset = envelope === 'undecided' ? null : ENVELOPE_MATERIAL_PRESET[envelope];
    // the materials the preset sets are a starting point, not the visitor's answer about them
    onChange(withConfirmed({
      ...state,
      envelope,
      ...(preset ? { wallSystem: preset.wallSystem, roofSystem: preset.roofSystem } : {}),
    }, 'envelope'));
  }

  function setWallSystem(wallSystem: CladdingSystem) {
    onChange(withConfirmed({ ...state, wallSystem }, 'cladding'));
  }

  function setRoofSystem(roofSystem: CladdingSystem) {
    onChange(withConfirmed({ ...state, roofSystem }, 'cladding'));
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

  // «Комплекс робіт» and «Допоможіть визначити» draw the whole set; «Окремі роботи» opens the list as it stands
  function setScopeMode(scopeMode: ScopeMode) {
    onChange(withConfirmed({ ...state, scopeMode, scope: scopeMode === 'partial' ? state.scope : [...SCOPE_ORDER] }, 'scope'));
  }

  function setScope(item: (typeof SCOPE_ORDER)[number]) {
    onChange(withConfirmed({ ...state, scope: toggleScopeItem(state.scope, item) }, 'scope'));
  }

  // The openings as placed — held to what fits at these sizes (deriveDomainModel). The controls show these; the
  // visitor's own choice stays in the state and returns once it fits (04.10).
  const shown = { gates: domain.gates, gateType: domain.gateType, doors: domain.doors };
  const gatesHeld = state.gates !== shown.gates || state.gateType !== shown.gateType;
  const doorHeld = state.doors !== shown.doors;
  const wallsInScope = state.scope.includes('walls');
  const heldNote = wallsInScope ? heldOpeningsNote(gatesHeld, doorHeld) : null;
  const roofInScope = state.scope.includes('roof');
  const foundationInScope = state.scope.includes('foundation');
  // "Контур" sets the wall AND roof systems together, so it stays available while either surface
  // is being asked for.
  const hasEnvelopeScope = wallsInScope || roofInScope;
  const { objectProfile } = state;
  // A step is answered once the visitor set something in it themselves (types.ts ConfirmedTopic)
  const answered = CONTROL_STEPS.map((item) => {
    if (item.id === 'task') return objectProfile.purpose !== null || objectProfile.region !== 'unknown';
    if (item.id === 'size') return state.confirmed.includes('dimensions') || state.sizesUnknown;
    if (item.id === 'shell') return ['envelope', 'cladding', 'openings'].some((topic) => state.confirmed.includes(topic as ConfirmedTopic));
    if (item.id === 'frame') return state.internalSupports !== 'unknown' || objectProfile.lifting !== 'unknown';
    return state.confirmed.includes('scope') || objectProfile.project !== 'unknown';
  });

  // The groups, each placed in its step below
  const groups: Record<ControlGroupId, ReactNode> = {
    // «Об’єкт» (owner, 03.10) is split by where each answer matters (07.10, controlGroups.ts). Every question is optional
    // and starts unanswered, so a visitor who skips it sends nothing from it.
    need: (
      <ControlGroup id="need">
        <p className="hc-field-note hc-object-note">Дві відповіді, обидві можна пропустити: від них залежить, що запропонуємо.</p>
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
                  onChange={() => setObjectProfile({ purpose: option })}
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
                onChange={() => setObjectProfile({ purpose: null })}
              />
              <span>Ще не знаю</span>
            </label>
          </div>
        </div>
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
          <div className="hc-field-head">
            <span id="hc-supports-label">Колони всередині ангара</span>
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
                <span>{INTERNAL_SUPPORTS_LABELS[option]}</span>
              </label>
            ))}
          </div>
          <p className="hc-field-note">
            Ряд колон посередині ділить проліт навпіл. Якщо простір має лишитися вільним, скажіть «Не можна»: креслення
            покаже проліт без опор, а розрахунок підбере ферму під нього.
          </p>
        </div>
        <div className="hc-field">
          <div className="hc-field-head">
            <span id="hc-lifting-label">Підйомне обладнання</span>
          </div>
          <div className="hc-option-cards hc-chips" role="radiogroup" aria-labelledby="hc-lifting-label">
            {LIFTING_EQUIPMENT_ORDER.map((option) => (
              <label key={option} className="hc-option-card">
                <input
                  type="radio"
                  name="hc-lifting"
                  value={option}
                  checked={objectProfile.lifting === option}
                  onChange={() => setObjectProfile({ lifting: option })}
                />
                <span>{LIFTING_EQUIPMENT_LABELS[option]}</span>
              </label>
            ))}
          </div>
        </div>
      </ControlGroup>
    ),
    project: (
      <ControlGroup id="project">
        <div className="hc-field">
          <div className="hc-field-head">
            <span id="hc-project-label">Проєкт є?</span>
          </div>
          <div className="hc-option-cards hc-chips" role="radiogroup" aria-labelledby="hc-project-label">
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
        {/* The ridge is a refinement, not a first question (07.10): folded, unless the visitor set it */}
        <details className="hc-more" open={state.ridgeEdited || undefined}>
          <summary>Висота в конику — за потреби</summary>
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
            <button type="button" className="hc-field-reset" onClick={() => onChange(withConfirmed(withSpanRuleRidge(state), 'dimensions'))}>Підбирати ухил за шириною</button>
          )}
        </NumericField>
        </details>
      </ControlGroup>
    ),
    envelope: (
      <ControlGroup id="envelope">
        <div className="hc-option-cards" role="radiogroup" aria-labelledby="hc-envelope-heading">
          {(Object.keys(ENVELOPE_LABELS) as EnvelopeChoice[]).map((option) => (
            <label key={option} className="hc-option-card" aria-disabled={!hasEnvelopeScope}>
              <input
                type="radio"
                name="hc-envelope"
                checked={state.envelope === option}
                disabled={!hasEnvelopeScope}
                onChange={() => setEnvelope(option)}
              />
              <span>{ENVELOPE_CHOICE_WORDS[option]}</span>
            </label>
          ))}
        </div>
        {hasEnvelopeScope ? (
          <p className="hc-field-note">«Утеплений» одразу ставить сендвіч-панелі — нижче їх можна змінити.</p>
        ) : (
          <p className="hc-field-note hc-field-note-warning">
            Утеплення стосується стін і покрівлі — увімкніть їх в «Обсязі робіт», щоб обрати.
          </p>
        )}
      </ControlGroup>
    ),
    cladding: (
      <ControlGroup id="cladding">
        <div className="hc-field">
          <div className="hc-field-head">
            <span id="hc-wall-system-label">Стіни</span>
          </div>
          <div className="hc-option-cards" role="radiogroup" aria-labelledby="hc-wall-system-label">
            {CLADDING_SYSTEM_ORDER.map((option) => (
              <label key={option} className="hc-option-card" aria-disabled={!wallsInScope}>
                <input
                  type="radio"
                  name="hc-wall-system"
                  checked={state.wallSystem === option}
                  disabled={!wallsInScope}
                  onChange={() => setWallSystem(option)}
                />
                <span>{CLADDING_SYSTEM_LABELS[option]}</span>
              </label>
            ))}
          </div>
          {!wallsInScope && (
            <p className="hc-field-note">Стіни не входять в обсяг заявки.</p>
          )}
        </div>
        <div className="hc-field">
          <div className="hc-field-head">
            <span id="hc-roof-system-label">Покрівля</span>
          </div>
          <div className="hc-option-cards" role="radiogroup" aria-labelledby="hc-roof-system-label">
            {CLADDING_SYSTEM_ORDER.map((option) => (
              <label key={option} className="hc-option-card" aria-disabled={!roofInScope}>
                <input
                  type="radio"
                  name="hc-roof-system"
                  checked={state.roofSystem === option}
                  disabled={!roofInScope}
                  onChange={() => setRoofSystem(option)}
                />
                <span>{CLADDING_SYSTEM_LABELS[option]}</span>
              </label>
            ))}
          </div>
          {!roofInScope && (
            <p className="hc-field-note">Покрівля не входить в обсяг заявки.</p>
          )}
        </div>
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
              <input type="radio" name="hc-scope-mode" checked={state.scopeMode === option} onChange={() => setScopeMode(option)} />
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
        <p className="hc-field-note">
          {state.scopeMode === 'help'
            ? 'Розберемо разом, що робимо ми, а що організуємо, — після перегляду ваших даних.'
            : 'Склад робіт уточнимо після перегляду проєкту.'}
        </p>
      </ControlGroup>
    ),
    openings: (
      <ControlGroup id="openings">
        {!wallsInScope && (
          <p className="hc-field-note hc-field-note-warning">
            Ворота й двері — це прорізи в стінах. Увімкніть «Стіни / огороджувальний контур» в
            «Обсязі заявки», щоб їх обрати. Поточний вибір збережеться.
          </p>
        )}
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
                />
                <span>{option}</span>
              </label>
            );
          })}
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
                  />
                  {/* the size in the name (07.10), not in a note under the buttons */}
                  <span>{GATE_TYPE_LABELS[option]} · {formatSize(GATE_DIMENSIONS_M[option].widthM, GATE_DIMENSIONS_M[option].heightM)}</span>
                </label>
              );
            })}
          </div>
        )}
        <div className="hc-field hc-door-field">
          <div className="hc-field-head">
            <span id="hc-doors-label">Двері</span>
          </div>
          {/* Chips at their own width, like «Об’єкт»: «Без дверей» broke into two lines in a 68 px tile (04.10) */}
          <div className="hc-option-cards hc-chips hc-door-options" role="radiogroup" aria-labelledby="hc-doors-label">
            {DOOR_OPTIONS.map((option) => {
              // Disabled rather than hidden, and only ever for a real reason: at this width the
              // door has no position clear of the corners, the gates and the centre-support line.
              const disabled = option > 0 && (!wallsInScope || !doorFits(shown.gates, shown.gateType, state.dimensions.width));
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
                  />
                  <span>{DOOR_LABELS[option]}</span>
                </label>
              );
            })}
          </div>
          {/* Without gates the door goes to the quarter points of the gable end (doorCandidateXs): it said «поруч із
              воротами» there too (04.10) */}
          <p className="hc-field-note">
            Службові двері{NBSP}— {formatSize(DOOR_DIMENSIONS_M.widthM, DOOR_DIMENSIONS_M.heightM)}. Розташування визначається
            автоматично: {shown.gates > 0
              ? 'поруч із воротами, поза їхнім прорізом і без перетину з колонами.'
              : 'у торцевій стіні, без перетину з колонами.'}
          </p>
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
                <a className="hc-step-next" href="#hc-stamp">
                  До зведення <span aria-hidden="true">↓</span>
                </a>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
