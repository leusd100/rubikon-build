'use client';

import { useEffect, useRef } from 'react';
import { NBSP, deriveSummary } from '../../lib/configurator/deriveSummary';
import type { HangarDomainModel } from '../../lib/configurator/domainModel';
import { deriveBayLayout, ridgeHeightM, trussPanelNodesM } from '../../lib/configurator/parametricModel';
import { objectProfileLine } from '../../lib/configurator/objectProfile';
import { DEFAULT_CONFIGURATOR_STATE, INTERNAL_SUPPORTS_LABELS, type ConfirmedTopic } from '../../lib/configurator/types';
import { anythingChosen, sizesProvenance } from '../../lib/configurator/domainModel';
import { keepShortWords } from '../../lib/typography';
import { useInquiryAttachment } from '../inquiry/InquiryAttachmentProvider';
import { revealAttachedBrief } from '../inquiry/revealAttachedBrief';
import { useHangarInquiryContext } from './HangarInquiryContext';

/** The configurator's one disclaimer (UX pass 2026-10: it replaced five — over the model, under the sizes, the gates,
 *  in the summary and over the frame schemes). Reworded 10.10 (audit F106): «Межі розмірів і розміри воріт» said
 *  «розмір» twice, «орієнтовні, не будівельні норми» broke off, and the picture is a «попередня схема», as the sheet
 *  names it (F101) — no site visit promised. Short words kept with the next one (F103: «навантажень і / умов»). */
const DISCLAIMER = keepShortWords(
  'Це попередня схема, а не проєктна документація. Діапазони габаритів і розміри воріт орієнтовні — це не будівельні '
  + 'норми. Конструкцію й фундамент визначає проєктувальник після розрахунку навантажень з урахуванням умов майданчика.',
);

function SummaryDisclaimer() {
  return <p className="hc-summary-disclaimer">{DISCLAIMER}</p>;
}

/** A value unchanged this long has settled: a slider's drag sends one every frame */
const MARK_SETTLE_MS = 160;

/** Marks an element for a moment when its value changes — never on the first render (styles: configurator.css) */
function useChangeMark<T extends HTMLElement>(value: string) {
  const ref = useRef<T>(null);
  const previous = useRef(value);
  useEffect(() => {
    const element = ref.current;
    if (previous.current === value || !element) return undefined;
    previous.current = value;
    // Marked once the value settles: a dragged slider changes it every frame, and the mark restarted on each one with
    // a forced layout (the class dropped, offsetWidth read) — 68 per drag across the stamp (04.10). A running mark
    // restarts in place.
    const timer = window.setTimeout(() => {
      const running = element.getAnimations().find((animation) => (animation as CSSAnimation).animationName === 'hc-changed');
      if (running) running.currentTime = 0;
      else element.classList.add('is-changed');
    }, MARK_SETTLE_MS);
    return () => window.clearTimeout(timer);
  }, [value]);
  useEffect(() => {
    const element = ref.current;
    if (!element) return undefined;
    // Off once it has run, so the next change starts it by adding the class again
    const done = (event: AnimationEvent) => {
      if (event.animationName === 'hc-changed') element.classList.remove('is-changed');
    };
    element.addEventListener('animationend', done);
    return () => element.removeEventListener('animationend', done);
  }, []);
  return ref;
}

/** A value the visitor did not choose says what it is (07.10): «приклад» — the page's example, left as it was — or
 *  «попередньо» — worked out by the configurator, for the designer to decide */
type Status = 'example' | 'suggested' | 'derived';
// «з прикладу», not «приклад» (08.10, audit: the short word read as «наприклад»); a screen reader hears what it means.
// «запропоновано» (10.10, QA): the cold store's warm shell is not the example's — the example is «Без утеплення»
const STATUS_WORDS: Record<Status, string> = { example: 'з прикладу', suggested: 'запропоновано', derived: 'попередньо' };
const STATUS_SPOKEN: Record<Status, string> = {
  example: ', значення з прикладу — ви його ще не обирали',
  suggested: ', запропоновано для холодильного складу — ви ще не підтвердили',
  derived: ', попередньо — визначає проєктувальник',
};

