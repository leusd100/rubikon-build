'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { sameDrawnHangar } from '../../lib/configurator/attachmentContract';
import { deriveDomainModel } from '../../lib/configurator/domainModel';
import { DEFAULT_CONFIGURATOR_STATE, type ConfiguratorState } from '../../lib/configurator/types';
import { CONTROL_STEPS } from '../../lib/configurator/controlGroups';
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
 * Where the sheet is comes from two intersection observers, not from its box read on every scroll event: that read
 * forced the page's style and layout on each one, all down the page (07.10: 351 of them in one phone fling run).
 * Each observer's root starts at a line under the screen's top and runs far below the screen, so the sheet lies wholly
 * in it exactly while its top is at or under that line, wherever the page is scrolled or jumps to: the header for the
 * hold, half a pixel under it to let go — held, the sheet sticks at the header itself (Chrome rounds an observer's
 * margin to whole pixels, so there it is one). The change waits for the next frame, where the scroll event made it:
 * made straight from the observers' task, the hold's measuring layout (the sheet already mini, its height not yet
 * given back) let scroll anchoring lift the page by that height mid-fling, and the sheet let go again at once (07.10:
 * 12 of 30 fast flings).
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
    const held = () => 'configuring' in layout.dataset;
    // Where the observers last saw the sheet's top: at or under the header line, and at or under the let-go line
    let underHeader = true;
    let underLetGo = true;
    let frame = 0;
    const settle = () => {
      frame = 0;
      if (!phone.matches) return;
      if (!held() && !underHeader) hold();
      else if (held() && underLetGo) release();
    };
    // Calls back with whether the sheet's top is at or under `line` px from the top of the screen, whenever that changes
    const watchLine = (line: number, onChange: (under: boolean) => void) => new IntersectionObserver((entries) => {
      onChange(entries.at(-1)!.intersectionRatio === 1);
      frame ||= window.requestAnimationFrame(settle);
    }, { rootMargin: `-${line}px 0px 100000px 0px`, threshold: 1 });
    const reach = watchLine(PHONE_HEADER_PX, (under) => { underHeader = under; });
    // Held, the sheet sticks at the header: its top under the header means its own place is in view again
    const leave = watchLine(PHONE_HEADER_PX + 0.5, (under) => { underLetGo = under; });
    const update = () => {
      if (phone.matches) {
        reach.observe(sheet);
        leave.observe(sheet);
        return;
      }
      reach.disconnect();
      leave.disconnect();
      if (held()) release();
    };
    update();
    phone.addEventListener('change', update);
    return () => {
      phone.removeEventListener('change', update);
      reach.disconnect();
      leave.disconnect();
      window.cancelAnimationFrame(frame);
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
  // The open step: the controls show it, the drawing follows it (the frame on «Каркас», 07.10). The sizes first. On
  // /angary it lives with the configuration, so the draft brings the visitor back to the step they left.
  const [localStep, setLocalStep] = useState(0);
  const step = sharedInquiry?.step ?? localStep;
  const setStep = sharedInquiry?.setStep ?? setLocalStep;

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
            ? 'Чотири кроки: габарити, стіни й ворота, каркас, обсяг робіт. Креслення змінюється з кожним вибором, технічне рішення уточнимо разом.'
            : 'Змінюйте параметри зліва — ескіз і підсумок праворуч оновлюються одразу.'}
        </p>
      </header>

      {/* A draft read back from this browser says so, with the way back to the example (07.10) */}
      {embedded && sharedInquiry?.restored && (
        <p className="hc-draft-note" role="status">
          Відновлено вашу конфігурацію з минулого візиту.{' '}
          <button type="button" className="hc-draft-reset" onClick={sharedInquiry.startOver}>Почати заново</button>
        </p>
      )}
      <div className="hc-layout" ref={layoutRef}>
        <ConfiguratorControls state={state} onChange={updateBusinessConfiguration} step={step} onStep={setStep} foundationChoice={!embedded} />
        <div className="hc-preview-pane" id="hangar-live-preview">
          <HangarPreviewModes
            domain={previewDomain}
            frame={CONTROL_STEPS[step].id === 'frame'}
            presentationDemo={presentationDemo}
            presentationAnnouncement={sharedInquiry?.presentationAnnouncement}
            onEndPresentationDemo={sharedInquiry?.endPresentationDemo}
            sheet={embedded
              ? { object: sheetObjectLabel(own, businessDomain.dimensions), untouched: !own && !presentationDemo }
              : undefined}
          />
          {!embedded && <div id="hc-stamp"><ConfiguratorSummary domain={businessDomain} /></div>}
        </div>
      </div>
      {/* On the page the summary is the drawing's title block, under the layout: only the drawing stays sticky */}
      {embedded && (
        // «До зведення ↓» under the last step lands here
        <div className="hc-stamp-row" id="hc-stamp">
          <ConfiguratorSummary domain={businessDomain} showInquiryAction onInquiryAction={sharedInquiry?.attachConfiguration} />
        </div>
      )}
    </section>
  );
}
