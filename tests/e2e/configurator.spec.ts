import { expect, test, type Page } from '@playwright/test';

async function openConfigurator(page: Page) {
  await page.goto('/configurator-preview', { waitUntil: 'load' });
  const essentialCookiesButton = page.getByRole('button', { name: 'Лише необхідні', exact: true });
  await expect(essentialCookiesButton).toBeVisible({ timeout: 10_000 });
  await essentialCookiesButton.click();
}

test.describe('hangar configurator POC', () => {
  test('is excluded from indexing', async ({ page }) => {
    await openConfigurator(page);
    const robotsMeta = page.locator('meta[name="robots"]');
    await expect(robotsMeta).toHaveAttribute('content', /noindex/);
  });

  test('shows the schematic-not-engineering disclaimer', async ({ page }) => {
    await openConfigurator(page);
    const disclaimer = page.locator('.hc-preview-toolbar .hc-preview-disclaimer');
    await expect(disclaimer).toContainText('не є проєктною або конструкторською документацією');
    await expect(disclaimer).toBeVisible();
    await expect(page.locator('.hc-hero .hc-preview-disclaimer')).toHaveCount(0);
    const fontSize = await disclaimer.evaluate((element) => Number.parseFloat(getComputedStyle(element).fontSize));
    expect(fontSize).toBeGreaterThanOrEqual(14);
  });

  test('changing a dimension updates both the summary text and the on-screen dimension label', async ({ page }) => {
    await openConfigurator(page);
    const widthInput = page.getByRole('spinbutton', { name: /Ширина/i }).or(page.locator('#hc-dimension-width'));

    await widthInput.fill('30');
    await widthInput.blur();

    await expect(page.locator('.hc-summary-dimensions')).toHaveText('30 × 60 × 8 м');
    await expect(page.locator('.hc-preview-svg')).toContainText('30 м');
  });

  test('area recalculates as width × length', async ({ page }) => {
    await openConfigurator(page);
    const widthInput = page.locator('#hc-dimension-width');
    const lengthInput = page.locator('#hc-dimension-length');

    await widthInput.fill('20');
    await lengthInput.fill('50');
    await lengthInput.blur();

    await expect(page.locator('.hc-summary-area')).toContainText('1 000 м²');
  });

  test('unchecking a scope item removes its fill layer and updates the summary list', async ({ page }) => {
    await openConfigurator(page);

    // Since Phase 3-0 the front face is a GABLE END — one pentagon following the roof pitch,
    // not a row of rectangular bay segments. The bay rhythm now lives on the side walls, which
    // is where the structural bays actually run.
    await expect(page.locator('.hc-front polygon.has-walls')).toHaveCount(1);
    await expect(page.locator('.hc-front polygon.no-walls')).toHaveCount(0);
    await expect(page.locator('.hc-side-left polygon.has-walls')).toHaveCount(10);
    await page.getByText('Стіни / огороджувальний контур', { exact: true }).click();

    await expect(page.locator('.hc-front polygon.no-walls')).toHaveCount(1);
    await expect(page.locator('.hc-front polygon.has-walls')).toHaveCount(0);
    await expect(page.locator('.hc-summary-facts')).not.toContainText('Стіни');
  });

  test('gate size class widens and heightens the opening, and is only offered when a gate exists', async ({ page }) => {
    await openConfigurator(page);

    const equipmentOption = page.getByText('Для заїзду техніки', { exact: true });
    await expect(equipmentOption).toBeVisible();

    const standardBox = await page.locator('.hc-preview-svg .hc-gate').first().boundingBox();
    await equipmentOption.click();
    const wideBox = await page.locator('.hc-preview-svg .hc-gate').first().boundingBox();

    expect(wideBox!.width).toBeGreaterThan(standardBox!.width);
    expect(wideBox!.height).toBeGreaterThan(standardBox!.height);

    // With no gate there is nothing to size, so the choice is withdrawn rather than shown inert.
    await page.locator('.hc-option-card', { hasText: '0' }).click();
    await expect(equipmentOption).toHaveCount(0);
  });

  test('the gate size class survives a switch to 3D and back', async ({ page }) => {
    await openConfigurator(page);
    await page.getByText('Для заїзду техніки', { exact: true }).click();

    await page.getByRole('button', { name: '3D', exact: true }).click();
    await expect(page.locator('.hc-preview-surface canvas')).toBeVisible({ timeout: 20_000 });
    await page.getByRole('button', { name: 'Технічний вид', exact: true }).click();

    await expect(page.locator('.hc-preview-svg')).toBeVisible();
    await expect(page.getByText('Для заїзду техніки', { exact: true })).toBeVisible();
  });

  // Reported bug: the dimension boxes clamped on every keystroke, so clearing one produced
  // Number('') === 0, which snapped to the minimum and overwrote the entry. Typing a value whose
  // first digit is below the minimum was therefore impossible.
  test('a dimension box accepts a value typed digit by digit after being cleared', async ({ page }) => {
    await openConfigurator(page);

    const length = page.locator('#hc-dimension-length');
    await length.click();
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.press('Backspace');
    // The field must stay empty rather than snapping back to the minimum.
    await expect(length).toHaveValue('');

    await page.keyboard.type('3');
    await expect(length, 'an intermediate "3" must not be rewritten to the minimum').toHaveValue('3');

    await page.keyboard.type('7');
    await expect(length).toHaveValue('37');

    await length.blur();
    await expect(length).toHaveValue('37');
    await expect(page.locator('.hc-summary-dimensions')).toContainText('37');
  });

  test('an out-of-range typed value is clamped once, on blur', async ({ page }) => {
    await openConfigurator(page);

    const width = page.locator('#hc-dimension-width');
    await width.click();
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.type('999');
    // Still exactly what was typed while the caret is in the field.
    await expect(width).toHaveValue('999');

    await width.blur();
    await expect(width).toHaveValue('50');
  });

  test('abandoning an empty box restores the previous value rather than the minimum', async ({ page }) => {
    await openConfigurator(page);

    const width = page.locator('#hc-dimension-width');
    await width.click();
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.press('Backspace');
    await width.blur();

    await expect(width).toHaveValue('24');
  });

  test('the ridge height is adjustable and clamped to the range shown for the current width', async ({ page }) => {
    await openConfigurator(page);

    const ridge = page.locator('#hc-dimension-ridge');
    await expect(ridge).toHaveValue('10,6');

    await ridge.click();
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.type('12');
    await ridge.blur();
    await expect(ridge).toHaveValue('12');
    await expect(page.locator('.hc-preview-svg .hc-dimension.is-derived text')).toContainText('Коник 12 м');

    // Beyond the credible pitch range it is held at the maximum, not accepted.
    await ridge.click();
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.type('30');
    await ridge.blur();
    await expect(ridge).toHaveValue('12,3');
  });

  test('widening the building keeps the ridge legal for the new footprint', async ({ page }) => {
    await openConfigurator(page);

    const ridge = page.locator('#hc-dimension-ridge');
    await ridge.click();
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.type('12,3');
    await ridge.blur();
    await expect(ridge).toHaveValue('12,3');

    // A wider span raises the minimum ridge, so the stored value must be lifted with it.
    await page.locator('#hc-dimension-width').fill('50');
    await page.locator('#hc-dimension-width').blur();

    const value = Number((await ridge.inputValue()).replace(',', '.'));
    expect(value).toBeGreaterThanOrEqual(8 + 25 * Math.tan((5 * Math.PI) / 180));
  });

  test('gate count controls how many gate shapes render and what the summary says', async ({ page }) => {
    await openConfigurator(page);

    // Phase 3F.1: the summary now carries the gate's own real, fixed size alongside count/type
    // (brief §D — "1 × стандартні, 4×4 м"), not just a bare count.
    await expect(page.locator('.hc-preview-svg .hc-gate')).toHaveCount(1);
    await expect(page.locator('.hc-summary-facts')).toContainText('1 × стандартні, 4×4 м');

    await page.locator('.hc-option-card', { hasText: '2' }).click();
    await expect(page.locator('.hc-preview-svg .hc-gate')).toHaveCount(2);
    await expect(page.locator('.hc-summary-facts')).toContainText('2 × стандартні, 4×4 м');

    await page.locator('.hc-option-card', { hasText: '0' }).click();
    await expect(page.locator('.hc-preview-svg .hc-gate')).toHaveCount(0);
    await expect(page.locator('.hc-summary-facts')).toContainText('Без воріт');
  });

  test('a gate cannot stay visible with walls out of scope — it is an opening cut into a wall, not an independent shape', async ({ page }) => {
    // Real bug caught live on the running preview (both this SVG renderer and the 3D one
    // independently keyed the gate layer off `gates > 0` alone): a gate rectangle stayed VISIBLE
    // after switching walls out of scope, which is physically incoherent — there is nothing left
    // for the opening to be cut into. Fixed by requiring walls in scope too, in both renderers
    // (HangarPreview.tsx's gateLayer, threeSceneModel.ts's visible.gates).
    //
    // Asserted on the phase class, not element count: like every build-up layer, `.hc-gate` stays
    // mounted across all four phases so hidden→materializing has a real "from" state to animate
    // out of (see buildUpSequence.ts's own doc comment) — geometry existing and the layer reading
    // as VISIBLE are different questions, and this bug was specifically about the second one.
    await openConfigurator(page);
    const gate = page.locator('.hc-preview-svg .hc-gate').first();
    await expect(gate).toHaveAttribute('class', /hc-phase-visible/);

    await page.getByText('Стіни / огороджувальний контур', { exact: true }).click(); // walls off
    await expect(gate).toHaveAttribute('class', /hc-phase-(dematerializing|hidden)/);
    await expect(gate).not.toHaveAttribute('class', /hc-phase-visible/);

    await page.getByText('Стіни / огороджувальний контур', { exact: true }).click(); // walls back on
    await expect(gate).toHaveAttribute('class', /hc-phase-(materializing|visible)/);
  });

  test('respects prefers-reduced-motion — no animation classes block the update', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await openConfigurator(page);

    const widthInput = page.locator('#hc-dimension-width');
    await widthInput.fill('45');
    await widthInput.blur();

    // The value must land immediately (not mid-transition) — this is the behavioural
    // guarantee reduced-motion asks for; the actual zero-duration transition is asserted
    // separately via computed style.
    await expect(page.locator('.hc-summary-dimensions')).toHaveText('45 × 60 × 8 м');
    const transitionDurationSeconds = await page
      .locator('.hc-layer.hc-front polygon')
      .first()
      .evaluate((el) => parseFloat(getComputedStyle(el).transitionDuration));
    expect(transitionDurationSeconds).toBeLessThan(0.001);
  });
});

