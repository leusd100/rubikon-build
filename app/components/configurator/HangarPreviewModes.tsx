'use client';

import { Suspense, lazy, useCallback, useMemo, useState } from 'react';
import type { HangarDomainModel } from '../../lib/configurator/domainModel';
import { buildThreeScene } from '../../lib/configurator/threeSceneModel';
import { HangarPreview } from './HangarPreview';
import { ThreeErrorBoundary } from './three/ThreeErrorBoundary';
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

  // Built here, from the same DomainModel the technical view consumes, so both representations
  // are guaranteed to describe the same configuration. Memoised so a mode switch alone never
  // rebuilds geometry.
  const threeScene = useMemo(() => buildThreeScene(domain), [domain]);

  const threeAvailable = webgl === 'available' && !threeFailed;

  const handleThreeError = useCallback(() => {
    setThreeFailed(true);
    setMode('technical');
  }, []);

  // Derived, not stored-and-corrected: if 3D is unavailable (probe says no, or the renderer threw)
  // the technical view is simply what "3D mode" resolves to, so there is no window in which an
  // empty frame is on screen waiting for an effect to fix the state.
  const effectiveMode: Mode = threeAvailable ? mode : 'technical';
  const showThree = effectiveMode === 'three';

  return (
    <>
      <div className="hc-preview-toolbar">
        <ModeSwitch mode={effectiveMode} onSelect={setMode} threeAvailable={threeAvailable} />
      </div>

      <div className="hc-preview-surface">
        {showThree ? (
          <div className="hc-preview-canvas">
            <ThreeErrorBoundary onError={handleThreeError}>
              <Suspense fallback={<ThreeLoading />}>
                <ThreeHangarView
                  scene={threeScene}
                  // Mobile keeps the geometry identical and only lowers presentation density —
                  // no separate mobile building model.
                  shadows={!isMobile}
                  maxDpr={isMobile ? 1.5 : 2}
                />
              </Suspense>
            </ThreeErrorBoundary>
          </div>
        ) : (
          <HangarPreview domain={domain} />
        )}
      </div>

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
