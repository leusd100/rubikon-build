'use client';

import { deriveSummary } from '../../lib/configurator/deriveSummary';
import type { ConfiguratorState } from '../../lib/configurator/types';

export function ConfiguratorSummary({ state }: { state: ConfiguratorState }) {
  const summary = deriveSummary(state);

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
