'use client';

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from 'react';
import { CONTROL_GROUP_TITLES, describeControlGroups, type ControlGroupId } from '../../lib/configurator/controlGroups';
import { formatRoofSlope } from '../../lib/configurator/deriveSummary';
import { deriveDomainModel, resolveRidgeHeightM } from '../../lib/configurator/domainModel';
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
  clampDoorSelection,
  clampGateSelection,
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
  type CladdingSystem,
  type ConfiguratorState,
  type DoorCount,
  type Dimensions,
  type EnvelopeChoice,
  type FoundationType,
  type GateType,
  type GatesCount,
} from '../../lib/configurator/types';
import { ConfiguratorWhy } from './ConfiguratorWhy';
import './configurator-controls.css';

type Props = {
  state: ConfiguratorState;
  onChange: (next: ConfiguratorState) => void;
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
  clamp,
  onCommit,
}: {
  inputId: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  hint?: string;
  clamp: (value: number) => number;
  onCommit: (value: number) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);

  function handleTyped(raw: string) {
    setDraft(raw);
    const parsed = parseMetres(raw);
    // Commit live only once the entry is already within range, so the preview keeps up with
    // typing without the field ever being rewritten underneath the caret.
    if (parsed !== null && parsed >= min && parsed <= max) onCommit(clamp(parsed));
  }

  function handleBlur() {
    const parsed = parseMetres(draft ?? '');
    // An abandoned or nonsensical entry falls back to the last good value rather than to the
    // minimum — clearing the field and clicking away should not silently reset the object.
    onCommit(parsed === null ? value : clamp(parsed));
    setDraft(null);
  }

  return (
    <div className="hc-field">
      <div className="hc-field-head">
        <label htmlFor={inputId}>{label}</label>
        <span className="hc-field-value">{formatMetres(value)} м</span>
      </div>
      <div className="hc-field-controls">
        <input
          type="range"
          aria-label={`${label}, слайдер`}
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(event) => onCommit(clamp(Number(event.target.value)))}
        />
        <input
          id={inputId}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          aria-describedby={hint ? `${inputId}-hint` : undefined}
          value={draft ?? formatMetres(value)}
          onChange={(event) => handleTyped(event.target.value)}
          onBlur={handleBlur}
        />
      </div>
      {hint && (
        <p className="hc-field-hint" id={`${inputId}-hint`}>
          {hint}
        </p>
      )}
    </div>
  );
}

/* ── Phone accordion (/angary, 03.10) ──────────────────────────────────────────────────────────────────────────────
   On a phone the groups were 2 screens of controls under the mini drawing. At ≤ 760 px on /angary they fold: one group
   open at a time, each header saying what is set in it. Rendered on the server and without JavaScript as before —
   plain headings, every group open — and the research screen (/configurator-preview) keeps its open groups: it has no
   mini drawing to scroll under, and like every other /angary-only phone rule this is keyed on the embedded layout. */

const PHONE_QUERY = '(max-width: 760px)';

function subscribePhone(onChange: () => void) {
  const media = window.matchMedia(PHONE_QUERY);
  media.addEventListener('change', onChange);
  return () => media.removeEventListener('change', onChange);
}

const isPhone = () => window.matchMedia(PHONE_QUERY).matches;
const notOnServer = () => false;

function usePhoneAccordion() {
  const phone = useSyncExternalStore(subscribePhone, isPhone, notOnServer);
  const [embedded, setEmbedded] = useState(false);
  const controlsRef = useCallback((node: HTMLDivElement | null) => {
    if (node) setEmbedded(node.closest('.hangar-configurator-embedded') !== null);
  }, []);
  return { controlsRef, accordion: phone && embedded };
}

/** Opening a group folds the one above it, so its header can jump up under the mini drawing held below the site header
 *  (useMiniPreview in HangarConfigurator.tsx) or above the screen: bring it back just under the drawing. The drawing is
 *  counted even when it is not stuck yet: the observer sticks it a moment after this jump, and a header placed under
 *  the site header alone was then covered by it. */
