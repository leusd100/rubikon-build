'use client';

import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { sameDrawnHangar } from '../../lib/configurator/attachmentContract';
import { anythingChosen, deriveDomainModel, sizesProvenance } from '../../lib/configurator/domainModel';
import { DEFAULT_CONFIGURATOR_STATE, type ConfiguratorState } from '../../lib/configurator/types';
import { CONTROL_STEPS } from '../../lib/configurator/controlGroups';
import { ConfiguratorControls, landOnSteps } from './ConfiguratorControls';
import { ConfiguratorSummary } from './ConfiguratorSummary';
import { useHangarInquiryContext } from './HangarInquiryContext';
import { HangarPreviewModes } from './HangarPreviewModes';
import { keepShortWords } from '../../lib/typography';
import { sheetObjectLabel } from './sheetLabels';
import './configurator-sheet.css';

/** The site header's height on a phone (globals.css): the mini preview is held right under it (configurator-sheet.css) */
const PHONE_HEADER_PX = 77;

/** Where the mini drawing is held: a phone's width, with the height for it. On a short screen — a window zoomed to
 *  200–400 %, a phone on its side — the header and the mini covered 55–100 % of it, and on «Каркас» every control of the
 *  step (09.10, audit F23). Every rule of the mini keys on `data-configuring`, so this query is the one place it is
 *  decided. 500, not 560: Safari's bars leave an iPhone SE or mini about 548–560 px, and the mini must stay there. */
const MINI_QUERY = '(max-width: 760px) and (min-height: 500px)';
/** A portrait tablet's sheet sticks under the header whole (configurator-sheet.css, 09.10): its height is the controls'
 *  focus margin, as the mini drawing's is on a phone */
const TABLET_QUERY = '(min-width: 761px) and (max-width: 1023px) and (min-height: 700px)';
/** The block's own jumps (10.10, audit F161): the last step's to the stamp, and the stamp's «Обговорити» to the form —
 *  by where they lead, not by their words */
const IN_BLOCK_JUMPS = '#configurator a[href="#hc-stamp"], #hc-stamp a[href="#inquiry"]';

/**
 * On a phone (/angary only) the drawing stays in view while the visitor sets the parameters. When the sheet's bottom edge
 * reaches the line where the mini drawing's will be, the layout carries `data-configuring`: the sheet sticks under the
 * header as a mini drawing (a ~140 px picture, its sizes in a readout beside the view switch, configurator-sheet.css)
 * and gives the height it lost back as its bottom margin, so nothing under it moves — the controls never jump under the
 * finger, and the summary after the layout never moves or hides (the sheet cannot stick past the layout). Back in its
 * own place, above the controls, it is the whole sheet again. The state follows where the sheet is, not which way the
 * visitor scrolled, so a jump (the top of the page, a reload further down) lands in the right one. (03.10: the
 * controls' observer it replaces counted the whole sheet in its margin, and the stage shrank in front of the eyes.)
 * The layout carries the mini drawing's height (`--hc-mini-h`): held, a control that takes keyboard focus is scrolled
 * clear of it rather than under it (configurator-sheet.css; 03.10: Shift+Tab hid 7 of 13 stops behind it), and «Далі»
 * lands the steps under it before it is held (landOnSteps in ConfiguratorControls).
 * The line: the sheet used to turn mini as its top reached the header, and the controls, held where they were, stood
 * a ~230 px empty band under the new mini drawing until scrolled up to it (09.10, audit F120). Now it turns mini as its
 * bottom edge reaches the mini's — the controls' top at the header, the mini drawing and the grid's gap — so the steps
 * stand right under the mini drawing the moment it appears, and nothing moves. The mini drawing's height comes from its
 * own title block (the step, the readout, a fold), so it is measured whenever the sheet's size changes, and the line
 * moves with it.
 * Where the controls are comes from two intersection observers, not from a box read on every scroll event: that read
 * forced the page's style and layout on each one, all down the page (07.10: 351 of them in one phone fling run).
 * Each observer's root starts at a line under the screen's top and runs far below the screen, so the controls lie wholly
 * in it exactly while their top is at or under that line: the hold line, and a pixel under it to let go (Chrome rounds
 * an observer's margin to whole pixels, so the lines are whole pixels). The change waits for the next frame, where the
 * scroll event made it: made straight from the observers' task, the hold's measuring layout (the sheet already mini,
 * its height not yet given back) let scroll anchoring lift the page by that height mid-fling, and the sheet let go again
 * at once (07.10: 12 of 30 fast flings).
 */
