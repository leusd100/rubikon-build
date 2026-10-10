'use client';

import { Suspense, lazy, useCallback, useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { DrawingSheet, type SheetCell } from '../DrawingSheet';
import type { HangarDomainModel } from '../../lib/configurator/domainModel';
import type { HangarPresentationDemo } from '../../lib/configurator/presentationDemo';
import { buildThreeScene } from '../../lib/configurator/threeSceneModel';
import { CladdingSection } from './CladdingSection';
import { ConfiguratorFrameView } from './ConfiguratorFrameView';
import { HangarPreview } from './HangarPreview';
import { miniReadout, previewDescription } from './sheetLabels';
import { useFirstViewBuildUp } from './useFirstViewBuildUp';
import { ThreeDimensionOverlay } from './three/ThreeDimensionOverlay';
import { ThreeErrorBoundary } from './three/ThreeErrorBoundary';
import { FullscreenPreviewFrame } from './three/FullscreenPreviewFrame';
import { MaterialPresetPicker } from './three/MaterialPresetPicker';
import {
  DEFAULT_ROOF_PRESET,
  DEFAULT_WALL_PRESET,
  roofPresetColor,
  wallPresetColor,
  type RoofPresetId,
  type WallPresetId,
} from './three/materialPresets';
import { SHEET_ROOF_COLOR, SHEET_WALL_COLOR } from './three/materials';
import { useConfiguratorMobile } from './three/useConfiguratorMobile';
import { useWebglSupport } from './three/useWebglSupport';

// Technical ↔ 3D mode switch.
//
// The product rule: these are two representations of ONE configured object. Switching must not
// touch configuration, controls or summary — so mode lives here, below the state that owns the
// configuration, and the 3D view receives the same DomainModel the technical view does.
//
// The technical view is canonical. 3D is an enhancement that loads on request and disappears
// quietly if anything about it fails.
//
// Phase 3C adds three OPT-IN, secondary 3D enhancements — fullscreen, material colour presets,
// an optional scale figure — all owned as local presentation state right here, the same way
// `mode` already is. None of the three is a fact about the configured building: switching them
// never touches `domain`, the controls, or the summary, matching the same rule `mode` itself
// already follows.

// Lazily imported so `three` and `@react-three/fiber` stay out of the initial page entirely. The
// import only fires when this component actually renders <ThreeHangarView>, i.e. after the user
// asks for 3D — verified in tests/e2e by asserting no three-* request before the click.
const ThreeHangarView = lazy(() => import('./three/ThreeHangarView'));

type Mode = 'technical' | 'frame' | 'three';

/** «Що показано» in the sheet's title block for the general view and the 3D. «Загальний вигляд», as drawings say it
 *  (10.10, audit F39: «вид» is a calque here); the «·» keeps to it, so a 320 px sheet's second line does not start with it */
const GENERAL_SHOWN = 'Загальний вигляд\u00A0· попередня схема';
const THREE_SHOWN = '3D-модель · попередня схема';

/** The title block sets its values in capitals; the metre stays a lower-case «м» (drawing-sheet.css .sheet-unit) */
function SheetValue({ text }: Readonly<{ text: string }>) {
  if (!text.endsWith('\u00A0м')) return text;
  return <>{text.slice(0, -1)}<span className="sheet-unit">м</span></>;
}

function ModeSwitch({
  mode,
  onSelect,
  threeAvailable,
  onSheet = false,
}: {
  mode: Mode;
  onSelect: (mode: Mode) => void;
  threeAvailable: boolean;
  /** In a drawing sheet's title block (/angary): a square two-cell switch under «Вид», so the first cell says
   *  «Технічний» and keeps «вид» for its name only */
  onSheet?: boolean;
}) {
  // A span in the title block (a figcaption's phrasing content), a div in the toolbar
  const Group = onSheet ? 'span' : 'div';
  return (
    // A group of two toggle buttons rather than tabs: tabs imply different content, and these are
    // two renderings of the same object. `aria-pressed` gives assistive tech the state without a
    // custom roving-tabindex implementation to get wrong.
    <Group className="hc-mode-switch" role="group" aria-label="Вид візуалізації">
      <button
        type="button"
        aria-pressed={mode === 'technical'}
        className={mode === 'technical' ? 'is-active' : undefined}
        onClick={() => onSelect('technical')}
      >
        {onSheet ? <>Технічний<span className="hc-visually-hidden"> вид</span></> : 'Технічний вид'}
      </button>
      <button
        type="button"
        aria-pressed={mode === 'three'}
        className={mode === 'three' ? 'is-active' : undefined}
        onClick={() => onSelect('three')}
        disabled={!threeAvailable}
        title={threeAvailable ? undefined : 'Ваш браузер не підтримує 3D-перегляд'}
      >
        3D
      </button>
    </Group>
  );
}

function ThreeLoading() {
  // Occupies the canvas slot exactly, so switching modes never shifts the surrounding layout.
  return (
    <div className="hc-preview-loading" role="status">
      <span className="hc-preview-loading-bar" aria-hidden="true" />
      <span>Завантаження 3D…</span>
    </div>
  );
}

function DemoStatusStrip({
  demo,
  onReturn,
}: {
  demo: HangarPresentationDemo;
  onReturn: () => void;
}) {
  return (
    <div className="hc-preview-demo-status">
      <span>{demo.label} · ваш вибір не змінено</span>
      <button type="button" onClick={onReturn}>Повернути мій варіант</button>
    </div>
  );
}

/** /angary's preview on a «Креслення» drawing sheet (03.10) — see HangarPreviewModes */
export type PreviewSheet = {
  /** «Об’єкт» in the title block: «Приклад · 24 × 60 × 8 м» or «Ваш ангар · …» (sheetObjectLabel) */
  object: string;
  /** The business configuration is still the default and no demonstration is on: the first view may build itself */
  untouched: boolean;
};

export function HangarPreviewModes({
  domain,
  presentationDemo,
  presentationAnnouncement,
  onEndPresentationDemo,
  sheet,
  frame = false,
}: {
  domain: HangarDomainModel;
  /** The configurator's «Каркас» step is open (07.10): the sheet shows the frame (ConfiguratorFrameView) */
  frame?: boolean;
  presentationDemo?: HangarPresentationDemo | null;
  presentationAnnouncement?: string;
  onEndPresentationDemo?: () => void;
  /** /angary lays the preview on a drawing sheet: rulers, a title block with what is shown, the object and the view
   *  switch, a dark image field in both themes (configurator-sheet.css). /configurator-preview keeps its card. */
  sheet?: PreviewSheet;
}) {
  // 3D is opened over one view and goes when the step changes the view (07.10): it remembers the view it was opened on
  const view2d: Mode = frame && sheet ? 'frame' : 'technical';
  const [threeOver, setThreeOver] = useState<Mode | null>(null);
  // …and is forgotten when the view changes (09.10, audit F14): opened on «Задача», gone on «Каркас», it came back by
  // itself on «Обсяг», with a new WebGL context nobody asked for. Reset while rendering, so 3D never shows for a frame.
  const [shownView, setShownView] = useState(view2d);
  if (shownView !== view2d) {
    setShownView(view2d);
    setThreeOver(null);
  }
  const descriptionId = useId();
  const [threeFailed, setThreeFailed] = useState(false);
  const webgl = useWebglSupport();
  const isMobile = useConfiguratorMobile();

  // Phase 3C presentation-only state — see the module doc above.
  // /angary's 3D is light steel on the dark sheet, with no colour choice (07.10): the default graphite read as grey on
  // grey there. The research screen keeps its presets.
  const [wallPreset, setWallPreset] = useState<WallPresetId>(sheet ? 'light-grey' : DEFAULT_WALL_PRESET);
  const [roofPreset, setRoofPreset] = useState<RoofPresetId>(sheet ? 'light-grey' : DEFAULT_ROOF_PRESET);
  // «Що показано» in the «Каркас» view: the step or the node on show (ConfiguratorFrameView)
  const [frameCaption, setFrameCaption] = useState('Каркас · попередня схема');
  const [showScaleFigure, setShowScaleFigure] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  // The phone's mini drawing folds to its sizes' line on request (07.10): over a step's fields it took a third of the
  // screen, more on «Каркас»
  const [miniFolded, setMiniFolded] = useState(false);
  // The steps follow the fold (09.10, audit F21): the page's scroll anchoring held them where they were, so folding left
  // a 120–150 px gap under the mini drawing and showing it again covered the tabs. Off for the frame of the change only:
  // everywhere else anchoring is what keeps the fields still under the finger. On the body, not the root: Chrome keeps
  // anchoring the page with `overflow-anchor: none` on <html>.
  const toggleMiniFold = () => {
    document.body.style.setProperty('overflow-anchor', 'none');
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => document.body.style.removeProperty('overflow-anchor')));
    setMiniFolded((folded) => !folded);
  };
  // How much of the canvas's bottom edge the dimension readout covers, measured by the overlay
  // itself. Lives here because the camera needs it and the overlay draws it, and they are siblings.
  const [overlayInsetPx, setOverlayInsetPx] = useState(0);
  // …and how far down it the sheet's chips reach (10.10, audit F55): on a phone the model stood up under them
  const [toolsInsetPx, setToolsInsetPx] = useState(0);
  const modeSwitchAnchorRef = useRef<HTMLDivElement>(null);
  const drawingRef = useRef<HTMLDivElement>(null);
  const released = useFirstViewBuildUp(drawingRef, Boolean(sheet), sheet?.untouched ?? false);
  // The phone's mini drawing reads its sizes in the title block, not off the drawing (configurator-sheet.css)
  const readout = useMemo(() => miniReadout(domain), [domain]);

  // Built here, from the same DomainModel the technical view consumes, so both representations
  // are guaranteed to describe the same configuration. Memoised so a mode switch alone never
  // rebuilds geometry.
  const threeScene = useMemo(() => buildThreeScene(domain), [domain]);

  const threeAvailable = webgl === 'available' && !threeFailed;

  const handleThreeError = useCallback(() => {
    setThreeFailed(true);
    setThreeOver(null);
    setIsFullscreen(false);
  }, []);

  // Derived, not stored-and-corrected: if 3D is unavailable (probe says no, or the renderer threw)
  // the technical view is simply what "3D mode" resolves to, so there is no window in which an
  // empty frame is on screen waiting for an effect to fix the state.
  const effectiveMode: Mode = threeOver === view2d && threeAvailable ? 'three' : view2d;
  const showThree = effectiveMode === 'three';

  const exitFullscreen = useCallback(() => setIsFullscreen(false), []);
  const selectMode = useCallback((next: Mode) => {
    setThreeOver(next === 'three' ? view2d : null);
  }, [view2d]);
  // What the sheet's one 3D button just showed, for the hidden status line (09.10, audit F76): the button keeps focus
  // as its words change, and a screen reader hears the new «Що показано»
  const [viewNote, setViewNote] = useState('');
  /** As 3D opens on the sheet (10.10, audit F55): what the drawing's legend under it took, which a phone's 3D picture
   *  takes too, so the sheet keeps its height both ways (configurator-sheet.css --hc-legend-h; it jumped 63 px); and how
   *  far down the picture its chips reach, for the model to stand clear under them */
  const holdField = (chip: HTMLElement) => {
    const image = drawingRef.current;
    const drawing = image?.querySelector('.hc-preview-svg');
    const tools = chip.closest<HTMLElement>('.hc-sheet-tools');
    if (!image || !drawing || !tools) return;
    image.style.setProperty('--hc-legend-h', `${Math.max(0, image.clientHeight - drawing.getBoundingClientRect().height)}px`);
    setToolsInsetPx(tools.offsetTop + tools.offsetHeight + 8);
  };
  // 3D goes when the phone's mini drawing comes (10.10, audit F55): the mini drawing has no chip to go back by, and held
  // the 3D picture under the header with no way to the drawing
  useEffect(() => {
    const layout = drawingRef.current?.closest<HTMLElement>('.hc-layout');
    if (!sheet || !showThree || isFullscreen || !layout) return undefined;
    const observer = new MutationObserver(() => {
      if ('configuring' in layout.dataset) setThreeOver(null);
    });
    observer.observe(layout, { attributes: true, attributeFilter: ['data-configuring'] });
    return () => observer.disconnect();
  }, [sheet, showThree, isFullscreen]);
  const handleEndPresentationDemo = useCallback(() => {
    onEndPresentationDemo?.();
    if (!isFullscreen) {
      const anchor = modeSwitchAnchorRef.current;
      requestAnimationFrame(() => anchor?.querySelector<HTMLButtonElement>('button')?.focus());
    }
  }, [isFullscreen, onEndPresentationDemo]);

  /**
   * The Canvas is mounted only while 3D is the active mode, so switching back to Technical
   * unmounts it and the next switch to 3D builds a fresh WebGL context. That was investigated as
   * a performance defect and the answer is: LEAVE IT. Recorded here because the investigation was
   * expensive and the wrong conclusion is very easy to reach from CI numbers.
   *
   * Measured on real hardware (Apple M1, ANGLE Metal, hardware WebGL), repeat Technical -> 3D:
   *
   *   first real frame        median 115 ms   (93-122 over 8 runs)
   *   fully settled           median 172 ms   (144-181)
   *   main thread blocked     median  62 ms   (51-64)
   *
   * That is inside the product target of <200 ms with no long tail and no bimodality.
   *
   * The SAME measurement under Playwright's headless Chromium reports a 1.3-1.7 s main-thread
   * block on every switch, and a 0.8-1.4 s "intermittent tail". Both are artefacts of the test
   * environment, not of this code. A CPU profile of that block is 1529 ms of `(program)` (native
   * driver work) plus 89 ms of `getProgramInfoLog` — Three blocking synchronously while the driver
   * links the 7 shader programs a new context cannot inherit. Headless Chromium renders through a
   * software GL where `KHR_parallel_shader_compile` is UNAVAILABLE, so that link has to block; on
   * the M1 the same extension IS available and the driver compiles off-thread, which is the whole
   * difference between 1.5 s and 62 ms.
   *
   * So: do not "fix" this from a CI timing, and do not keep the Canvas mounted to chase it. Keeping
   * it mounted would trade a 62 ms cost for a permanently resident WebGL context, a hidden scene
   * that must be provably paused, and the loss of the guarantee that a visitor who never opens 3D
   * pays nothing for it.
   *
   * What IS real, and accepted: one WebGL context per switch (20 cycles -> 20 contexts, 1 canvas
   * node). The browser evicts the stale ones — 11 of 12 observed being reclaimed — so this is
   * bounded by the browser rather than by us, and each rebuild costs the 62 ms above.
   */
  const threeCanvas = showThree ? (
    <div className="hc-preview-canvas">
      <ThreeErrorBoundary onError={handleThreeError}>
        <Suspense fallback={<ThreeLoading />}>
          <ThreeHangarView
            scene={threeScene}
            // Mobile keeps the geometry identical and only lowers presentation density —
            // no separate mobile building model.
            shadows={!isMobile}
            // Phase 3F §14 — the fullscreen quality tier. Same Canvas, same mount, same scene the
            // whole time (`threeCanvas` above is one JSX subtree regardless of `isFullscreen`;
            // `FullscreenPreviewFrame` only repositions it — see that component's own doc comment
            // for why a second Canvas/WebGL context was explicitly rejected) — only these two
            // presentation props change when the user asks for fullscreen, both already reactive
            // props R3F/Three re-read on change rather than baking in at creation (see
            // SceneLighting's own `ShadowMapResize`-equivalent effect for the shadow-map half of
            // this). Mobile's own lower ceiling always wins over the fullscreen bump — a phone in
            // fullscreen still has a phone GPU.
            // The mobile ceiling is also what bounds roof rib legibility on long buildings, and
            // that was measured rather than assumed. Roof ribs are real swept geometry at a
            // constant 0.2 m pitch (envelopePanelGeometry.ts), so a 50 m building carries ~250 of
            // them; the camera frames it into ~200 CSS px of preview, which is well under one
            // rib per pixel, and the far slope reads as a moire speckle rather than as profiled
            // sheet. It is NOT the procedural noise maps: removing `normalMap` from every
            // material outright moves the frame by at most 2/255, so anisotropy and repeat are
            // the wrong lever. Raising this ceiling is the right one, and it works — probed at
            // 390px with a 50 m building, 2 visibly evens the dashes and 3 resolves them into
            // clean continuous ribs — but 3 is 4x the fragments of 1.5 on the device least able
            // to afford them, and no phone-hardware frame timing has been taken to justify that
            // trade. Left at 1.5 deliberately: a cosmetic gain at long lengths does not outrank a
            // deliberate perf tier, and the fix is recorded here so it can be taken as a decision
            // with device testing rather than discovered again from the symptom.
            maxDpr={isMobile ? 1.5 : isFullscreen ? 3 : 2}
            shadowMapSize={isFullscreen ? 2048 : 1024}
            // /angary's sheet: the technical look's light steel, the roof a step above the walls (10.10, materials.ts)
            wallColor={sheet ? SHEET_WALL_COLOR : wallPresetColor(wallPreset)}
            roofColor={sheet ? SHEET_ROOF_COLOR : roofPresetColor(roofPreset)}
            showScaleFigure={showScaleFigure}
            bottomInsetPx={overlayInsetPx}
            topInsetPx={sheet && !isFullscreen ? toolsInsetPx : 0}
          />
        </Suspense>
      </ThreeErrorBoundary>
      {/* Plain HTML, not WebGL text (brief §27) — renders immediately, independent of the
          lazy three.js chunk, so the numbers are there even while "Завантаження 3D…" is
          still showing. Outside ThreeErrorBoundary on purpose: a renderer failure should
          still leave this orientation readout on screen right up until the fallback to
          Technical actually happens. */}
      <ThreeDimensionOverlay
        onBottomInsetChange={setOverlayInsetPx}
        widthM={domain.dimensions.widthM}
        lengthM={domain.dimensions.lengthM}
        eaveM={domain.dimensions.eaveHeightM}
        ridgeM={threeScene.building.heights.ridgeM}
      />
      {/* Travels with the same Canvas into fullscreen, where the rest of the page is inert.
          Remains available even when the visitor hides the visual dimension overlay. */}
      <p id={descriptionId} className="hc-visually-hidden">
        {previewDescription('three', domain.dimensions, threeScene.building.heights.ridgeM)}
      </p>
    </div>
  ) : null;

  let view: ReactNode;
  if (showThree) view = (
    <FullscreenPreviewFrame
      active={isFullscreen}
      onExit={exitFullscreen}
      className={sheet ? 'hc-fullscreen-sheet' : undefined}
      labelledBy="Розгорнутий перегляд 3D-моделі ангара"
      describedBy={descriptionId}
      announcement={presentationAnnouncement}
      status={presentationDemo
        ? <DemoStatusStrip demo={presentationDemo} onReturn={handleEndPresentationDemo} />
        : null}
    >
      {threeCanvas}
    </FullscreenPreviewFrame>
  );
  else if (effectiveMode === 'frame' && sheet) view = <ConfiguratorFrameView onCaption={setFrameCaption} />;
  else view = <HangarPreview domain={domain} released={released} />;

  // Fullscreen and secondary 3D actions — brief §10's own suggested hierarchy: mode switch stays
  // primary, everything else stays a small, clearly secondary action beside it. Only meaningful in
  // 3D, so only shown there — no dead controls in Technical mode.
  const expand = (
    <button type="button" className={sheet ? 'hc-sheet-expand' : 'hc-secondary-action'} onClick={() => setIsFullscreen(true)}>
      Розгорнути
    </button>
  );

  // Colours and the scale figure: under the picture on the research screen only — /angary's 3D has none (07.10)
  const threeOptions = (
    <>
      <MaterialPresetPicker
        wallPreset={wallPreset}
        roofPreset={roofPreset}
        onWallPresetChange={setWallPreset}
        onRoofPresetChange={setRoofPreset}
        wallsInScope={domain.scope.walls}
        roofInScope={domain.scope.roof}
      />
      <label className="hc-scale-figure-toggle">
        <input
          type="checkbox"
          checked={showScaleFigure}
          onChange={(e) => setShowScaleFigure(e.target.checked)}
        />
        Показати людину для масштабу
      </label>
    </>
  );

  let shownOnSheet = GENERAL_SHOWN;
  if (effectiveMode === 'frame') shownOnSheet = frameCaption;
  else if (showThree) shownOnSheet = THREE_SHOWN;
  const sheetCells: SheetCell[] = sheet ? [
    // keyed, and the sizes untranslated: a page translation left them at their old values (08.10)
    {
      tone: 'main',
      label: 'Що показано',
      value: <span key={shownOnSheet}>{shownOnSheet}</span>,
      // the frame's captions differ in length from step to step: a phone keeps two lines for them (sheet css)
      className: effectiveMode === 'frame' ? 'hc-sheet-shown is-frame' : 'hc-sheet-shown',
    },
    { label: 'Об’єкт', value: <span translate="no"><SheetValue text={sheet.object} /></span> },
    // shown only by the phone's mini drawing, in place of the other cells
    { value: <span translate="no">{readout}</span>, className: 'hc-sheet-readout' },
  ] : [];

  return (
    <>
      {!isFullscreen && (
        <p className="hc-visually-hidden hc-presentation-announcement" role="status" aria-live="polite" aria-atomic="true">
          {presentationAnnouncement || viewNote}
        </p>
      )}
      {presentationDemo && !isFullscreen && (
        <DemoStatusStrip demo={presentationDemo} onReturn={handleEndPresentationDemo} />
      )}
      {sheet ? (
        // The sheet is the surface: the phone's mini drawing holds the whole sheet under the header (HangarConfigurator)
        <DrawingSheet
          className={`hc-preview-surface hc-preview-sheet${miniFolded ? ' is-folded' : ''}`}
          imageClassName={`hc-preview-image${effectiveMode === 'frame' ? ' hc-frame-image' : ''}`}
          imageRef={drawingRef}
          cells={sheetCells}
          // shown only by the phone's mini drawing (configurator-sheet.css). Its words are its state, said once (10.10,
          // audit F131): with aria-expanded as well, a screen reader heard «Згорнути, розгорнуто».
          action={(
            <button type="button" className="hc-mini-toggle" onClick={toggleMiniFold}>
              {/* the picture is «креслення» everywhere (10.10, audit F101: «ескіз» here only); the changing words are its only
                  state signal (audit F131) */}
              {miniFolded ? 'Показати креслення' : 'Згорнути'}
            </button>
          )}
        >
          {view}
          {/* The layers the technical drawing cannot show from outside: the insulation, the panel's core (07.10) */}
          {effectiveMode === 'technical' && <CladdingSection domain={domain} />}
          {/* 3D, a secondary look: a chip on the drawing opens it, and in 3D the same chip goes back (07.10). One button in
              one place whose words change (09.10, audit F76): two buttons swapped out from under the keyboard, and focus
              fell to the page's start. Not on «Каркас» (09.10, owner, audit F14): the step is the frame's line drawing —
              3D showed the clad hangar and took the step's own list from beside it. «Розгорнути» joins it in 3D, the
              picture's own action. */}
          {threeAvailable && view2d !== 'frame' && (
            <div className="hc-sheet-tools">
              <button
                type="button"
                className={showThree ? 'hc-sheet-chip' : 'hc-sheet-chip hc-sheet-three'}
                onClick={(event) => {
                  if (!showThree) holdField(event.currentTarget);
                  selectMode(showThree ? 'technical' : 'three');
                  setViewNote(showThree ? GENERAL_SHOWN : THREE_SHOWN);
                }}
              >
                {showThree ? <><span aria-hidden="true">←</span> Креслення</> : 'Подивитися в 3D'}
              </button>
              {showThree && expand}
            </div>
          )}
        </DrawingSheet>
      ) : (
        <>
          <div className="hc-preview-toolbar">
            <div className="hc-preview-toolbar-actions">
              {showThree && <div className="hc-preview-secondary-actions">{expand}</div>}
              <div ref={modeSwitchAnchorRef}>
                <ModeSwitch mode={effectiveMode} onSelect={selectMode} threeAvailable={threeAvailable} />
              </div>
            </div>
          </div>
          <div className="hc-preview-surface">{view}</div>
        </>
      )}

      {/* Material presets + scale figure toggle — secondary, below the preview rather than
          crowding the toolbar (brief §10: "not a cockpit"). Only relevant in 3D (colour and a 3D
          scale prop mean nothing on the technical line drawing), and hidden entirely while
          fullscreen — the expanded view is deliberately minimal chrome (canvas + overlay + close
          only), matching FullscreenPreviewFrame's own doc comment. */}
      {showThree && !isFullscreen && !sheet && (
        <div className="hc-preview-secondary-panel">{threeOptions}</div>
      )}
    </>
  );
}
