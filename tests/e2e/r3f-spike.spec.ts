import { expect, test } from '@playwright/test';

// Smoke coverage only, matching this repo's existing pattern (see smoke.spec.ts) — the point of
// this spike is the comparative measurement in docs/renderer-foundation-spike.md, not exhaustive
// behavioural coverage of a route that may not survive the go/no-go decision.

test.describe('R3F renderer spike (dev-only comparison route)', () => {
  test('loads, is excluded from indexing, and mounts a WebGL canvas with no console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });

    const response = await page.goto('/r3f-spike', { waitUntil: 'load' });
    expect(response?.status()).toBe(200);

    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);

    // R3F's <Canvas className="r3f-spike-canvas"> applies that class to its own wrapper <div>,
    // not the real <canvas> element — select the actual canvas via our own container instead.
    const canvas = page.locator('.r3f-canvas-surface canvas');
    await expect(canvas).toBeVisible();
    // Three.js/R3F attach a real WebGL context to the canvas once mounted — a blank <canvas>
    // with no context would mean the scene failed to initialise silently.
    const hasContext = await canvas.evaluate((el: HTMLCanvasElement) => Boolean(el.getContext('webgl2') || el.getContext('webgl')));
    expect(hasContext).toBe(true);

    expect(errors, `console/page errors: ${errors.join('\n')}`).toEqual([]);
  });

  test('changing a dimension slider does not throw and keeps the canvas mounted', async ({ page }) => {
    await page.goto('/r3f-spike', { waitUntil: 'load' });

    // The cookie banner is client-only, same hydration-readiness signal used by every other
    // spec in this suite (see configurator.spec.ts) — seeing it proves the page has actually
    // hydrated, so the range input's React onChange handler is attached before we dispatch a
    // native input event at it below.
    const essentialCookiesButton = page.getByRole('button', { name: 'Лише необхідні', exact: true });
    await expect(essentialCookiesButton).toBeVisible({ timeout: 10_000 });
    await essentialCookiesButton.click();

    const widthSlider = page.locator('.r3f-controls input[type="range"]').first();

    // Range inputs need a real input event, not just a value set — same technique used to
    // verify this manually during development.
    await widthSlider.evaluate((el: HTMLInputElement) => {
      const setValue = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!;
      setValue.call(el, '45');
      el.dispatchEvent(new Event('input', { bubbles: true }));
    });

    await expect(page.locator('.r3f-field-label').first()).toContainText('45');
    await expect(page.locator('.r3f-canvas-surface canvas')).toBeVisible();
  });

  test('has no horizontal overflow on a mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/r3f-spike', { waitUntil: 'load' });

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(overflow).toBe(false);
  });
});
