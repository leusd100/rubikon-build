'use client';

import { useEffect, useRef } from 'react';
import { deriveSummary } from '../../lib/configurator/deriveSummary';
import type { HangarDomainModel } from '../../lib/configurator/domainModel';
import { deriveBayLayout, ridgeHeightM } from '../../lib/configurator/parametricModel';
import { revealAttachedBrief } from '../inquiry/revealAttachedBrief';

/** The configurator's one disclaimer (UX pass 2026-10: it replaced five — over the model, under the sizes, the gates,
 *  in the summary and over the frame schemes). */
function SummaryDisclaimer() {
  return (
    <p className="hc-summary-disclaimer">
      Це попередня схематична візуалізація, а не проєктна документація. Межі розмірів і розміри воріт орієнтовні,
      не будівельні норми. Конструктивну схему й фундамент визначає проєктувальник після розрахунку навантажень
      і умов майданчика.
    </p>
  );
}

/** Marks an element for a moment when its value changes — never on the first render (styles: configurator.css) */
function useChangeMark<T extends HTMLElement>(value: string) {
  const ref = useRef<T>(null);
  const previous = useRef(value);
  useEffect(() => {
    const element = ref.current;
    if (previous.current === value || !element) return;
    previous.current = value;
    element.classList.remove('is-changed');
    // restart the animation when values change faster than it runs
    void element.offsetWidth;
    element.classList.add('is-changed');
  }, [value]);
  return ref;
}

function Fact({ label, value, wide = false, purpose = false }: Readonly<{ label: string; value: string; wide?: boolean; purpose?: boolean }>) {
  const ref = useChangeMark<HTMLDivElement>(value);
  const className = [wide && 'is-wide', purpose && 'hc-fact-purpose'].filter(Boolean).join(' ') || undefined;
  return <div ref={ref} className={className}><dt>{label}</dt><dd>{value}</dd></div>;
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
  const section = [
    `M${X(0)},${Z(0)}V${Z(E)}L${X(W / 2)},${Z(R)}L${X(W)},${Z(E)}V${Z(0)}`,
    truss ? `M${X(0)},${Z(E)}H${X(W)}M${Array.from({ length: 7 }, (_, index) => `${X((index * W) / 6)},${Z(index % 2 ? roofZ((index * W) / 6) : E)}`).join('L')}` : '',
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
  const dimensionsWithoutUnit = summary.dimensionsLabel.replace(/\s+м$/, '');
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
          <p className="hc-summary-area">≈ {summary.areaSqm.toLocaleString('uk-UA')} м² площі забудови</p>
          <dl className="hc-summary-facts">
            <div>
              <dt>Контур</dt>
              <dd>{summary.envelopeLabel}</dd>
            </div>
            <div>
              <dt>Огородження</dt>
              <dd>{summary.claddingSystemLabel}</dd>
            </div>
            <div>
              <dt>Попередня конструктивна схема</dt>
              <dd>{summary.structuralVisualizationLabel}</dd>
            </div>
            <div>
              <dt>Основа</dt>
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
          <h3 className="hc-summary-title">Ви обрали</h3>
          <p className="hc-summary-dimensions" ref={dimensionsRef}>
            {dimensionsWithoutUnit}<span className="hc-summary-dimensions-unit"> м</span>
          </p>
          <p className="hc-summary-area">коник {summary.ridgeHeightLabel} · ≈ {summary.areaSqm.toLocaleString('uk-UA')} м² площі забудови</p>
          <SummarySketch domain={domain} />
        </div>
        {/* A value that changes lights for a moment, so an edit made in the controls shows where it landed */}
        <dl className="hc-summary-facts">
          <Fact label="Контур" value={summary.envelopeLabel} />
          <Fact label="Огородження" value={summary.claddingSystemLabel} />
          <Fact label="Схема" value={summary.structuralVisualizationLabel} wide />
          <Fact label="Обсяг" value={summary.scopeSummaryLabel} wide />
          {/* Dropped entirely, not shown as "поза обсягом": an opening in a wall nobody ordered is not part of this
              request, so it has no row. The controls keep the choice, disabled, and it comes back with the walls. */}
          {summary.gatesLabel !== null && <Fact label="Ворота" value={summary.gatesLabel} />}
          {summary.doorsLabel !== null && <Fact label="Двері" value={summary.doorsLabel} />}
          {/* «Об’єкт» (03.10): only once a purpose is chosen, last, so an unanswered question does not grow the stamp on a
              phone (styles: configurator-controls.css) */}
          {summary.objectProfile.purpose !== null && <Fact label="Призначення" value={summary.objectProfile.purpose} purpose />}
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
          <p>Параметри автоматично додамо до заявки.</p>
        </div>
      </div>
      <SummaryDisclaimer />
    </section>
  );
}