test.describe('hangar configurator POC — mobile', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('has no horizontal overflow and keeps controls before the preview', async ({ page }) => {
    await openConfigurator(page);

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(overflow).toBe(false);

    const order = await page.evaluate(() => {
      const root = document.querySelector('.hangar-configurator');
      const controls = root?.querySelector('.hc-controls');
      const preview = root?.querySelector('.hc-preview-pane');
      if (!controls || !preview) return null;
      return controls.compareDocumentPosition(preview) === Node.DOCUMENT_POSITION_FOLLOWING;
    });
    expect(order).toBe(true);
  });

  test('summary is collapsible', async ({ page }) => {
    await openConfigurator(page);
    const summary = page.locator('.hc-summary');
    await expect(summary).toHaveJSProperty('open', true);

    await summary.locator('summary').click();
    await expect(summary).toHaveJSProperty('open', false);
  });
});

// Tablet is a distinct testing tier for this feature per the Phase 2 brief, even though these
// exact widths (768/820/1024) aren't sitewide CSS breakpoints (see docs/ui-system-v1.md's
// breakpoint table) — all three sit under .hc-layout's single existing ≤1023px breakpoint
// (configurator.css), so this confirms that one rule holds up across the full tablet range, not
// just at its edges.
for (const width of [768, 820, 1024]) {
  test.describe(`hangar configurator POC — tablet ${width}`, () => {
    test.use({ viewport: { width, height: 1180 } });

    test('has no horizontal overflow, keeps controls before the preview, and renders a legible frame', async ({ page }) => {
      await openConfigurator(page);

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
      );
      expect(overflow).toBe(false);

      const order = await page.evaluate(() => {
        const root = document.querySelector('.hangar-configurator');
        const controls = root?.querySelector('.hc-controls');
        const preview = root?.querySelector('.hc-preview-pane');
        if (!controls || !preview) return null;
        return controls.compareDocumentPosition(preview) === Node.DOCUMENT_POSITION_FOLLOWING;
      });
      expect(order).toBe(true);

      // The frame must still read as real lines, not have collapsed to zero-width/invisible.
      const frameLineWidth = await page
        .locator('.hc-columns line')
        .first()
        .evaluate((el) => parseFloat(getComputedStyle(el).strokeWidth));
      expect(frameLineWidth).toBeGreaterThan(0);
    });
  });
}

