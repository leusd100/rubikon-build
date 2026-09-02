'use client';

import { useState } from 'react';
import { DEFAULT_CONFIGURATOR_STATE, type ConfiguratorState } from '../../lib/configurator/types';
import { ConfiguratorControls } from './ConfiguratorControls';
import { ConfiguratorSummary } from './ConfiguratorSummary';
import { HangarPreview } from './HangarPreview';

export function HangarConfigurator() {
  const [state, setState] = useState<ConfiguratorState>(DEFAULT_CONFIGURATOR_STATE);

  return (
    <div className="hangar-configurator">
      <header className="hc-hero">
        <p className="hc-eyebrow">Proof of concept · дослідницький екран</p>
        <h1>Живий конфігуратор ангара</h1>
        <p className="hc-lede">
          Змінюйте параметри зліва — ескіз і підсумок праворуч оновлюються одразу.
        </p>
        <p className="hc-disclaimer" role="note">
          Візуалізація є схематичною і не є проєктною або конструкторською документацією.
        </p>
      </header>

      <div className="hc-layout">
        <ConfiguratorControls state={state} onChange={setState} />
        <div className="hc-preview-pane">
          <div className="hc-preview-surface">
            <HangarPreview state={state} />
          </div>
          <ConfiguratorSummary state={state} />
        </div>
      </div>
    </div>
  );
}