function useMiniPreview(enabled: boolean) {
  const layoutRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const layout = layoutRef.current;
    const sheet = layout?.querySelector<HTMLElement>('.hc-preview-surface');
    const controls = layout?.querySelector<HTMLElement>('.hc-controls');
    if (!enabled || !layout || !sheet || !controls) return undefined;
    const phone = window.matchMedia(MINI_QUERY);
    const tablet = window.matchMedia(TABLET_QUERY);
    const held = () => 'configuring' in layout.dataset;
    /** Where the controls' top holds the sheet for a mini drawing `mini` px high: whole pixels, as Chrome rounds them */
    const lineFor = (mini: number) => Math.round(PHONE_HEADER_PX + mini + (Number.parseFloat(getComputedStyle(layout).rowGap) || 0));
    let line = 0;
    // The whole sheet's height when the mini drawing was last measured: a let-go brings it back, and needs no new read
    let whole = 0;
    // Where the observers last saw the controls' top: at or under the hold line, and at or under the let-go line
    let underReach = true;
    let underLetGo = true;
    let reach: IntersectionObserver | undefined;
    let leave: IntersectionObserver | undefined;
    let frame = 0;
    // Calls back with whether the controls' top is at or under `at` px from the top of the screen, whenever that changes
    const watchLine = (at: number, onChange: (under: boolean) => void) => {
      const observer = new IntersectionObserver((entries) => {
        onChange(entries.at(-1)!.intersectionRatio === 1);
        frame ||= window.requestAnimationFrame(settle);
      }, { rootMargin: `-${at}px 0px 100000px 0px`, threshold: 1 });
      observer.observe(controls);
      return observer;
    };
    const unwatch = () => {
      reach?.disconnect();
      leave?.disconnect();
      line = 0;
    };
    /** The mini drawing is `mini` px high: the layout says so, and the lines move with it */
    const setMini = (mini: number) => {
      layout.style.setProperty('--hc-mini-h', `${mini}px`);
      const at = lineFor(mini);
      if (at === line) return;
      unwatch();
      line = at;
      // until the new observers report, the state stays as it is
      underReach = !held();
      underLetGo = underReach;
      reach = watchLine(at, (under) => { underReach = under; });
      leave = watchLine(at + 1, (under) => { underLetGo = under; });
    };
    const release = () => {
      delete layout.dataset.configuring;
      sheet.style.removeProperty('--hc-mini-give');
    };
    /** Lets go of a sheet held for a read alone, in the same task, so nothing is painted or scrolled in between: whole
     *  again with its transitions still off (`data-measuring`), so nothing eases back from the mini */
    const unholdUnseen = () => {
      delete layout.dataset.configuring;
      sheet.getBoundingClientRect();
    };
    const hold = () => {
      // Measured with the sheet's transitions off (configurator-sheet.css): under reduced motion they still run for
      // .01 ms, and a read in the same frame saw the whole sheet
      sheet.dataset.measuring = '';
      whole = sheet.getBoundingClientRect().height;
      const controlsTop = controls.getBoundingClientRect().top;
      layout.dataset.configuring = '';
      const mini = sheet.getBoundingClientRect().height;
      // The line was drawn for a mini drawing of another height (its title block changed while the sheet was whole): not
      // there yet, the sheet stays whole and the line moves
      if (controlsTop >= lineFor(mini)) unholdUnseen();
      else sheet.style.setProperty('--hc-mini-give', `${whole - mini}px`);
      delete sheet.dataset.measuring;
      setMini(mini);
    };
    /** The mini drawing's height while the sheet is whole: held for the read alone, with the page's scroll anchoring off —
     *  Chrome anchors on every forced layout, and the read would scroll the page by the give and back */
    const measureMini = () => {
      const anchoring = document.body.style.overflowAnchor;
      document.body.style.overflowAnchor = 'none';
      sheet.dataset.measuring = '';
      layout.dataset.configuring = '';
      const mini = sheet.getBoundingClientRect().height;
      unholdUnseen();
      delete sheet.dataset.measuring;
      document.body.style.overflowAnchor = anchoring;
      return mini;
    };
    const settle = () => {
      frame = 0;
      if (!phone.matches) return;
      if (!held() && !underReach) hold();
      else if (held() && underLetGo) release();
    };
    // Whenever the sheet's size changes — the step, the readout, a fold, a 3D view, the fonts — and once on observing.
    // A portrait tablet's sheet sticks whole: its height is all the layout needs.
    const resized = new ResizeObserver(([entry]) => {
      const height = entry.borderBoxSize[0]?.blockSize ?? sheet.offsetHeight;
      if (tablet.matches) layout.style.setProperty('--hc-mini-h', `${height}px`);
      if (!phone.matches) return;
      if (held()) setMini(height);
      else if (Math.abs(height - whole) >= 0.5) {
        whole = height;
        setMini(measureMini());
      }
    });
    const update = () => {
      if (!phone.matches) {
        unwatch();
        whole = 0;
        if (held()) release();
      }
      if (phone.matches || tablet.matches) {
        resized.observe(sheet);
        return;
      }
      resized.disconnect();
      layout.style.removeProperty('--hc-mini-h');
    };
    update();
    phone.addEventListener('change', update);
    tablet.addEventListener('change', update);
    return () => {
      phone.removeEventListener('change', update);
      tablet.removeEventListener('change', update);
      resized.disconnect();
      unwatch();
      window.cancelAnimationFrame(frame);
      release();
      layout.style.removeProperty('--hc-mini-h');
    };
  }, [enabled]);
  return layoutRef;
}

