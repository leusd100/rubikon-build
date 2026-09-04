'use client';

import { Suspense, lazy, useCallback, useMemo, useState } from 'react';
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
  const [threeFailed, setThreeFailed] = useState(false);
  const webgl = useWebglSupport();
  const isMobile = useConfiguratorMobile();

  // Phase 3C presentation-only state — see the module doc above.
  const [wallPreset, setWallPreset] = useState<WallPresetId>(DEFAULT_WALL_PRESET);
  const [roofPreset, setRoofPreset] = useState<RoofPresetId>(DEFAULT_ROOF_PRESET);
  const [showScaleFigure, setShowScaleFigure] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

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
            maxDpr={isMobile ? 1.5 : 2}
            wallColor={wallPresetColor(wallPreset)}
            roofColor={roofPresetColor(roofPreset)}
            showScaleFigure={showScaleFigure}
          />
        </Suspense>
      </ThreeErrorBoundary>
      {/* Plain HTML, not WebGL text (brief §27) — renders immediately, independent of the
          lazy three.js chunk, so the numbers are there even while "Завантаження 3D…" is
          still showing. Outside ThreeErrorBoundary on purpose: a renderer failure should
          still leave this orientation readout on screen right up until the fallback to
          Technical actually happens. */}
      <ThreeDimensionOverlay
        widthM={domain.dimensions.widthM}
        lengthM={domain.dimensions.lengthM}
        eaveM={domain.dimensions.eaveHeightM}
        ridgeM={threeScene.building.heights.ridgeM}
      />
    </div>
  ) : null;

  return (
    <>
      <div className="hc-preview-toolbar">
        <ModeSwitch mode={effectiveMode} onSelect={setMode} threeAvailable={threeAvailable} />
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
      </div>

      <div className="hc-preview-surface">
        {showThree ? (
          <FullscreenPreviewFrame active={isFullscreen} onExit={exitFullscreen} labelledBy="Розгорнутий перегляд 3D-моделі ангара">
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

      {/* The canvas itself is aria-hidden, so in 3D mode this carries the same description the
          technical SVG exposes through its own role="img" label. No configuration information is
          only available visually, in either mode. */}
      {showThree && (
        <p className="hc-visually-hidden">
          {`Тривимірна візуалізація ангара: ${domain.dimensions.widthM} на ${domain.dimensions.lengthM} метрів, `
            + `висота стін ${domain.dimensions.eaveHeightM} м, двосхила покрівля, висота в коньку приблизно `
            + `${threeScene.building.heights.ridgeM.toFixed(1)} м. Повний опис конфігурації — у полях керування та підсумку нижче.`}
        </p>
      )}
    </>
  );
}
