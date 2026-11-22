import { expect, test } from '@playwright/test';

// CC-02 (29.10): Workers Assets keeps only the current deploy, so a page opened before a new one can ask for an island
// chunk that is gone. The whole page used to reload and then show «Щось пішло не так» in place of its text, its form and
// its contacts. Now only the island gives way to its server-rendered fallback, and the page does not reload.
for (const island of [
  { path: '/', chunk: /\/_next\/static\/chunks\/ProofContour-[^/]+\.js$/, name: 'proof-contour', says: 'Креслення не завантажилось', sheet: '.hv2-contour' },
  { path: '/angary', chunk: /\/_next\/static\/chunks\/HangarConfigurator-[^/]+\.js$/, name: 'hangar-configurator', says: 'Конфігуратор ангара не завантажився', sheet: '#configurator .hc-preview-sheet' },
] as const) {
  for (const failure of ['404', 'dropped connection'] as const) {
    test(`${island.path}: a missing ${island.name} chunk (${failure}) leaves the page, its form and its contacts`, async ({ page }) => {
      let blocked = 0;
      await page.route(island.chunk, (route) => {
        blocked++;
        return failure === '404' ? route.fulfill({ status: 404, body: 'Not found' }) : route.abort('connectionreset');
      });
      let loads = 0;
      page.on('load', () => { loads++; });
      await page.goto(island.path, { waitUntil: 'load' });

      const fallback = page.locator(`[data-island-fallback="${island.name}"]`);
      await expect(fallback).toContainText(island.says);
      expect(blocked, 'the island chunk was asked for').toBeGreaterThan(0);
      await expect(page.getByText('Щось пішло')).toHaveCount(0);
      await expect(page.locator('h1')).not.toContainText('Щось пішло');
      await expect(page.locator('#inquiry form')).toHaveCount(1);
      // the phone stays reachable (on a phone the desktop header's link is hidden, so any visible one counts)
      expect(await page.locator('a[href^="tel:"]:visible').count(), 'a visible phone link').toBeGreaterThan(0);
      // No reload: a visitor half-way through the form keeps what they typed
      await page.waitForTimeout(1500);
      expect(loads, 'the page did not reload itself').toBe(1);
    });
  }

  test(`${island.path}: with its chunk in place the ${island.name} island shows no fallback`, async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (message) => { if (message.type() === 'error' && message.text().includes('[island:')) errors.push(message.text()); });
    await page.goto(island.path, { waitUntil: 'load' });
    // The island's code has run: its sheet takes its state in an effect (DrawingSheet); the server's markup has none
    await expect(page.locator(island.sheet)).toHaveAttribute('data-sheet-state', /^(armed|on)$/);
    await expect(page.locator('[data-island-fallback]')).toHaveCount(0);
    expect(errors).toEqual([]);
  });
}

// The HOME frame tour gives way to nothing (IslandBoundary fallback={null}): its room and label fold, and the block opens
// on the real object. Without that, «Приклад каркаса» stood over an empty panel (22.11, 1C).
for (const failure of ['404', 'dropped connection'] as const) {
  test(`/: a missing home-frame-tour chunk (${failure}) folds the example's room and label, and leaves the page`, async ({ page }) => {
    let blocked = 0;
    await page.route(/\/_next\/static\/chunks\/FrameTourIsland-[^/]+\.js$/, (route) => {
      blocked++;
      return failure === '404' ? route.fulfill({ status: 404, body: 'Not found' }) : route.abort('connectionreset');
    });
    let loads = 0;
    page.on('load', () => { loads++; });
    await page.goto('/', { waitUntil: 'load' });

    await expect(page.locator('[data-island-fallback="home-frame-tour"]')).toHaveCount(1);
    expect(blocked, 'the tour chunk was asked for').toBeGreaterThan(0);
    await expect(page.locator('.hv2-frame-room')).toBeHidden();
    await expect(page.getByText('Приклад каркаса', { exact: true })).toBeHidden();
    // the real object and the way on are still there
    await expect(page.locator('#real-object')).toHaveCount(1);
    await expect(page.locator('#inquiry form')).toHaveCount(1);
    await page.waitForTimeout(1500);
    expect(loads, 'the page did not reload itself').toBe(1);
  });
}