/**
 * Same-page links to the configurator land where they are for (09.10, audit F24); both used to land on its heading and
 * lede, the tabs below a phone's screen. The attached brief's «Змінити у конфігураторі ↑» (`data-open-steps`) brings
 * back the steps, on the step the visitor left, on any width: under a phone's mini drawing, the open step's tab focused
 * as the default jump would have moved focus there. Any other — the hero's «Зібрати конфігурацію ↓» — lands on a phone
 * with the drawing whole right under the header and the tabs under it: a first look, not yet the mini drawing. The
 * browser makes that jump itself (smooth, into the history), only its margin moves. Without JS, and from another page
 * (HOME's /angary#configurator), the link stays a plain anchor.
 * The block's own jumps (IN_BLOCK_JUMPS) move the page and leave the history as it was (10.10, audit F161): each added an
 * entry, and Back went to the stamp, then the steps, before it left /angary — three presses at 1440 px, two on a phone.
 * They make the browser's own jump — to the target's top under its scroll margin, smooth unless motion is reduced
 * (globals.css) — and the stamp takes the focus, as the browser gives it to a focusable target (audit F129). Up to
 * 1180 px wide «Обговорити» never reaches here: revealAttachedBrief makes that jump itself, to the brief.
 */
function useConfiguratorLinks(enabled: boolean, layoutRef: RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    if (!enabled) return undefined;
    const onClick = (event: MouseEvent) => {
      const link = event.target instanceof Element ? event.target.closest('a[href="#configurator"]') : null;
      const layout = layoutRef.current;
      const section = layout?.closest<HTMLElement>('#configurator');
      const tabs = layout?.querySelector<HTMLElement>('.hc-steps');
      if (!link || !layout || !section || !tabs || event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      if (link.hasAttribute('data-open-steps')) {
        // handled here: the desktop's smooth scrolling (Lenis, SmoothScroll.tsx) takes anchor clicks on the window too,
        // read the page mid-jump and carried it back down to the form
        event.preventDefault();
        event.stopPropagation();
        window.history.replaceState(window.history.state, '', '#configurator');
        tabs.querySelector<HTMLElement>('[aria-selected="true"]')?.focus({ preventScroll: true });
        landOnSteps(tabs);
        return;
      }
      if (!window.matchMedia(MINI_QUERY).matches) {
        section.style.removeProperty('scroll-margin-top');
        return;
      }
      const header = document.querySelector('.site-header')?.getBoundingClientRect().bottom ?? PHONE_HEADER_PX;
      const lead = layout.getBoundingClientRect().top - section.getBoundingClientRect().top;
      section.style.scrollMarginTop = `${header - lead}px`;
    };
    const onJump = (event: MouseEvent) => {
      const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>(IN_BLOCK_JUMPS) : null;
      const target = link ? document.getElementById(link.hash.slice(1)) : null;
      if (!link || !target || event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      // the desktop's smooth scrolling (Lenis) would make the same jump again from the window
      event.stopPropagation();
      window.history.replaceState(window.history.state, '', link.hash);
      target.scrollIntoView({ block: 'start' });
      if (target.hasAttribute('tabindex')) target.focus({ preventScroll: true });
    };
    document.addEventListener('click', onClick);
    document.addEventListener('click', onJump);
    return () => {
      document.removeEventListener('click', onClick);
      document.removeEventListener('click', onJump);
    };
  }, [enabled, layoutRef]);
}

