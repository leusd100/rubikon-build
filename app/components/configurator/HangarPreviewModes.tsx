'use client';

import { Suspense, lazy, useCallback, useId, useMemo, useState } from 'react';
import type { HangarDomainModel } from '../../lib/configurator/domainModel';
import { buildThreeScene } from '../../lib/configurator/threeSceneModel';
import { HangarPreview } from './HangarPreview';
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

function ModeSwitch({
  mode,
  onSelect,
  threeAvailable,
}: {
  mode: Mode;
  onSelect: (mode: Mode) => void;
  threeAvailable: boolean;
}) {
  return (
    // A group of two toggle buttons rather than tabs: tabs imply different content, and these are
    // two renderings of the same object. `aria-pressed` gives assistive tech the state without a
    // custom roving-tabindex implementation to get wrong.
    <div className="hc-mode-switch" role="group" aria-label="Вид візуалізації">
      <button
        type="button"
        aria-pressed={mode === 'technical'}
        className={mode === 'technical' ? 'is-active' : undefined}
        onClick={() => onSelect('technical')}
      >
        Технічний вид
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
    </div>
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

export function HangarPreviewModes({ domain }: { domain: HangarDomainModel }) {
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
  // How much of the canvas's bottom edge the dimension readout covers, measured by the overlay
  // itself. Lives here because the camera needs it and the overlay draws it, and they are siblings.
  const [overlayInsetPx, setOverlayInsetPx] = useState(0);

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
        {`Тривимірна візуалізація ангара: ${domain.dimensions.widthM} на ${domain.dimensions.lengthM} метрів, `
          + `висота стін ${domain.dimensions.eaveHeightM} м, двосхила покрівля, висота в коньку приблизно `
          + `${threeScene.building.heights.ridgeM.toFixed(1)} м. Повний опис конфігурації — у полях керування та підсумку.`}
      </p>
    </div>
  ) : null;

  return (
    <>
      <div className="hc-preview-toolbar">
        <p className="hc-preview-disclaimer" role="note">
          Візуалізація є схематичною і не є проєктною або конструкторською документацією.
        </p>
        <div className="hc-preview-toolbar-actions">
          {/* Secondary actions — brief §10's own suggested hierarchy: mode switch stays primary,
              everything else stays a small, clearly secondary action beside it. Only meaningful in
              3D, so only shown there — no dead controls in Technical mode. */}
          {showThree && (
            <div className="hc-preview-secondary-actions">
              <button type="button" className="hc-secondary-action" onClick={() => setIsFullscreen(true)}>
                Розгорнути
              </button>
            </div>
          )}
          <ModeSwitch mode={effectiveMode} onSelect={setMode} threeAvailable={threeAvailable} />
        </div>
      </div>

      <div className="hc-preview-surface">
        {showThree ? (
          <FullscreenPreviewFrame active={isFullscreen} onExit={exitFullscreen} labelledBy="Розгорнутий перегляд 3D-моделі ангара" describedBy={descriptionId}>
            {threeCanvas}
          </FullscreenPreviewFrame>
        ) : (
          <HangarPreview domain={domain} />
        )}
      </div>

      {/* Material presets + scale figure toggle — secondary, below the preview rather than
          crowding the toolbar (brief §10: "not a cockpit"). Only relevant in 3D (colour and a 3D
          scale prop mean nothing on the technical line drawing), and hidden entirely while
          fullscreen — the expanded view is deliberately minimal chrome (canvas + overlay + close
          only), matching FullscreenPreviewFrame's own doc comment. */}
      {showThree && !isFullscreen && (
        <div className="hc-preview-secondary-panel">
          <MaterialPresetPicker
            wallPreset={wallPreset}
            roofPreset={roofPreset}
            onWallPresetChange={setWallPreset}
            onRoofPresetChange={setRoofPreset}
          />
          <label className="hc-scale-figure-toggle">
            <input
              type="checkbox"
              checked={showScaleFigure}
              onChange={(e) => setShowScaleFigure(e.target.checked)}
            />
            Показати людину для масштабу
          </label>
        </div>
      )}
    </>
  );
}
