'use client';

import { Suspense, lazy, useCallback, useEffect, useId, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { DrawingSheet, type SheetCell } from '../DrawingSheet';
import type { HangarDomainModel } from '../../lib/configurator/domainModel';
import type { HangarPresentationDemo } from '../../lib/configurator/presentationDemo';
import { buildThreeScene } from '../../lib/configurator/threeSceneModel';
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

type Mode = 'technical' | 'three';

/** The configurator's two columns (stacked ≤ 1023 px, configurator.css), where the preview pane is sticky */
const DOCKED_QUERY = '(min-width: 1024px)';

function subscribeDocked(onStoreChange: () => void) {
  const media = window.matchMedia(DOCKED_QUERY);
  media.addEventListener('change', onStoreChange);
  return () => media.removeEventListener('change', onStoreChange);
}

/** Whether the preview is the sticky right-hand pane. Only the 3D view (never server-rendered) reads it. */
function useDockedPane(): boolean {
  return useSyncExternalStore(subscribeDocked, () => window.matchMedia(DOCKED_QUERY).matches, () => false);
}

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
}: {
  domain: HangarDomainModel;
  presentationDemo?: HangarPresentationDemo | null;
  presentationAnnouncement?: string;
  onEndPresentationDemo?: () => void;
  /** /angary lays the preview on a drawing sheet: rulers, a title block with what is shown, the object and the view
   *  switch, a dark image field in both themes (configurator-sheet.css). /configurator-preview keeps its card. */
  sheet?: PreviewSheet;
}) {
  const [mode, setMode] = useState<Mode>('technical');
  const descriptionId = useId();
  const [threeFailed, setThreeFailed] = useState(false);
  const webgl = useWebglSupport();
  const isMobile = useConfiguratorMobile();

  // Phase 3C presentation-only state — see the module doc above.
  const [wallPreset, setWallPreset] = useState<WallPresetId>(DEFAULT_WALL_PRESET);
  const [roofPreset, setRoofPreset] = useState<RoofPresetId>(DEFAULT_ROOF_PRESET);
  const [showScaleFigure, setShowScaleFigure] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  // /angary's sticky pane keeps the 3D options on the picture, folded under a chip (see `threeOptions` below)
  const docked = useDockedPane();
  const [optionsOpen, setOptionsOpen] = useState(false);
  const optionsId = useId();
  const optionsChipRef = useRef<HTMLButtonElement>(null);
  // How much of the canvas's bottom edge the dimension readout covers, measured by the overlay
  // itself. Lives here because the camera needs it and the overlay draws it, and they are siblings.
  const [overlayInsetPx, setOverlayInsetPx] = useState(0);
  const modeSwitchAnchorRef = useRef<HTMLDivElement>(null);
  const sheetViewRef = useRef<HTMLSpanElement>(null);
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
    setMode('technical');
    setIsFullscreen(false);
  }, []);

  // Derived, not stored-and-corrected: if 3D is unavailable (probe says no, or the renderer threw)
  // the technical view is simply what "3D mode" resolves to, so there is no window in which an
  // empty frame is on screen waiting for an effect to fix the state.
  const effectiveMode: Mode = threeAvailable ? mode : 'technical';
  const showThree = effectiveMode === 'three';

  const exitFullscreen = useCallback(() => setIsFullscreen(false), []);
  const selectMode = useCallback((next: Mode) => {
    setMode(next);
    if (next !== 'three') setOptionsOpen(false);
  }, []);
  // Escape folds the colours back to their chip: listened for on the tools' own node, not through a key handler on a
  // div (no element of its own to take the key)
  const sheetToolsRef = useRef<HTMLDivElement>(null);
  const handleEndPresentationDemo = useCallback(() => {
    onEndPresentationDemo?.();
    if (!isFullscreen) {
      const anchor = sheetViewRef.current ?? modeSwitchAnchorRef.current;
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
            wallColor={wallPresetColor(wallPreset)}
            roofColor={roofPresetColor(roofPreset)}
            showScaleFigure={showScaleFigure}
            bottomInsetPx={overlayInsetPx}
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

  const view = showThree ? (
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
  ) : (
    <HangarPreview domain={domain} released={released} />
  );

  // Fullscreen and secondary 3D actions — brief §10's own suggested hierarchy: mode switch stays
  // primary, everything else stays a small, clearly secondary action beside it. Only meaningful in
  // 3D, so only shown there — no dead controls in Technical mode.
  const expand = (
    <button type="button" className={sheet ? 'hc-sheet-expand' : 'hc-secondary-action'} onClick={() => setIsFullscreen(true)}>
      Розгорнути
    </button>
  );

  // Colours and the scale figure: under the picture, except in /angary's sticky pane (≥ 1024 px), where a panel under
  // the sheet pushed the pane past the bottom of the screen (03.10: 921 px at 1440×900, the whole panel below the fold at
  // 1024×768) — there they open from a chip on the picture, beside «Розгорнути»
  const optionsOnPicture = Boolean(sheet) && docked;
  useEffect(() => {
    const tools = sheetToolsRef.current;
    if (!tools || !optionsOpen || !optionsOnPicture) return undefined;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setOptionsOpen(false);
      optionsChipRef.current?.focus();
    };
    tools.addEventListener('keydown', closeOnEscape);
    return () => tools.removeEventListener('keydown', closeOnEscape);
  }, [optionsOpen, optionsOnPicture]);
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

  const sheetCells: SheetCell[] = sheet ? [
    { tone: 'main', label: 'Що показано', value: 'Загальний вид · попередня схема' },
    { label: 'Об’єкт', value: <SheetValue text={sheet.object} /> },
    // shown only by the phone's mini drawing, in place of the other cells
    { value: readout, className: 'hc-sheet-readout' },
  ] : [];

  return (
    <>
      {!isFullscreen && (
        <p className="hc-visually-hidden hc-presentation-announcement" role="status" aria-live="polite" aria-atomic="true">
          {presentationAnnouncement}
        </p>
      )}
      {presentationDemo && !isFullscreen && (
        <DemoStatusStrip demo={presentationDemo} onReturn={handleEndPresentationDemo} />
      )}
      {sheet ? (
        // The sheet is the surface: the phone's mini drawing holds the whole sheet under the header (HangarConfigurator)
        <DrawingSheet
          className="hc-preview-surface hc-preview-sheet"
          imageClassName="hc-preview-image"
          imageRef={drawingRef}
          cells={sheetCells}
          action={(
            <span className="hc-sheet-view" ref={sheetViewRef}>
              <small aria-hidden="true">Вид</small>
              <ModeSwitch mode={effectiveMode} onSelect={selectMode} threeAvailable={threeAvailable} onSheet />
            </span>
          )}
        >
          {view}
          {/* On the 3D picture itself, out of the title block: they are the picture's own actions */}
          {showThree && (
            // the colours follow their chip in the tab order, before «Розгорнути»; Escape folds them back to it
            <div className="hc-sheet-tools" ref={sheetToolsRef}>
              {optionsOnPicture && (
                <>
                  <button
                    type="button"
                    ref={optionsChipRef}
                    className="hc-sheet-chip"
                    aria-expanded={optionsOpen}
                    aria-controls={optionsId}
                    onClick={() => setOptionsOpen((open) => !open)}
                  >
                    Кольори й масштаб
                  </button>
                  <div id={optionsId} className="hc-preview-secondary-panel hc-sheet-options" hidden={!optionsOpen}>
                    {threeOptions}
                  </div>
                </>
              )}
              {expand}
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
      {showThree && !isFullscreen && !optionsOnPicture && (
        <div className="hc-preview-secondary-panel">{threeOptions}</div>
      )}
    </>
  );
}