// Phase 2A build-up lifecycle: foundation/columns/trusses are driven by useLayerLifecycle
// (app/components/configurator/useLayerLifecycle.ts) rather than a plain flash-on-change class,
// so these assert the actual FSM phase classes it applies, not just the end-state geometry —
// see docs/hangar-build-up-phase-2 (this file) for the trigger/interruption rules being verified.
test.describe('hangar configurator POC — build-up lifecycle (Phase 2A)', () => {
  function firstColumnClass(page: Page) {
    return page.locator('.hc-columns line').first().getAttribute('class');
  }

  test('a discrete scope toggle stages a real materialize transition, not an instant snap', async ({ page }) => {
    await openConfigurator(page);
    await expect(page.locator('.hc-foundation')).toHaveAttribute('class', /hc-phase-visible/);

    await page.getByText('Фундамент', { exact: true }).click();
    await expect(page.locator('.hc-foundation')).toHaveAttribute('class', /hc-phase-dematerializing/);
    await expect(page.locator('.hc-foundation')).toHaveAttribute('class', /hc-phase-hidden/, { timeout: 2000 });

    await page.getByText('Фундамент', { exact: true }).click();
    await expect(page.locator('.hc-foundation')).toHaveAttribute('class', /hc-phase-materializing/);
    await expect(page.locator('.hc-foundation')).toHaveAttribute('class', /hc-phase-visible/, { timeout: 2000 });
  });

  test('columns and rafters stage in sequence — rafters only start once columns have (a real build order, not simultaneous)', async ({ page }) => {
    await openConfigurator(page);
    await page.getByText('Металокаркас', { exact: true }).click(); // off

    const columnsDelay = await page.locator('.hc-columns line').first().evaluate((el) => (el as HTMLElement).style.transitionDelay);
    const raftersDelay = await page.locator('.hc-rafters line').first().evaluate((el) => (el as HTMLElement).style.transitionDelay);
    expect(parseFloat(raftersDelay)).toBeGreaterThan(parseFloat(columnsDelay));
  });

  test('a dimension change never restarts an already-settled layer\'s build-up', async ({ page }) => {
    await openConfigurator(page);
    await expect(page.locator('.hc-foundation')).toHaveAttribute('class', /hc-phase-visible/);

    const widthInput = page.locator('#hc-dimension-width');
    await widthInput.fill('40');
    await widthInput.blur();

    // Geometry updates immediately...
    await expect(page.locator('.hc-preview-svg')).toContainText('40 м');
    // ...but the layer's own phase is untouched — never dips through materializing/dematerializing.
    await expect(page.locator('.hc-foundation')).toHaveAttribute('class', /hc-phase-visible/);
  });

  test('toggling one scope item never replays an unrelated layer\'s build-up', async ({ page }) => {
    await openConfigurator(page);
    const before = await firstColumnClass(page);
    expect(before).toMatch(/hc-phase-visible/);

    await page.getByText('Стіни / огороджувальний контур', { exact: true }).click(); // walls, not frame
    await page.waitForTimeout(50);
    const after = await firstColumnClass(page);
    expect(after).toBe(before); // no transitional class was ever entered
  });

  test('rapid ON/OFF/ON settles cleanly on the final requested state', async ({ page }) => {
    await openConfigurator(page);
    const foundationToggle = page.getByText('Фундамент', { exact: true });

    await foundationToggle.click();
    await foundationToggle.click();
    await foundationToggle.click(); // odd number of clicks → ends hidden

    await expect(page.locator('.hc-foundation')).toHaveAttribute('class', /hc-phase-hidden/, { timeout: 2000 });
  });

  test('reduced motion resolves the build-up immediately — no materializing/dematerializing frame is ever observed', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await openConfigurator(page);

    await expect(page.locator('.hc-foundation')).toHaveAttribute('class', /hc-phase-visible/);
    const duration = await page.locator('.hc-foundation').evaluate((el) => (el as HTMLElement).style.transitionDuration);
    expect(parseFloat(duration)).toBe(0);

    await page.getByText('Фундамент', { exact: true }).click();
    // Never observe an in-flight phase — it must resolve to hidden on the very next paint.
    await expect(page.locator('.hc-foundation')).toHaveAttribute('class', /hc-phase-hidden/, { timeout: 300 });
    await expect(page.locator('.hc-foundation')).not.toHaveAttribute('class', /hc-phase-dematerializing/);
  });
});