export function HangarConfigurator({ embedded = false, nextSteps }: { embedded?: boolean; nextSteps?: readonly string[] }) {
  const sharedInquiry = useHangarInquiryContext();
  const layoutRef = useMiniPreview(embedded);
  useConfiguratorLinks(embedded, layoutRef);
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
        {/* 10.10 (audit F34, F11): what the drawing shows — it did not change for 15 of 24 answers under «Креслення
            змінюється з кожним вибором» — and that the request goes from any step: «Обговорити» is below the screen on
            all five, and «п’ять кроків» read as «all five first» */}
        <p className="hc-lede">
          {embedded
            ? keepShortWords('П’ять коротких кроків — від задачі до обсягу робіт. Розміри, стіни, ворота й каркас видно '
              + 'на кресленні. Надіслати можна з будь-якого кроку: технічне рішення й те, чого не оберете, уточнимо разом.')
            : 'Змінюйте параметри зліва — ескіз і підсумок праворуч оновлюються одразу.'}
        </p>
      </header>

      {/* A draft read back from this browser says so, with the way back to the example (07.10). «Почати заново» turns the
          same line into the way back to the visitor's configuration, its button keeping the focus, until they change
          something or open another step (10.10, audit F64): the line went, the focus with it, and the draft for good. */}
      {embedded && (sharedInquiry?.restored || sharedInquiry?.canUndoStartOver) && (
        <output className="hc-draft-note">
          {sharedInquiry.canUndoStartOver ? 'Показано приклад.' : 'Відновлено вашу конфігурацію.'}{' '}
          <button type="button" className="hc-draft-reset" onClick={sharedInquiry.canUndoStartOver ? sharedInquiry.undoStartOver : sharedInquiry.startOver}>
            {sharedInquiry.canUndoStartOver ? 'Повернути мою конфігурацію' : 'Почати заново'}
          </button>
        </output>
      )}
      <div className="hc-layout" ref={layoutRef}>
        <ConfiguratorControls state={state} onChange={updateBusinessConfiguration} step={step} onStep={setStep} foundationChoice={!embedded} nextSteps={nextSteps} />
        <div className="hc-preview-pane" id="hangar-live-preview">
          <HangarPreviewModes
            domain={previewDomain}
            frame={CONTROL_STEPS[step].id === 'frame'}
            presentationDemo={presentationDemo}
            presentationAnnouncement={sharedInquiry?.presentationAnnouncement}
            onEndPresentationDemo={sharedInquiry?.endPresentationDemo}
            sheet={embedded
              ? { object: sheetObjectLabel(sizesProvenance(businessDomain), businessDomain.dimensions, anythingChosen(businessDomain)), untouched: !own && !presentationDemo }
              : undefined}
          />
          {!embedded && <div id="hc-stamp"><ConfiguratorSummary domain={businessDomain} /></div>}
        </div>
      </div>
      {/* On the page the summary is the drawing's title block, under the layout: only the drawing stays sticky */}
      {embedded && (
        // «До підсумку ↓» under the last step lands here
        <div className="hc-stamp-row" id="hc-stamp" tabIndex={-1}>
          {/* Focusable for the jump to it (10.10, audit F129): the focus lands here, not on the page, and a screen reader
              says where the visitor went (configurator-controls.css drops the ring) */}
          <ConfiguratorSummary domain={businessDomain} showInquiryAction onInquiryAction={sharedInquiry?.attachConfiguration} />
        </div>
      )}
    </section>
  );
}
