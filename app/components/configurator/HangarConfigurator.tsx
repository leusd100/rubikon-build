'use client';

import { useMemo, useState } from 'react';
import { deriveDomainModel } from '../../lib/configurator/domainModel';
import { DEFAULT_CONFIGURATOR_STATE, type ConfiguratorState } from '../../lib/configurator/types';
import { ConfiguratorControls } from './ConfiguratorControls';
import { ConfiguratorSummary } from './ConfiguratorSummary';
import { HangarPreview } from './HangarPreview';

export function HangarConfigurator() {
  const [state, setState] = useState<ConfiguratorState>(DEFAULT_CONFIGURATOR_STATE);
  // Derived once here, not inside Preview/Summary — both read the same DomainModel so they can
  // never disagree about what "walls present" or "area" means. Controls keeps reading/writing
  // raw ConfiguratorState below — it edits user input, not the derived object.
  const domain = useMemo(() => deriveDomainModel(state), [state]);

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
            <HangarPreview domain={domain} />
          </div>
          <ConfiguratorSummary domain={domain} />
        </div>
      </div>
    </div>
  );
}
