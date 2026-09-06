'use client';

import { deriveSummary } from '../../lib/configurator/deriveSummary';
import type { HangarDomainModel } from '../../lib/configurator/domainModel';

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
          {/* Dropped entirely, not shown as "поза обсягом": an opening in a wall nobody ordered is
              not part of this request, so it has no row. The choice itself is not lost — the
              controls keep it, disabled, and it comes back with the walls. */}
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
        {showInquiryAction && (
          <div className="hc-summary-handoff">
            <a className="button button-primary hc-summary-action" href="#inquiry" onClick={onInquiryAction}>
              Обговорити цю конфігурацію <span aria-hidden="true">↗</span>
            </a>
            <p>Параметри автоматично додамо до заявки.</p>
          </div>
        )}
      </div>
    </details>
  );
}