function StatusTag({ status }: Readonly<{ status?: Status }>) {
  if (!status) return null;
  return (
    <span className="hc-fact-status" data-status={status}>
      {STATUS_WORDS[status]}<span className="hc-visually-hidden">{STATUS_SPOKEN[status]}</span>
    </span>
  );
}

function Fact({
  label,
  value,
  wide = false,
  purpose = false,
  status,
}: Readonly<{ label: string; value: string; wide?: boolean; purpose?: boolean; status?: Status }>) {
  const ref = useChangeMark<HTMLDivElement>(value);
  const className = [wide && 'is-wide', purpose && 'hc-fact-purpose'].filter(Boolean).join(' ') || undefined;
  return (
    <div ref={ref} className={className} data-status={status}>
      <dt>{label} <StatusTag status={status} /></dt>
      {/* a new element for a new value: a page translation replaced the text node, and the old value stayed (08.10) */}
      <dd key={value}>{value}</dd>
    </div>
  );
}

/** The stamp's thumbnail: the configured hangar's section and plan, to proportion, with the frames' rhythm in the plan.
 *  No numbers — they are written beside it. */
function SummarySketch({ domain }: Readonly<{ domain: HangarDomainModel }>) {
  const { widthM: W, lengthM: L, eaveHeightM: E } = domain.dimensions;
  const R = ridgeHeightM(W, E, domain.roof.pitchDeg);
  const truss = domain.structural.roofStructure === 'truss';
  const centre = domain.structural.scheme === 'centerSupport';
  const base = 54;
  const k = Math.min(104 / W, 44 / R);
  const x0 = 6 + (104 - W * k) / 2;
  const X = (x: number) => (x0 + x * k).toFixed(1);
  const Z = (z: number) => (base - z * k).toFixed(1);
  const roofZ = (x: number) => E + (R - E) * (1 - Math.abs(x - W / 2) / (W / 2));
  // The truss as the configurator and the frame tour draw it (trussPanelNodesM): odd panel points on the top chord, even
  // ones on the bottom chord, a vertical under the ridge — so the centre column lands on a node here too. It was six
  // panels with a diagonal apex at the ridge and the column between nodes, the drawing 003b8e9 had corrected (04.10).
  const web = truss
    ? `M${trussPanelNodesM(W).panelXsM.slice(1, -1).map((x, index) => `${X(x)},${Z(index % 2 === 0 ? roofZ(x) : E)}`).join('L')}M${X(W / 2)},${Z(E)}V${Z(R)}`
    : '';
  const section = [
    `M${X(0)},${Z(0)}V${Z(E)}L${X(W / 2)},${Z(R)}L${X(W)},${Z(E)}V${Z(0)}`,
    truss ? `M${X(0)},${Z(E)}H${X(W)}` : '',
    centre ? `M${X(W / 2)},${Z(0)}V${Z(E)}` : '',
  ].join('');
  const kp = Math.min(104 / L, 40 / W);
  const px = 128 + (104 - L * kp) / 2;
  const py = 32 - (W * kp) / 2;
  const frames = deriveBayLayout(L).stationsM.map((station) => `M${(px + station * kp).toFixed(1)},${py.toFixed(1)}v${(W * kp).toFixed(1)}`).join('');
  return (
    <svg className="hc-sketch" viewBox="0 0 240 70" aria-hidden="true">
      <path className="hc-sketch-ground" d={`M2,${base}H118`} />
      <path className="hc-sketch-frame" d={section} />
      {/* thinner than the chords: twelve to sixteen panels in about 100 px */}
      {web && <path className="hc-sketch-frame" d={web} style={{ strokeWidth: 0.8 }} />}
      <path className="hc-sketch-bays" d={frames} />
      <rect className="hc-sketch-plan" x={px} y={py} width={L * kp} height={W * kp} />
      <text x="6" y="68">розріз</text>
      <text x="128" y="68">план</text>
    </svg>
  );
}