function keepHeaderInView(header: HTMLElement) {
  const stage = header.closest('.hc-layout')?.querySelector<HTMLElement>('.hc-preview-surface');
  const covered = (document.querySelector('.site-header')?.getBoundingClientRect().bottom ?? 0) + (stage?.offsetHeight ?? 0);
  const top = header.getBoundingClientRect().top;
  if (top < covered) window.scrollBy({ top: top - covered - 8, behavior: 'instant' });
}

/** Brings a header just under the site header and the mini drawing, from above or below — twice, because arriving at the
 *  controls switches the drawing to its compact size a frame later */
function landOnHeader(header: HTMLElement) {
  const land = () => {
    const stage = header.closest('.hc-layout')?.querySelector<HTMLElement>('.hc-preview-surface');
    const covered = (document.querySelector('.site-header')?.getBoundingClientRect().bottom ?? 0) + (stage?.offsetHeight ?? 0);
    window.scrollBy({ top: header.getBoundingClientRect().top - covered - 8, behavior: 'instant' });
  };
  land();
  window.requestAnimationFrame(() => window.requestAnimationFrame(land));
}

// The ids the groups have always had: page sections and tests point at them
const GROUP_HEADING_IDS: Record<ControlGroupId, string> = {
  object: 'hc-object-heading',
  dimensions: 'hc-dimensions-heading',
  envelope: 'hc-envelope-heading',
  cladding: 'hc-cladding-heading',
  foundation: 'hc-foundation-heading',
  scope: 'hc-scope-heading',
  openings: 'hc-gates-heading',
};

function ControlGroup({
  id,
  accordion,
  open,
  value,
  onToggle,
  children,
}: Readonly<{
  id: ControlGroupId;
  accordion: boolean;
  open: boolean;
  value: string;
  onToggle: (id: ControlGroupId, header: HTMLElement) => void;
  children: ReactNode;
}>) {
  const headingId = GROUP_HEADING_IDS[id];
  const panelId = `hc-${id}-panel`;
  return (
    <section className="hc-control-group" aria-labelledby={headingId} data-group={id}>
      {accordion ? (
        <h3 className="hc-group-heading">
          {/* The button's name is the title and the value: a folded group is announced with what is set in it */}
          <button
            type="button"
            className="hc-group-toggle"
            aria-expanded={open}
            aria-controls={panelId}
            onClick={(event) => onToggle(id, event.currentTarget)}
          >
            <span className="hc-group-title" id={headingId}>{CONTROL_GROUP_TITLES[id]}</span>
            <span className="hc-group-value">{value}</span>
          </button>
        </h3>
      ) : (
        <h3 id={headingId}>{CONTROL_GROUP_TITLES[id]}</h3>
      )}
      <div className="hc-group-panel" id={panelId} hidden={accordion && !open}>
        {children}
      </div>
    </section>
  );
}

const DIMENSION_FIELD_LABELS: Record<keyof Dimensions, string> = {
  width: 'Ширина',
  length: 'Довжина',
  height: 'Висота стін',
};

