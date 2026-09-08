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
  const updateBusinessConfiguration = sharedInquiry?.updateBusinessConfiguration ?? setLocalState;
  // Both models are derived here, not inside Preview/Summary. Summary always receives the
  // authoritative business model; only Preview may receive a temporary presentation demo.
  // Controls keep reading/writing raw business state, so a demo can never become lead data.
  const businessDomain = useMemo(() => deriveDomainModel(state), [state]);
  const previewState = sharedInquiry?.presentationDemo?.configuration ?? state;
  const previewDomain = useMemo(() => deriveDomainModel(previewState), [previewState]);

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
        {embedded && (
          <ol className="hc-vocabulary" aria-label="Чотири складові конфігурації">
            <li><span>01</span><div><strong>Габарити</strong><p>ширина, довжина, висота стін.</p></div></li>
            <li><span>02</span><div><strong>Контур</strong><p>холодний або утеплений залежно від використання.</p></div></li>
            <li><span>03</span><div><strong>Огородження</strong><p>профнастил або сендвіч-панель.</p></div></li>
            <li><span>04</span><div><strong>Основа</strong><p>рішення уточнюється з урахуванням майданчика.</p></div></li>
          </ol>
        )}
      </header>

      <div className="hc-layout">
        <ConfiguratorControls state={state} onChange={updateBusinessConfiguration} />
        <div className="hc-preview-pane" id="hangar-live-preview">
          <HangarPreviewModes
            domain={previewDomain}
            presentationDemo={sharedInquiry?.presentationDemo}
            presentationAnnouncement={sharedInquiry?.presentationAnnouncement}
            onEndPresentationDemo={sharedInquiry?.endPresentationDemo}
          />
          <ConfiguratorSummary
            domain={businessDomain}
            showInquiryAction={embedded}
            onInquiryAction={sharedInquiry?.attachConfiguration}
          />
        </div>
      </div>
    </section>
  );
}
