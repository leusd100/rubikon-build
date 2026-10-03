'use client';

import type { CSSProperties } from 'react';
import { CostFactorsFigure, type CostFactorItem } from '../process/CostFactorsFigure';
import { useHangarInquiryContext } from '../configurator/HangarInquiryContext';
import { sameBusinessConfiguration } from '../../lib/configurator/attachmentContract';
import { deriveDomainModel } from '../../lib/configurator/domainModel';
import { deriveSummary } from '../../lib/configurator/deriveSummary';
import { DEFAULT_CONFIGURATOR_STATE } from '../../lib/configurator/types';
import { FrameTour } from './FrameTour';

// /angary below the configurator (UX review 2026-10, report «/angary по блоках»): what drives the cost of this hangar,
// its frame from roof to footing, and the route from the brief to handed-over works with who answers for it. The
// three static frame schemes, the separate people section and the five-step route that skipped the estimate are gone.
//
// Every statement comes from the page (server) as plain strings: the Delivery Model's own words, never copied here.

export type AngaryEditorialContent = {
  cost: { title: string; text: string; factors: readonly CostFactorItem[]; customerScope: string };
  route: { steps: readonly { title: string; result: string }[]; boundary: string };
  people: readonly { name: string; role: string }[];
};

const pad = (value: number) => String(value).padStart(2, '0');

export function HangarEditorialArchitecture({ content }: Readonly<{ content: AngaryEditorialContent }>) {
  const inquiry = useHangarInquiryContext();
  const state = inquiry?.state ?? DEFAULT_CONFIGURATOR_STATE;
  const summary = deriveSummary(deriveDomainModel(state));
  // What the visitor's own configuration already says about a factor — only once they have set something
  const own = !sameBusinessConfiguration(state, DEFAULT_CONFIGURATOR_STATE);
  const notes = own
    ? {
      dimensions: `У вашій конфігурації: ${summary.dimensionsLabel}, коник ${summary.ridgeHeightLabel}`,
      structure: `У попередній схемі: ${summary.structuralVisualizationLabel.toLowerCase()}`,
      insulation: `Ви вказали: ${summary.envelopeLabel.toLowerCase()}, ${summary.claddingSystemLabel.toLowerCase()}`,
      technology: summary.gatesLabel ? `Ворота: ${summary.gatesLabel}` : undefined,
    }
    : undefined;
  const attached = Boolean(inquiry?.isAttached);
  let briefState = 'idle';
  if (attached) briefState = 'attached';
  else if (inquiry?.attachment.status === 'detached') briefState = 'detached';

  return (
    <>
      <section className="page-section angary-cost" id="vartist" aria-labelledby="angary-cost-title">
        <div className="shell">
          <header className="angary-section-heading">
            <p className="eyebrow"><span /> Вартість</p>
            <h2 id="angary-cost-title">{content.cost.title}</h2>
            <p>{content.cost.text}</p>
          </header>
          <CostFactorsFigure factors={content.cost.factors} title={null} tour={false} notes={notes} sheet />
          <div className="angary-cost-foot">
            <p>{content.cost.customerScope}</p>
            <div className="angary-cost-actions">
              <a className="button button-primary" href="#inquiry" data-open-inquiry>
                Обговорити вартість вашого ангара <span aria-hidden="true">↓</span>
              </a>
              <a className="angary-text-link" href="/yak-pratsyuiemo#koshtorys">
                Як формуємо кошторис і графік <span aria-hidden="true">→</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="page-section direction-editorial-section dn-section angary-structure" id="structure" aria-labelledby="angary-structure-title">
        <FrameTour titleId="angary-structure-title" />
      </section>

      <section className="page-section angary-process" id="process" aria-labelledby="angary-process-title">
        <div className="shell">
          <header className="angary-section-heading is-inverse">
            <p className="eyebrow light"><span /> Від брифу до об’єкта</p>
            <h2 id="angary-process-title">Зрозумілий шлях від першого брифу</h2>
          </header>
          {/* 01 is the visitor's own brief: open while nothing is attached, filled once it is; then the route as
              /yak-pratsyuiemo «Етапи» tells it, word for word — with the estimate, the contract and the handover */}
          <ol className="angary-process-rail" data-motion data-brief={briefState}>
            <li className="angary-route-brief" style={{ '--i': 0 } as CSSProperties}>
              <span>01</span>
              <h3>Ваш бриф</h3>
              <p>
                {attached
                  ? <>Додано до заявки: <b>{summary.dimensionsLabel} · {summary.envelopeLabel}</b></>
                  : 'Базову конфігурацію можна сформувати вище.'}
              </p>
            </li>
            {content.route.steps.map((step, index) => (
              <li key={step.title} style={{ '--i': index + 1 } as CSSProperties}>
                <span>{pad(index + 2)}</span>
                <h3>{step.title}</h3>
                <p>{step.result}</p>
              </li>
            ))}
          </ol>
          <a className="angary-route-more" href="/yak-pratsyuiemo#etapy">
            Усі етапи, документи й відповідальність <span aria-hidden="true">→</span>
          </a>

          {/* Who answers for it — the route's title block («штамп»), in place of a separate section */}
          <div className="angary-stamp" id="responsibility" aria-labelledby="angary-stamp-title">
            <p className="angary-stamp-title" id="angary-stamp-title">За погоджений обсяг відповідаємо особисто</p>
            <dl>
              {content.people.map((person) => (
                <div key={person.name}><dt>{person.role}</dt><dd>{person.name}</dd></div>
              ))}
              <div className="is-wide"><dt>Межі обсягу</dt><dd>{content.route.boundary}</dd></div>
            </dl>
            <a className="angary-stamp-link" href="/pro-nas">Про компанію <span aria-hidden="true">→</span></a>
          </div>
        </div>
      </section>
    </>
  );
}