// Phase 2B: the exact same useLayerLifecycle mechanism extended to purlins/walls/roof/gates — no
// separate animation system per layer, only the (visible, duration, sequencing-offset) inputs
// differ (see buildUpSequence.ts). These assert that extension specifically: purlins sequence
// after trusses, walls/roof get real transitions of their own, gates only replay on the 0↔some
// transition (never on a 1↔2 count change), and enclosing the shell never hides the frame.
test.describe('hangar configurator POC — build-up lifecycle (Phase 2B)', () => {
  test('purlins sequence after rafters, not simultaneously with them', async ({ page }) => {
    await openConfigurator(page);

    // The inline transitionDelay is set on every render regardless of phase (see
    // useLayerLifecycle.ts), so the default (already-visible) mount already carries the real
    // sequencing offsets — no toggle needed to observe them.
    const raftersDelay = await page.locator('.hc-rafters line').first().evaluate((el) => (el as HTMLElement).style.transitionDelay);
    const purlinsDelay = await page.locator('.hc-purlins line').first().evaluate((el) => (el as HTMLElement).style.transitionDelay);
    expect(parseFloat(purlinsDelay)).toBeGreaterThan(parseFloat(raftersDelay));
  });

  test('walls stage a real materialize/dematerialize transition', async ({ page }) => {
    await openConfigurator(page);
    await expect(page.locator('.hc-front polygon').first()).toHaveAttribute('class', /hc-phase-visible/);

    await page.getByText('Стіни / огороджувальний контур', { exact: true }).click();
    await expect(page.locator('.hc-front polygon').first()).toHaveAttribute('class', /hc-phase-dematerializing/);
    // Walls are independently triggered (their own checkbox, not part of the frame group) — zero
    // start offset, so this settles within its own ~250ms duration; timeout padded well past
    // that purely for headroom under parallel test-run contention, not because it needs it.
    await expect(page.locator('.hc-front polygon').first()).toHaveAttribute('class', /hc-phase-hidden/, { timeout: 2500 });
  });

  test('roof stages a real materialize/dematerialize transition, independent of walls', async ({ page }) => {
    await openConfigurator(page);
    await page.getByText('Стіни / огороджувальний контур', { exact: true }).click(); // walls off

    // Roof must be unaffected by the walls toggle above (no cross-layer replay)...
    await expect(page.locator('.hc-top polygon').first()).toHaveAttribute('class', /hc-phase-visible/);

    // ...but does stage its own transition when its own scope item changes. Scoped to the
    // scope-of-work group: Phase 3D's own "Огороджувальні конструкції" section added its own
    // "Покрівля" heading to the same page.
    await page.getByLabel('Обсяг заявки').getByText('Покрівля', { exact: true }).click();
    await expect(page.locator('.hc-top polygon').first()).toHaveAttribute('class', /hc-phase-dematerializing/);
  });

  test('gates replay on the 0↔some transition, never on a 1↔2 count change', async ({ page }) => {
    await openConfigurator(page);
    await expect(page.locator('.hc-gate')).toHaveAttribute('class', /hc-phase-visible/);

    // 1 → 2 gates: never touches the gate layer's phase.
    await page.locator('.hc-option-card', { hasText: '2' }).click();
    await page.waitForTimeout(50);
    await expect(page.locator('.hc-gate').first()).toHaveAttribute('class', /hc-phase-visible/);
    await expect(page.locator('.hc-gate').first()).not.toHaveAttribute('class', /hc-phase-materializing/);

    // some → 0: a real discrete toggle. The gate layer's FSM does receive a REQUEST_HIDDEN, but
    // gate geometry (unlike foundation/frame) isn't geometry-safe — position depends on the count
    // itself, so there is nothing left to render a fade-out from once count hits 0 (a disclosed,
    // low-impact limitation: gates are the lowest-emphasis layer, and the fade-*in* on 0→some is
    // unaffected). Observable behaviour is the outline/cutout disappearing with the geometry.
    await page.locator('.hc-option-card', { hasText: '0' }).click();
    await expect(page.locator('.hc-gate-outline')).toHaveCount(0);
  });

  test('an enclosed shell (walls + roof both on) never hides the frame underneath', async ({ page }) => {
    await openConfigurator(page);
    // Default scope already has everything on — confirm frame is genuinely visible, not just
    // present in the DOM with zero opacity.
    const frameOpacity = await page.locator('.hc-columns line').first().evaluate((el) => getComputedStyle(el).opacity);
    const wallOpacity = await page.locator('.hc-front polygon.has-walls').first().evaluate((el) => getComputedStyle(el).fillOpacity);

    expect(parseFloat(frameOpacity)).toBe(1);
    // The enclosed wall must be short of fully opaque, per the brief's "must not read as a flat
    // opaque box" requirement.
    expect(parseFloat(wallOpacity)).toBeLessThan(1);
    expect(parseFloat(wallOpacity)).toBeGreaterThan(0.5); // still a real, legible wall — not washed out
  });

  test('a dimension change never restarts walls/roof/purlins/gates either', async ({ page }) => {
    await openConfigurator(page);
    await expect(page.locator('.hc-front polygon').first()).toHaveAttribute('class', /hc-phase-visible/);
    await expect(page.locator('.hc-top polygon').first()).toHaveAttribute('class', /hc-phase-visible/);
    await expect(page.locator('.hc-gate')).toHaveAttribute('class', /hc-phase-visible/);

    const widthInput = page.locator('#hc-dimension-width');
    await widthInput.fill('40');
    await widthInput.blur();

    await expect(page.locator('.hc-preview-svg')).toContainText('40 м');
    await expect(page.locator('.hc-front polygon').first()).toHaveAttribute('class', /hc-phase-visible/);
    await expect(page.locator('.hc-top polygon').first()).toHaveAttribute('class', /hc-phase-visible/);
    await expect(page.locator('.hc-gate')).toHaveAttribute('class', /hc-phase-visible/);
  });

  test('reduced motion resolves walls/roof/gates immediately too', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await openConfigurator(page);

    // Scoped to the scope-of-work group — see the same fix earlier in this file.
    await page.getByLabel('Обсяг заявки').getByText('Покрівля', { exact: true }).click();
    await expect(page.locator('.hc-top polygon').first()).toHaveAttribute('class', /hc-phase-hidden/, { timeout: 300 });
    await expect(page.locator('.hc-top polygon').first()).not.toHaveAttribute('class', /hc-phase-dematerializing/);
  });
});
