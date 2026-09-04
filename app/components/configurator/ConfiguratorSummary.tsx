'use client';

import { deriveSummary } from '../../lib/configurator/deriveSummary';
import type { HangarDomainModel } from '../../lib/configurator/domainModel';

export function ConfiguratorSummary({ domain }: { domain: HangarDomainModel }) {
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
            <dt>Конструктивна схема</dt>
            <dd>{summary.structuralSchemeLabel}</dd>
          </div>
          <div>
            <dt>Несуча система покрівлі</dt>
            <dd>{summary.roofStructureLabel}</dd>
          </div>
          <div>
            <dt>Основа</dt>
            <dd>{summary.foundationTypeLabel}</dd>
          </div>
          <div>
            <dt>Обсяг</dt>
            <dd>{summary.scopeSummaryLabel}</dd>
          </div>
          <div>
            <dt>Ворота</dt>
            <dd>{summary.gatesLabel}</dd>
          </div>
        </dl>
        <p className="hc-summary-formula">Площа = ширина × довжина</p>
      </div>
    </details>
  );
}