export function ConfiguratorSummary({
  domain,
  showInquiryAction = false,
  onInquiryAction,
}: {
  domain: HangarDomainModel;
  showInquiryAction?: boolean;
  onInquiryAction?: () => void;
}) {
  const summary = deriveSummary(domain);
  // The stamp names the untouched example as the sheet above it does — «Приклад» — and says «Ви обрали» once the drawn
  // hangar is the visitor's (sameDrawnHangar, as the drawings and the cost notes decide it; 04.10)
  const inquiry = useHangarInquiryContext();
  // «Ви обрали» once the visitor answered anything; until then the stamp is the example's. Each value the visitor left
  // as it was says so beside its name (07.10: changing the width alone made every default «their» choice)
  // One rule with the sheet and the lead (domainModel.ts exampleTopics, 08.10 after the audit): a value is «з прикладу»
  // only while unanswered and still the example's; what another answer set is the visitor's. «Ваша конфігурація» once
  // anything is answered — «Ви обрали» over a stamp of example values read as a promise the stamp did not keep.
  const chosen = (topic: ConfirmedTopic): Status | undefined => {
    if (!domain.exampleTopics.includes(topic)) return undefined;
    // the shell a cold store brings is its suggestion, not the page's example (10.10, QA)
    const suggested = domain.objectProfile.purpose === 'coldStore' && (topic === 'envelope' || topic === 'cladding');
    return suggested ? 'suggested' : 'example';
  };
  const example = !anythingChosen(domain);
  const provenance = sizesProvenance(domain);
  const enclosed = domain.scope.walls || domain.scope.roof;
  // sent with a saved lead and unchanged since: the stamp no longer promises to add it
  const sent = Boolean(useInquiryAttachment()?.sent) && Boolean(inquiry?.isAttached);
  const dimensionsWithoutUnit = summary.dimensionsLabel.replace(/\s+м$/, '');
  const taskLine = objectProfileLine(domain.objectProfile);
  const taskAnswered = taskLine !== objectProfileLine(DEFAULT_CONFIGURATOR_STATE.objectProfile) ? taskLine : null;
  const dimensionsRef = useChangeMark<HTMLParagraphElement>(`${summary.dimensionsLabel} ${summary.ridgeHeightLabel}`);

  if (!showInquiryAction) {
    return (
      <details className="hc-summary" open>
        <summary>
          <span className="hc-summary-title">Ваш об’єкт</span>
          <span className="hc-summary-toggle" aria-hidden="true" />
        </summary>
        <div className="hc-summary-body">
          <p className="hc-summary-kind">Ангар</p>
          <p className="hc-summary-dimensions">{summary.dimensionsLabel}</p>
          <p className="hc-summary-area">{summary.areaLabel} площі забудови</p>
          <dl className="hc-summary-facts">
            <div>
              <dt>Утеплення</dt>
              <dd>{summary.envelopeLabel}</dd>
            </div>
            {summary.claddingRow && (
              <div>
                <dt>{summary.claddingRow.label}</dt>
                <dd>{summary.claddingRow.value}</dd>
              </div>
            )}
            <div>
              <dt>Попередня конструктивна схема</dt>
              <dd>{summary.structuralVisualizationLabel}</dd>
            </div>
            <div>
              <dt>Фундамент</dt>
              <dd>{summary.foundationTypeLabel}</dd>
            </div>
            <div>
              <dt>Обсяг</dt>
              <dd>{summary.scopeSummaryLabel}</dd>
            </div>
            {summary.gatesLabel !== null && (
              <div>
                <dt>Ворота</dt>
                <dd>{summary.gatesLabel}</dd>
              </div>
            )}
            {summary.doorsLabel !== null && (
              <div>
                <dt>Двері</dt>
                <dd>{summary.doorsLabel}</dd>
              </div>
            )}
          </dl>
          <p className="hc-summary-formula">Площа = ширина × довжина</p>
          <SummaryDisclaimer />
        </div>
      </details>
    );
  }

  // The flagship summary is the drawing's title block (UX review 2026-10): one row under the sticky drawing instead of
  // a 505 px panel inside it that kept «Обговорити» off screen while configuring; the preliminary scheme it repeated
  // is now told by «Каркас вашого ангара» below.
  return (
    <section className="hc-summary hc-summary-flagship" aria-label="Підсумок конфігурації">
      <div className="hc-summary-grid">
        <div className="hc-summary-selected">
          <h3 className="hc-summary-title" key={example ? 'example' : 'own'}>{example ? 'Приклад конфігурації' : 'Ваша конфігурація'}</h3>
          {provenance === 'approx' && <p className="hc-summary-dimensions-status"><span className="hc-fact-status">орієнтовно · уточнюємо</span></p>}
          {!example && provenance === 'example' && <p className="hc-summary-dimensions-status"><StatusTag status="example" /></p>}
          <p className="hc-summary-dimensions" ref={dimensionsRef} translate="no">
            {dimensionsWithoutUnit}<span className="hc-summary-dimensions-unit">{NBSP}м</span>
          </p>
          {/* the area named before its number (10.10, audit F102): «· ≈ 1 440 м² площі забудови» put «·» and «≈» side by side;
              the name and its number one piece, so a narrow stamp breaks after the «·» */}
          <p className="hc-summary-area" translate="no">коник {summary.ridgeHeightLabel} · площа{NBSP}забудови{NBSP}{summary.areaLabel}</p>
          <SummarySketch domain={domain} />
        </div>
        {/* A value that changes lights for a moment, so an edit made in the controls shows where it landed */}
        <dl className="hc-summary-facts">
          {/* without walls and roof there is no envelope to describe — no rows, as the openings have none (08.10) */}
          {enclosed && <Fact label="Утеплення" value={summary.envelopeLabel} status={example ? undefined : chosen('envelope')} />}
          {/* the surfaces by name (10.10, audit F36): «Огородження: Профнастил» read as a fence */}
          {summary.claddingRow && <Fact label={summary.claddingRow.label} value={summary.claddingRow.value} status={example ? undefined : chosen('cladding')} />}
          <Fact label="Схема" value={summary.structuralVisualizationLabel} wide status="derived" />
          <Fact label="Обсяг" value={summary.scopeSummaryLabel} wide status={example ? undefined : chosen('scope')} />
          {/* Dropped entirely, not shown as "поза обсягом": an opening in a wall nobody ordered is not part of this
              request, so it has no row. The controls keep the choice, disabled, and it comes back with the walls. */}
          {summary.gatesLabel !== null && <Fact label="Ворота" value={summary.gatesLabel} status={example ? undefined : chosen('openings')} />}
          {summary.doorsLabel !== null && <Fact label="Двері" value={summary.doorsLabel} status={example ? undefined : chosen('openings')} />}
          {/* «Об’єкт» (03.10): only once a purpose is chosen, last, so an unanswered question does not grow the stamp on a
              phone (styles: configurator-controls.css) */}
          {/* The task as answered (07.10: purpose, region, project, lifting — the stamp showed the purpose alone; a cold
              store's temperature since 10.10), and the space inside once answered — «Простір усередині: Без колон», as the
              step asks it and the lead says it (10.10, owner: it was «Колони всередині: Не можна») */}
          {taskAnswered && <Fact label="Задача" value={taskAnswered} purpose />}
          {domain.internalSupports !== 'unknown' && (
            <Fact label="Простір усередині" value={INTERNAL_SUPPORTS_LABELS[domain.internalSupports]} />
          )}
        </dl>
        <div className="hc-summary-handoff">
          <a
            className="button button-primary hc-summary-action"
            href="#inquiry"
            onClick={(event) => {
              onInquiryAction?.();
              revealAttachedBrief(event);
            }}
          >
            Обговорити цю конфігурацію <span aria-hidden="true">↓</span>
          </a>
          {/* what happens after the button, in the route's own approved words (10.10, audit F12; «Читаємо бриф і готуємо
              питання до розмови»): it jumps straight to the form, past the route */}
          <p key={sent ? 'sent' : 'add'}>{sent ? 'Надіслано з вашим запитом.' : keepShortWords('Параметри додамо до заявки — ми прочитаємо бриф і підготуємо питання до розмови.')}</p>
        </div>
      </div>
      <SummaryDisclaimer />
    </section>
  );
}