export function ConfiguratorControls({ state, onChange, foundationChoice = true }: Props) {
  const { controlsRef, accordion } = usePhoneAccordion();
  // The first group open on a phone; one at a time after that, and every group may be folded
  const [openGroup, setOpenGroup] = useState<ControlGroupId | null>('object');
  // The same resolved model the summary reads, so a folded header and the ridge hint never disagree with the stamp
  const domain = useMemo(() => deriveDomainModel(state), [state]);
  const groupValues = describeControlGroups(domain);
  // The ridge's legal range depends on the CURRENT width and eave height, so it is recomputed on every render rather
  // than read from a static table. The value shown is the resolved one: the span rule's until the visitor edits it.
  const ridgeRange = ridgeHeightRangeM(state.dimensions.width, state.dimensions.height);
  const ridgeValue = resolveRidgeHeightM(state);
  const ridgeRangeText = `Діапазон для цієї ширини й висоти стін: ${formatMetres(ridgeRange.min)}–${formatMetres(ridgeRange.max)} м.`;
  const ridgeHint = state.ridgeEdited
    ? `Коник ${formatMetres(ridgeValue)} м · ${formatRoofSlope(domain.roof.pitchDeg, true)} — ваше значення. ${ridgeRangeText}`
    : `Коник ${formatMetres(ridgeValue)} м · ${formatRoofSlope(domain.roof.pitchDeg, true)}. Поки ви не задали коник самі, ухил підбирається за шириною ангара. ${ridgeRangeText}`;

  // A link elsewhere on the page that names a group (the frame drawing's «Змінити габарити ↑», data-open-group) opens it
  // on a phone and lands on its header — it used to arrive at the configurator with «Розміри» folded (03.10). Without the
  // accordion the link's own anchor scrolls as usual.
  useEffect(() => {
    if (!accordion) return undefined;
    const openFromLink = (event: MouseEvent) => {
      const link = (event.target as Element | null)?.closest<HTMLAnchorElement>('a[data-open-group]');
      const id = link?.dataset.openGroup as ControlGroupId | undefined;
      if (!id || !(id in GROUP_HEADING_IDS)) return;
      event.preventDefault();
      setOpenGroup(id);
      window.requestAnimationFrame(() => {
        const header = document.querySelector<HTMLElement>(`.hangar-configurator-embedded [data-group="${id}"] .hc-group-toggle`);
        if (!header) return;
        landOnHeader(header);
        header.focus({ preventScroll: true });
      });
    };
    document.addEventListener('click', openFromLink);
    return () => document.removeEventListener('click', openFromLink);
  }, [accordion]);

  function toggleGroup(id: ControlGroupId, header: HTMLElement) {
    const opening = openGroup !== id;
    setOpenGroup(opening ? id : null);
    // React commits a click's update before the next frame: measure once the group above has folded
    if (opening) window.requestAnimationFrame(() => keepHeaderInView(header));
  }

  function groupProps(id: ControlGroupId) {
    return { id, accordion, open: openGroup === id, value: groupValues[id], onToggle: toggleGroup };
  }

  function setDimension(key: keyof Dimensions, value: number) {
    const dimensions = { ...state.dimensions, [key]: value };
    onChange({
      ...state,
      dimensions,
      // The ridge moves with the footprint in the same update — on the span rule until the visitor has set it, held in
      // the new legal range after — so the two can never be committed out of step with each other.
      ridgeHeightM: resolveRidgeHeightM({ ...state, dimensions }),
      // Phase 3F.1: same reasoning — a fixed-size gate selection legal at the OLD footprint may
      // not be at the new one (see clampGateSelection's own doc comment in parametricModel.ts).
      // The control panel below also disables an option before it can be picked in the first
      // place; this is the reactive fallback for a selection the customer already made.
      ...clampGateSelection(state.gates, state.gateType, dimensions.width, dimensions.height),
      ...clampDoorSelection(state.doors, state.gates, state.gateType, dimensions.width),
    });
  }

  function setRidge(ridgeHeightM: number) {
    // Only a changed value is the visitor's own ridge: focusing the field and leaving it (a blur commits the value it
    // shows) must not stop the ridge following the width.
    if (ridgeHeightM === ridgeValue) return;
    onChange({ ...state, ridgeHeightM, ridgeEdited: true });
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
    onChange({
      ...state,
      envelope,
      ...(preset ? { wallSystem: preset.wallSystem, roofSystem: preset.roofSystem } : {}),
    });
  }

  function setWallSystem(wallSystem: CladdingSystem) {
    onChange({ ...state, wallSystem });
  }

  function setRoofSystem(roofSystem: CladdingSystem) {
    onChange({ ...state, roofSystem });
  }

  function setFoundationType(foundationType: FoundationType) {
    onChange({ ...state, foundationType });
  }

  // Changing the gates changes where a door may legally go, so the door is re-clamped with them
  // — the same reason `setDimension` re-clamps both.
  function setGates(gates: GatesCount) {
    onChange({ ...state, gates, ...clampDoorSelection(state.doors, gates, state.gateType, state.dimensions.width) });
  }

  function setGateType(gateType: GateType) {
    onChange({ ...state, gateType, ...clampDoorSelection(state.doors, state.gates, gateType, state.dimensions.width) });
  }

  function setDoors(doors: DoorCount) {
    onChange({ ...state, doors });
  }

  function setScope(item: (typeof SCOPE_ORDER)[number]) {
    onChange({ ...state, scope: toggleScopeItem(state.scope, item) });
  }

  const wallsInScope = state.scope.includes('walls');
  const roofInScope = state.scope.includes('roof');
  const foundationInScope = state.scope.includes('foundation');
  // "Контур" sets the wall AND roof systems together, so it stays available while either surface
  // is being asked for.
  const hasEnvelopeScope = wallsInScope || roofInScope;
  const { objectProfile } = state;

  return (
    <div className="hc-controls" ref={controlsRef} data-accordion={accordion ? '' : undefined}>
      {/* «Об’єкт» first (owner, 03.10): what the hangar is for and where it stands come before its sizes. Every
          question is optional and starts unanswered, so a visitor who skips it sends nothing from it. */}
      <ControlGroup {...groupProps('object')}>
        <p className="hc-field-note hc-object-note">Необов’язково — можна пропустити й уточнити під час розмови.</p>
        <div className="hc-field">
          <div className="hc-field-head">
            <span id="hc-purpose-label">Для чого ангар?</span>
          </div>
          <div className="hc-option-cards hc-chips" role="radiogroup" aria-labelledby="hc-purpose-label">
            {PURPOSE_ORDER.map((option) => (
              <label key={option} className="hc-option-card">
                <input
                  type="radio"
                  name="hc-purpose"
                  value={option}
                  checked={objectProfile.purpose === option}
                  onChange={() => setObjectProfile({ purpose: option })}
                  // The purpose has no «Ще не знаю» chip (the owner's list): the chosen chip clicked again is taken back
                  onClick={() => {
                    if (objectProfile.purpose === option) setObjectProfile({ purpose: null });
                  }}
                />
                <span>{PURPOSE_LABELS[option]}</span>
              </label>
            ))}
          </div>
        </div>
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
        <div className="hc-field">
          <div className="hc-field-head">
            <label htmlFor="hc-object-region">Область будівництва</label>
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
        <ConfiguratorWhy topic="object" />
      </ControlGroup>

      {/* "Обсяг заявки" is the master fact for everything below it. A cladding system, a colour
          or an opening for a surface the customer is not asking for is not something they can
          order, and offering it is how the summary ended up contradicting its own Обсяг line. The
          controls are DISABLED, never cleared: dropping walls to look at the frame and putting
          them back must not cost the visitor their gate choice. */}
      <ControlGroup {...groupProps('dimensions')}>
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
        />
      </ControlGroup>

      <ControlGroup {...groupProps('envelope')}>
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
              <span>{ENVELOPE_LABELS[option]}</span>
            </label>
          ))}
        </div>
        {!hasEnvelopeScope && (
          <p className="hc-field-note hc-field-note-warning">
            Контур описує стіни та покрівлю — увімкніть їх в «Обсязі заявки», щоб обрати.
          </p>
        )}
        <ConfiguratorWhy topic="contour" />
      </ControlGroup>

      <ControlGroup {...groupProps('cladding')}>
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
        <ConfiguratorWhy topic="cladding" />
      </ControlGroup>

      {/* Phase 3F.1: the read-only "Попередня конструктивна схема" info block that used to live
          here was removed — it duplicated the exact same fact already shown in the summary panel
          ("Ваш об'єкт") one scroll away, and having it in two places read as noise rather than
          information (live product review). The derived value itself (deriveStructuralVisualization)
          is unchanged and still surfaces exactly once, in ConfiguratorSummary.tsx. */}

      {foundationChoice && (
      <ControlGroup {...groupProps('foundation')}>
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
        <ConfiguratorWhy topic="foundation" />
      </ControlGroup>
      )}

      <ControlGroup {...groupProps('scope')}>
        <div className="hc-option-list">
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
        <p className="hc-field-note">Позначте, які роботи вас цікавлять. Їхній склад уточнимо після перегляду проєкту.</p>
      </ControlGroup>

      <ControlGroup {...groupProps('openings')}>
        {!wallsInScope && (
          <p className="hc-field-note hc-field-note-warning">
            Ворота і двері — це прорізи у стінах. Увімкніть «Стіни / огороджувальний контур» в
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
              || !gateHeightFits(state.gateType, state.dimensions.height)
              || option > maxGateCountThatFits(state.gateType, state.dimensions.width));
            return (
              <label key={option} className="hc-option-card" aria-disabled={disabled}>
                <input
                  type="radio"
                  name="hc-gates"
                  checked={state.gates === option}
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
        {state.gates > 0 && (
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
                || state.gates > maxGateCountThatFits(option, state.dimensions.width);
              return (
                <label key={option} className="hc-option-card" aria-disabled={disabled}>
                  <input
                    type="radio"
                    name="hc-gate-type"
                    checked={state.gateType === option}
                    disabled={disabled}
                    onChange={() => setGateType(option)}
                  />
                  <span>{GATE_TYPE_LABELS[option]}</span>
                </label>
              );
            })}
          </div>
        )}
        {state.gates > 0 && (
          <p className="hc-field-note">
            Стандартні ворота — {GATE_DIMENSIONS_M.standard.widthM}×{GATE_DIMENSIONS_M.standard.heightM} м,
            для заїзду техніки — {GATE_DIMENSIONS_M.double.widthM}×{GATE_DIMENSIONS_M.double.heightM} м.
          </p>
        )}
        <div className="hc-field hc-door-field">
          <div className="hc-field-head">
            <span id="hc-doors-label">Двері</span>
          </div>
          <div className="hc-option-cards hc-option-cards-compact" role="radiogroup" aria-labelledby="hc-doors-label">
            {DOOR_OPTIONS.map((option) => {
              // Disabled rather than hidden, and only ever for a real reason: at this width the
              // door has no position clear of the corners, the gates and the centre-support line.
              const disabled = option > 0 && (!wallsInScope || !doorFits(state.gates, state.gateType, state.dimensions.width));
              return (
                <label className="hc-option-card" key={option}>
                  <input
                    type="radio"
                    name="hc-doors"
                    value={option}
                    checked={state.doors === option}
                    disabled={disabled}
                    aria-disabled={disabled}
                    onChange={() => setDoors(option)}
                  />
                  <span>{DOOR_LABELS[option]}</span>
                </label>
              );
            })}
          </div>
          <p className="hc-field-note">
            Службові двері — {DOOR_DIMENSIONS_M.widthM.toString().replace('.', ',')}×
            {DOOR_DIMENSIONS_M.heightM.toString().replace('.', ',')} м. Розташування визначається
            автоматично: поруч із воротами, поза їх прорізом і без перетину з колонами.
          </p>
        </div>

        {state.gates > 0 && (!gateHeightFits(state.gateType, state.dimensions.height)
          || state.gates > maxGateCountThatFits(state.gateType, state.dimensions.width)) && (
          <p className="hc-field-note hc-field-note-warning">
            Обрані ворота не поміщаються за поточних розмірів будівлі — оберіть менший тип або
            кількість воріт, або збільште ширину чи висоту стін.
          </p>
        )}
        <ConfiguratorWhy topic="openings" />
      </ControlGroup>
    </div>
  );
}
