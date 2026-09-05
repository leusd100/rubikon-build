'use client';

import { useMemo, useState } from 'react';
import { deriveDomainModel } from '../../lib/configurator/domainModel';
import { DEFAULT_CONFIGURATOR_STATE, type ConfiguratorState } from '../../lib/configurator/types';
import { ConfiguratorControls } from './ConfiguratorControls';
import { ConfiguratorSummary } from './ConfiguratorSummary';
import { useHangarInquiryContext } from './HangarInquiryContext';
import { HangarPreviewModes } from './HangarPreviewModes';

export function HangarConfigurator({ embedded = false }: { embedded?: boolean }) {
  const sharedInquiry = useHangarInquiryContext();
  const [localState, setLocalState] = useState<ConfiguratorState>(DEFAULT_CONFIGURATOR_STATE);
  const state = sharedInquiry?.state ?? localState;
  const setState = sharedInquiry?.setState ?? setLocalState;
  // Derived once here, not inside Preview/Summary — both read the same DomainModel so they can
  // never disagree about what "walls present" or "area" means. Controls keeps reading/writing
  // raw ConfiguratorState below — it edits user input, not the derived object.
  const domain = useMemo(() => deriveDomainModel(state), [state]);

  return (
    <section
      className={`hangar-configurator${embedded ? ' hangar-configurator-embedded' : ''}`}
      id={embedded ? 'configurator' : undefined}
      aria-labelledby="hangar-configurator-title"
    >
      <header className="hc-hero">
        <p className="hc-eyebrow">
          <span aria-hidden="true" />
          {embedded ? 'Конфігуратор · перший технічний бриф' : 'Proof of concept · дослідницький екран'}
        </p>
        {embedded ? (
          <h2 id="hangar-configurator-title">Сформуйте базову конфігурацію ангара</h2>
        ) : (
          <h1 id="hangar-configurator-title">Живий конфігуратор ангара</h1>
        )}
        <p className="hc-lede">
          {embedded
            ? 'Задайте габарити, контур і бажаний обсяг робіт. Візуалізація допоможе сформувати предметний запит, а технічне рішення ми уточнимо разом.'
            : 'Змінюйте параметри зліва — ескіз і підсумок праворуч оновлюються одразу.'}
        </p>
      </header>

      <div className="hc-layout">
        <ConfiguratorControls state={state} onChange={setState} />
        <div className="hc-preview-pane">
          <HangarPreviewModes domain={domain} />
          <ConfiguratorSummary
            domain={domain}
            showInquiryAction={embedded}
            onInquiryAction={sharedInquiry?.attachConfiguration}
          />
        </div>
      </div>
    </section>
  );
}
