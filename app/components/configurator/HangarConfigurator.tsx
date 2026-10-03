'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { deriveDomainModel } from '../../lib/configurator/domainModel';
import { DEFAULT_CONFIGURATOR_STATE, type ConfiguratorState } from '../../lib/configurator/types';
import { ConfiguratorControls } from './ConfiguratorControls';
import { ConfiguratorSummary } from './ConfiguratorSummary';
import { useHangarInquiryContext } from './HangarInquiryContext';
import { HangarPreviewModes } from './HangarPreviewModes';

/** The site header's height on a phone (globals.css): the mini preview is held right under it. */
const PHONE_HEADER_PX = 77;

/**
 * On a phone (/angary only) the model stays in view while the visitor sets the parameters: while the controls are on
 * screen under it, the layout carries `data-configuring` and the preview stage sticks under the header
 * (configurator.css). Past the controls it lets go, so the summary reads without the model over it.
 */
function useMiniPreview(enabled: boolean) {
  const layoutRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const layout = layoutRef.current;
    const controls = layout?.querySelector('.hc-controls');
    if (!enabled || !layout || !controls) return undefined;
    const phone = window.matchMedia('(max-width: 760px)');
    let observer: IntersectionObserver | undefined;
    const arm = () => {
      observer?.disconnect();
      delete layout.dataset.configuring;
      if (!phone.matches) return;
      const stage = layout.querySelector<HTMLElement>('.hc-preview-surface')?.offsetHeight ?? 0;
      observer = new IntersectionObserver(([entry]) => {
        if (entry?.isIntersecting) layout.dataset.configuring = '';
        else delete layout.dataset.configuring;
      }, { rootMargin: `-${PHONE_HEADER_PX + stage}px 0px 0px 0px` });
      observer.observe(controls);
    };
    arm();
    phone.addEventListener('change', arm);
    return () => {
      observer?.disconnect();
      phone.removeEventListener('change', arm);
      delete layout.dataset.configuring;
    };
  }, [enabled]);
  return layoutRef;
}

export function HangarConfigurator({ embedded = false }: { embedded?: boolean }) {
  const sharedInquiry = useHangarInquiryContext();
  const layoutRef = useMiniPreview(embedded);
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
            ? 'Задайте габарити, контур і обсяг робіт — креслення оновиться одразу. Технічне рішення уточнимо разом.'
            : 'Змінюйте параметри зліва — ескіз і підсумок праворуч оновлюються одразу.'}
        </p>
      </header>

      <div className="hc-layout" ref={layoutRef}>
        <ConfiguratorControls state={state} onChange={updateBusinessConfiguration} />
        <div className="hc-preview-pane" id="hangar-live-preview">
          <HangarPreviewModes
            domain={previewDomain}
            presentationDemo={sharedInquiry?.presentationDemo}
            presentationAnnouncement={sharedInquiry?.presentationAnnouncement}
            onEndPresentationDemo={sharedInquiry?.endPresentationDemo}
          />
          {!embedded && <ConfiguratorSummary domain={businessDomain} />}
        </div>
      </div>
      {/* On the page the summary is the drawing's title block, under the layout: only the drawing stays sticky */}
      {embedded && (
        <div className="hc-stamp-row">
          <ConfiguratorSummary domain={businessDomain} showInquiryAction onInquiryAction={sharedInquiry?.attachConfiguration} />
        </div>
      )}
    </section>
  );
}
