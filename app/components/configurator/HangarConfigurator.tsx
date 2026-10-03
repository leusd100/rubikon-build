'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { sameDrawnHangar } from '../../lib/configurator/attachmentContract';
import { deriveDomainModel } from '../../lib/configurator/domainModel';
import { DEFAULT_CONFIGURATOR_STATE, type ConfiguratorState } from '../../lib/configurator/types';
import { ConfiguratorControls } from './ConfiguratorControls';
import { ConfiguratorSummary } from './ConfiguratorSummary';
import { useHangarInquiryContext } from './HangarInquiryContext';
import { HangarPreviewModes } from './HangarPreviewModes';
import { sheetObjectLabel } from './sheetLabels';
import './configurator-sheet.css';

/** The site header's height on a phone (globals.css): the mini preview is held right under it (configurator-sheet.css) */
const PHONE_HEADER_PX = 77;

/**
 * On a phone (/angary only) the drawing stays in view while the visitor sets the parameters. The moment the sheet would
 * scroll under the header, the layout carries `data-configuring`: the sheet sticks under the header as a mini drawing
 * (a ~140 px picture, its sizes in a readout beside the view switch, configurator-sheet.css) and gives the height it
 * lost back as its bottom margin, so nothing under it moves — the controls never jump under the finger, and the summary
 * after the layout never moves or hides (the sheet cannot stick past the layout). Back in its own place, above the
 * controls, it is the whole sheet again. The state follows where the sheet is, not which way the visitor scrolled, so a
 * jump (the hero's «Зібрати конфігурацію», the top of the page, a reload further down) lands in the right one. (03.10:
 * the controls' observer it replaces counted the whole sheet in its margin, and the stage shrank in front of the eyes.)
 * Held, the layout also carries the mini drawing's height (`--hc-mini-h`), so a control that takes keyboard focus is
 * scrolled clear of it rather than under it (configurator-sheet.css; 03.10: Shift+Tab hid 7 of 13 stops behind it).
 */
function useMiniPreview(enabled: boolean) {
  const layoutRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const layout = layoutRef.current;
    const sheet = layout?.querySelector<HTMLElement>('.hc-preview-surface');
    if (!enabled || !layout || !sheet) return undefined;
    const phone = window.matchMedia('(max-width: 760px)');
    // The mini drawing's height follows its title block (the readout, a 3D view): measured whenever it changes
    const miniHeight = new ResizeObserver(() => {
      if ('configuring' in layout.dataset) layout.style.setProperty('--hc-mini-h', `${sheet.offsetHeight}px`);
    });
    const release = () => {
      delete layout.dataset.configuring;
      sheet.style.removeProperty('--hc-mini-give');
      layout.style.removeProperty('--hc-mini-h');
      miniHeight.disconnect();
    };
    const hold = () => {
      // Measured with the sheet's transitions off (configurator-sheet.css): under reduced motion they still run for
      // .01 ms, and a read in the same frame saw the whole sheet
      sheet.dataset.measuring = '';
      const whole = sheet.getBoundingClientRect().height;
      layout.dataset.configuring = '';
      const mini = sheet.getBoundingClientRect().height;
      delete sheet.dataset.measuring;
      sheet.style.setProperty('--hc-mini-give', `${whole - mini}px`);
      layout.style.setProperty('--hc-mini-h', `${mini}px`);
      miniHeight.observe(sheet);
    };
    const update = () => {
      const held = 'configuring' in layout.dataset;
      if (!phone.matches) {
        if (held) release();
        return;
      }
      // Held, the sheet sticks at the header: its top below the header means its own place is in view again
      const top = sheet.getBoundingClientRect().top;
      if (!held && top <= PHONE_HEADER_PX) hold();
      else if (held && top > PHONE_HEADER_PX + 0.5) release();
    };
    update();
    phone.addEventListener('change', update);
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      phone.removeEventListener('change', update);
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
      release();
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
  // /angary's drawing sheet names the object as the frame drawing does: the example until the visitor makes it theirs
  const own = !sameDrawnHangar(state, DEFAULT_CONFIGURATOR_STATE);
  const presentationDemo = sharedInquiry?.presentationDemo;

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
        <ConfiguratorControls state={state} onChange={updateBusinessConfiguration} foundationChoice={!embedded} />
        <div className="hc-preview-pane" id="hangar-live-preview">
          <HangarPreviewModes
            domain={previewDomain}
            presentationDemo={presentationDemo}
            presentationAnnouncement={sharedInquiry?.presentationAnnouncement}
            onEndPresentationDemo={sharedInquiry?.endPresentationDemo}
            sheet={embedded
              ? { object: sheetObjectLabel(own, businessDomain.dimensions), untouched: !own && !presentationDemo }
              : undefined}
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
