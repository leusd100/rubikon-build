import { expect, test, type Locator, type Page } from '@playwright/test';
import { chooseSeparateWorks, openControlGroup, openThree } from './configurator.helpers';

async function openHangarPage(page: Page, dismissCookies = true) {
  await page.goto('/angary', { waitUntil: 'load' });
  const essentialCookies = page.getByRole('button', { name: 'Лише необхідні', exact: true });
  await expect(essentialCookies).toBeVisible({ timeout: 10_000 });
  if (dismissCookies) await essentialCookies.click();
}

async function setWidth(page: Page, value: string) {
  await openControlGroup(page, 'dimensions');
  const input = page.locator('#hc-dimension-width');
  await input.fill(value);
  await input.blur();
}

function attachmentCard(page: Page) {
  return page.locator('form.inquiry-form .inquiry-config-brief');
}

async function setLength(page: Page, value: string) {
  await openControlGroup(page, 'dimensions');
  const input = page.locator('#hc-dimension-length');
  await input.fill(value);
  await input.blur();
}

/** The configurator's drawing sheet (/angary's preview) */
function previewSheet(page: Page) {
  return page.locator('#configurator .hc-preview-sheet');
}

/** One fact of the stamp under the configurator, by its name */
function stampFact(page: Page, label: string): Locator {
  return page.locator('.hc-summary-flagship .hc-summary-facts > div').filter({ has: page.locator('dt', { hasText: label }) }).locator('dd');
}

/**
 * The frame drawing is no longer a section of its own under the configurator (07.10): it is the configurator's «Каркас»
 * step — the sheet shows the frame (ConfiguratorFrameView), and the step's panel lists what to show of it.
 */
async function openFrame(page: Page) {
  await openControlGroup(page, 'space');
  const frame = previewSheet(page).locator('.hc-frame');
  await expect(frame).toBeVisible();
  return {
    frame,
    items: page.locator('#hc-step-frame .hc-frame-item'),
    text: page.locator('#hc-step-frame .hc-frame-text'),
  };
}

/** Brings the configurator's sheet back to its own place (on a phone the mini drawing lets go of it) */
async function showWholeSheet(page: Page) {
  await page.locator('#configurator .hc-layout').evaluate((layout) => {
    window.scrollTo(0, window.scrollY + layout.getBoundingClientRect().top - 120);
  });
  await expect(page.locator('#configurator .hc-layout')).not.toHaveAttribute('data-configuring', '');
}

// The two presentation-only demos («Подивитись каркас», «Порівняти із сендвіч-панеллю») are gone (UX review 2026-10). The
// frame drawing was the section «Каркас вашого ангара» until 07.10; it is now the configurator's «Каркас» step.
test('the frame drawing follows the configuration and walks a snow and a wind load through it', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile-chromium', 'the state contract is viewport-independent');
  await openHangarPage(page);
  let { frame, items, text } = await openFrame(page);
  const stamp = previewSheet(page).locator('.sheet-stamp');
  await expect(stamp).toContainText('Приклад · 24 × 60 × 8 м');
  await expect(page.getByRole('button', { name: /Подивитись каркас|Порівняти із сендвіч-панеллю/ })).toHaveCount(0);
  // the title block's capitals keep the metre a lower-case «м» (04.10)
  await expect(stamp.locator('.sheet-unit')).toHaveText('м');
  await expect(stamp.locator('.sheet-unit')).toHaveCSS('text-transform', 'none');
  // the example's gate is drawn on the end wall, as the configurator places it
  await expect(frame.locator('path.ft-opening')).toHaveCount(1);
  // nothing chosen yet: the whole frame, and the panel says what it offers
  await expect(items).toHaveText(['Ширина L', 'Ферма', 'Прогони й в’язі', 'Сніг на покрівлі', 'Вітер у торець']);
  await expect(text).toHaveText('Оберіть, що показати на кресленні вашого каркаса.');
  await expect(frame).not.toHaveAttribute('data-step', /.*/);
  // 24 m has the centre row: the width between the outer axes is not «the span»; the axes are lettered А, Б, В across it
  // and numbered for the drawn frames along it
  await items.nth(0).click();
  await expect(text).toHaveText('L — 24 м між осями крайніх колон А і В у прикладі. Центральний ряд Б ділить її на два прольоти. H — висота стіни.');
  await expect(frame.locator('[data-part~="1"] .ft-bubble')).toHaveText(['А', 'Б', 'В']);
  await expect(frame.locator('[data-part~="1"] .ft-bubble').first()).toBeVisible();
  await expect(frame.locator('[data-part~="3"] .ft-bubble')).toHaveText(['1', '2', '3', '4']);
  // one numbering on the screen (07.10): the axes are shown only on «Ширина L» / «Проліт L», whose words name them; the
  // frames' numbers along the building are not drawn on the configurator's sheet (the steps and the nodes are numbered)
  await expect(frame.locator('[data-part~="3"] .ft-bubble').first()).toBeHidden();
  // the shown item pressed again goes back to the whole frame
  await items.nth(0).click();
  await expect(items.nth(0)).toHaveAttribute('aria-pressed', 'false');
  await expect(frame).not.toHaveAttribute('data-step', /.*/);
  await expect(frame.locator('[data-part~="1"] .ft-bubble').first()).toBeHidden();

  await setWidth(page, '16');
  // the configurator's stamp marks the value that changed
  await expect(page.locator('.hc-stamp-row .hc-summary-dimensions')).toHaveClass(/is-changed/);
  ({ frame, items, text } = await openFrame(page));
  await expect(stamp).toContainText('Ваш ангар · 16 × 60 × 8 м');
  await expect(items.nth(1)).toHaveText('Рама');
  await items.nth(1).click();
  await expect(text).toContainText('Для ширини 16 м у попередній візуалізації показано портальну раму');
  // a clear span's two axes are lettered in sequence, А and Б (04.10: А and В skipped Б)
  await items.nth(0).click();
  await expect(text).toHaveText('Проліт L — відстань між осями крайніх колон А і Б: 16 м у вашій конфігурації. Усередині колон немає. H — висота стіни.');
  await expect(frame.locator('[data-part~="1"] .ft-bubble')).toHaveText(['А', 'Б']);
  // a short building is drawn whole: as many axes as frames, none at a break (counted in the drawing, not shown)
  await setLength(page, '18');
  ({ frame, items, text } = await openFrame(page));
  await expect(frame.locator('[data-part~="3"] .ft-bubble')).toHaveText(['1', '2', '3', '4']);
  await setLength(page, '12');
  ({ frame, items, text } = await openFrame(page));
  await expect(frame.locator('[data-part~="3"] .ft-bubble')).toHaveText(['1', '2', '3']);
  await setLength(page, '60');
  ({ frame, items, text } = await openFrame(page));

  // each step holds as long as it builds, and its progress bar fills as long
  const durations = ['4200ms', '4800ms', '5200ms', '6400ms', '7600ms'];
  for (const index of [0, 1, 2, 3, 4]) {
    await items.nth(index).click();
    await expect(items.nth(index)).toHaveAttribute('aria-pressed', 'true');
    await expect(frame).toHaveAttribute('data-step', String(index + 1));
    expect(await frame.evaluate((element) => (element as HTMLElement).style.getPropertyValue('--dn-step-ms'))).toBe(durations[index]);
  }
  // step 3 names the end wall's posts with the other members
  await items.nth(2).click();
  await expect(frame.locator('[data-tags="3"] .ft-tag')).toHaveCount(4);
  await expect(frame.locator('[data-tags="3"] .ft-tag').filter({ hasText: 'фахверку' })).toHaveCount(1);
  // steps 4 and 5 follow a load through the frame, with the chain it takes over the drawing; the other steps do not
  const snow = frame.locator('g[data-load="snow"]');
  const wind = frame.locator('g[data-load="wind"]');
  const snowChain = frame.locator('.ft-chain[data-load="snow"]');
  const windChain = frame.locator('.ft-chain[data-load="wind"]');
  await items.nth(3).click();
  await expect(snow).toHaveCSS('opacity', '1');
  await expect(wind).toHaveCSS('opacity', '0');
  await expect(snowChain).toBeVisible();
  await expect(windChain).toBeHidden();
  await expect(snowChain.locator('li')).toHaveText(['Покрівля', 'Прогони', 'Ригель рами', 'Колони', 'Фундаменти', 'Ґрунт']);
  await items.nth(4).click();
  await expect(wind).toHaveCSS('opacity', '1');
  await expect(windChain).toBeVisible();
  await expect(snowChain).toBeHidden();
  await expect(windChain.locator('li')).toHaveText(['Торцева стіна', 'Стійки фахверку', 'В’язі покрівлі', 'В’язі стін', 'Фундаменти']);
  // …then, once the chain has lit, the first bay leans as it would without the bracing, with the note that says so
  await expect(text).toContainText('Без в’язей рами схилилися б уздовж будівлі, як доміно, — в’язі тримають їх рівно.');
  await expect(frame.locator('.ft-note')).toHaveText('Деформацію показано умовно, у збільшеному масштабі');
  await expect(wind.locator('.ft-ghost')).toHaveCSS('animation-name', 'ft-ghost');
  await expect(frame.locator('.ft-note')).toHaveCSS('animation-name', 'ft-ghost');
  await expect(wind.locator('.ft-link[data-brace]').first()).toHaveCSS('animation-name', 'ft-light, ft-unbraced');
  await items.nth(0).click();
  await expect(snow).toHaveCSS('opacity', '0');
  await expect(wind).toHaveCSS('opacity', '0');
  await expect(snowChain).toBeHidden();
  await expect(windChain).toBeHidden();
  // it attaches nothing: the brief is attached by the width edit, not by the drawing
  await expect(attachmentCard(page)).toContainText('16 × 60 × 8 м');
});

// Owner decision, 04.10: reduced motion makes the wind step static and complete — the leaning bay is drawn, and its note
// shows in a row of its own under the chain, so the step shows what its text says. Nothing animates.
test('without motion the wind step stands complete: the leaning bay and its note drawn, nothing moving', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile-chromium', 'the motion contract is viewport-independent');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openHangarPage(page);
  const { frame, items } = await openFrame(page);
  // without motion there is nothing to play
  await expect(page.locator('#hc-step-frame .dn-control')).toHaveCount(0);
  await items.nth(4).click();
  await expect(frame.locator('.ft-chain[data-load="wind"]')).toBeVisible();
  for (const selector of ['[data-load="wind"] .ft-ghost', '.ft-note']) {
    await expect(frame.locator(selector)).toHaveCSS('animation-name', 'none');
    await expect(frame.locator(selector)).toHaveCSS('opacity', '1');
  }
  await expect(frame.locator('[data-load="wind"] .ft-link[data-brace]').first()).toHaveCSS('opacity', '1');
  // the note under the chain, not over it
  const chain = await frame.locator('.ft-chain[data-load="wind"]').boundingBox();
  const note = await frame.locator('.ft-note').boundingBox();
  expect(note!.y).toBeGreaterThanOrEqual(chain!.y + chain!.height - 1);
  expect(await frame.evaluate((root) => root.getAnimations({ subtree: true }).filter((animation) => animation.playState === 'running').length)).toBe(0);
});

// Owner decision, 04.10: «Пауза» stops every motion of the tour — the falling snow, the gusts and the running drops
// included — and none of it runs while the drawing is out of view; a step the visitor chooses settles once built. On
// the configurator's «Каркас» (07.10) nothing plays by itself: «Показати по черзі» plays the steps once.
test('«Пауза» stops all the frame tour\'s motion, and nothing loops out of view or on a chosen step', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile-chromium', 'the motion contract is viewport-independent');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await openHangarPage(page);
  const { frame, items } = await openFrame(page);
  const control = page.locator('#hc-step-frame .dn-control');
  const looping = () => page.evaluate(() => document.getAnimations().filter((animation) => animation.playState === 'running'
    && animation.effect?.getTiming().iterations === Infinity
    && (animation.effect as KeyframeEffect).target?.closest('#configurator .hc-frame')).length);
  // the visitor came to set up a hangar, not to watch: the frame waits (useDrawingTour's first beat is 1.2 s)
  await page.waitForTimeout(2000);
  await expect(frame).not.toHaveAttribute('data-touring', /.*/);
  await expect(frame).not.toHaveAttribute('data-step', /.*/);
  await expect(page.locator('#hc-step-frame .hc-frame-play')).toContainText('Показати по черзі');
  // played from a load step: it runs, and loops while it does
  await items.nth(3).click();
  await control.click();
  await expect(frame).toHaveAttribute('data-touring', 'true');
  await expect(frame).toHaveAttribute('data-step', '4');
  await expect(page.locator('#hc-step-frame .hc-frame-play')).toContainText('Показуємо по черзі');
  await expect.poll(looping, { timeout: 5_000 }).toBeGreaterThan(0);
  await control.click();
  await expect(frame).not.toHaveAttribute('data-touring', /.*/);
  await expect(frame).toHaveAttribute('data-step', '4');
  await expect.poll(looping).toBe(0);
  // played again, then scrolled out of view: the tour pauses and its loops stop with it
  await control.click();
  await expect(frame).toHaveAttribute('data-touring', 'true');
  await expect.poll(looping, { timeout: 5_000 }).toBeGreaterThan(0);
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(frame).not.toHaveAttribute('data-touring', /.*/);
  await expect.poll(looping).toBe(0);
  // a chosen load step builds its chain, then stands complete
  await page.locator('#hc-step-frame').scrollIntoViewIfNeeded();
  await items.nth(4).click();
  await expect(frame.locator('.ft-chain[data-load="wind"]')).toBeVisible();
  await page.waitForTimeout(1500);
  expect(await looping()).toBe(0);
});

// The title block keeps its geometry through the frame's steps (04.10): at 1100 px «Що показано» broke a letter a line and
// the sheet changed height on every step; at 1440 the cells jumped ~40 px as the tour started; at 320–360 the caption
// grew a line on some steps. The configurator's sheet carries the frame's caption in the same cell (07.10).
// 08.10: at 360 and 320 px «Металева ферма · Центральний ряд опор» took a second line in «Що показано» (cell 42 → 57 px,
// sheet 403 → 418 px) — the configurator's sheet shows one caption at a time; a phone now keeps two lines for every
// frame caption (configurator-sheet.css), so the title block holds still from step to step.
for (const width of [1440, 1280, 1100, 768, 360, 320]) {
  test(`the frame's title block keeps its size and place from step to step at ${width}px`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile-chromium', 'the explicit viewport matrix runs once');
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/angary', { waitUntil: 'load' });
    const { frame, items } = await openFrame(page);
    const sheet = previewSheet(page);
    const measure = () => sheet.evaluate((element) => {
      const stamp = element.querySelector('.sheet-stamp')!;
      return {
        // on a phone the sheet may be held as the mini drawing: the same sheet in either state, step to step
        mini: element.closest('.hc-layout')!.hasAttribute('data-configuring'),
        height: Math.round(element.getBoundingClientRect().height),
        cells: [...stamp.children].map((cell) => `${Math.round(cell.getBoundingClientRect().left)}:${Math.round(cell.getBoundingClientRect().width)}:${Math.round(cell.getBoundingClientRect().height)}`).join(' '),
      };
    });
    await showWholeSheet(page);
    // never a letter a line: the caption keeps a readable column
    expect(await sheet.locator('.sheet-cell-main').evaluate((element) => element.getBoundingClientRect().width)).toBeGreaterThanOrEqual(150);
    const overview = await measure();
    for (const index of [0, 1, 2, 3, 4]) {
      await items.nth(index).click();
      await expect(frame).toHaveAttribute('data-step', String(index + 1));
      await showWholeSheet(page);
      expect(await measure(), `step ${index + 1}`).toEqual(overview);
    }
    // and the shown step's caption is the one in the title block
    await expect(sheet.locator('.sheet-cell-main')).toContainText('Шлях навантаження від вітру');
  });
}

// The frame's own section stacked on a tablet (04.10: beside the copy the camera was 268 × 164 px at 768). On the
// configurator (07.10) the sheet and the controls stack the same way: the frame's camera takes the sheet's full width,
// and the step's list of what to show follows it.
test('on a tablet the frame view stacks: the sheet takes the full width, the step\'s list follows it', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile-chromium', 'the explicit viewport runs once');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const width of [768, 1000]) {
    await page.setViewportSize({ width, height: 1024 });
    await page.goto('/angary', { waitUntil: 'load' });
    await openFrame(page);
    const camera = await previewSheet(page).locator('.ft-window').boundingBox();
    const list = await page.locator('#hc-step-frame .hc-frame-list').boundingBox();
    expect(camera!.width, `${width}`).toBeGreaterThan(width - 160);
    expect(list!.y).toBeGreaterThan(camera!.y + camera!.height);
  }
});

// «Змінити габарити ↑» under the frame drawing (04.10) went with the frame's own section (07.10): the frame is a step of
// the configurator now. The way between the steps is the step's own «Далі» / «←», which brings the tabs back into view.
test('on a wide screen «Далі» under a step opens the next one and brings its tab back into view', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile-chromium', 'the phone has its own test (under the mini drawing)');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openHangarPage(page);
  for (const viewport of [{ width: 1440, height: 900 }, { width: 820, height: 1180 }]) {
    await page.setViewportSize(viewport);
    await page.goto('/angary', { waitUntil: 'load' });
    await openControlGroup(page, 'dimensions');
    const next = page.locator('#hc-step-size .hc-step-next');
    await expect(next).toHaveText(/Далі: Стіни й ворота/);
    await next.scrollIntoViewIfNeeded();
    await next.click();
    const tab = page.locator('#hc-step-shell-tab');
    await expect(tab).toHaveAttribute('aria-selected', 'true');
    await expect(tab).toBeFocused();
    await expect(page.locator('#hc-step-shell')).toBeVisible();
    await expect(page.locator('#hc-step-size')).toBeHidden();
    // the tabs just under the site header, the step's first answers on the screen
    const header = await page.locator('.site-header').evaluate((element) => element.getBoundingClientRect().bottom);
    await expect.poll(() => tab.evaluate((element) => element.getBoundingClientRect().top)).toBeGreaterThanOrEqual(header - 1);
    expect(await tab.evaluate((element) => element.getBoundingClientRect().top)).toBeLessThan(viewport.height / 2);
    const first = await page.locator('#hc-step-shell input[name="hc-envelope"]').first().locator('xpath=..').boundingBox();
    expect(first!.y + first!.height).toBeLessThan(viewport.height);
  }
});

// Every name, axis bubble and dimension letter a step shows sits whole inside that step's camera window, clear of the
// others and of the footings — at a phone's sizes too (03.10). The legend sits in its own band above the window.
for (const [width, length] of [['24', '60'], ['12', '18'], ['50', '120']] as const) {
  test(`the frame's labels stay inside each step's camera at ${width} × ${length} m`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await openHangarPage(page);
    await setWidth(page, width);
    await setLength(page, length);
    const { frame, items } = await openFrame(page);
    for (const step of [1, 2, 3]) {
      await items.nth(step - 1).click();
      await showWholeSheet(page);
      await expect(frame).toHaveAttribute('data-step', String(step));
      // the names fade in over 0.3 s
      if (step > 1) await expect(frame.locator(`[data-tags="${step}"]`)).toHaveCSS('opacity', '1');
      const { count, problems } = await frame.evaluate((root, shown) => {
        const camera = root.querySelector('.ft-window')!.getBoundingClientRect();
        const context = document.createElement('canvas').getContext('2d')!;
        // a text's inked box (its em box is a third taller than the letters); a bubble's circle's
        const box = (element: Element) => {
          if (element.tagName !== 'text') return element.querySelector('circle')!.getBoundingClientRect();
          const style = getComputedStyle(element);
          context.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
          const matrix = (element as SVGTextElement).getScreenCTM()!;
          const rows = element.querySelectorAll('tspan').length ? [...element.querySelectorAll('tspan')] : [element];
          const rects = rows.map((row) => {
            const text = row as SVGTextContentElement;
            const first = text.getStartPositionOfChar(0);
            const last = text.getEndPositionOfChar(text.getNumberOfChars() - 1);
            const metrics = context.measureText(row.textContent ?? '');
            const top = first.y - metrics.actualBoundingBoxAscent;
            const bottom = first.y + metrics.actualBoundingBoxDescent;
            return new DOMRect(
              Math.min(first.x, last.x) * matrix.a + matrix.e, top * matrix.d + matrix.f,
              Math.abs(last.x - first.x) * matrix.a, (bottom - top) * matrix.d,
            );
          });
          const left = Math.min(...rects.map((rect) => rect.left));
          const top = Math.min(...rects.map((rect) => rect.top));
          return new DOMRect(left, top, Math.max(...rects.map((rect) => rect.right)) - left, Math.max(...rects.map((rect) => rect.bottom)) - top);
        };
        const selectors: Record<number, string> = {
          1: '[data-part~="1"] :is(.ft-bubble, .ft-letter)',
          2: '[data-tags="2"] .ft-tag',
          3: ':is([data-tags="3"] .ft-tag, [data-part~="3"] .ft-bubble, [data-part~="3"] .ft-letter)',
        };
        // only what is drawn: the configurator's sheet does not show the frames' axis numbers (07.10, one numbering)
        const drawn = (element: Element) => {
          for (let node: Element | null = element; node && node !== root; node = node.parentElement) if (getComputedStyle(node).display === 'none') return false;
          return true;
        };
        const labels = [...root.querySelectorAll(selectors[shown])].filter(drawn);
        const others = [...root.querySelectorAll('.ft-bubble, .ft-letter')].filter(drawn);
        const name = (element: Element) => element.textContent;
        const found: string[] = [];
        const footings = [...root.querySelectorAll<SVGPathElement>('.ft-footing')].map((path) => path.getBoundingClientRect());
        for (const label of labels) {
          const rect = box(label);
          if (rect.left < camera.left - 1 || rect.top < camera.top - 1 || rect.right > camera.right + 1 || rect.bottom > camera.bottom + 1) found.push(`${name(label)} leaves the camera`);
          for (const other of [...labels, ...others]) {
            if (other === label || other.contains(label) || label.contains(other)) continue;
            const against = box(other);
            if (label.classList.contains('ft-bubble') && other.classList.contains('ft-bubble')) {
              // two circles: apart by more than their radii, with a little air
              const apart = Math.hypot(rect.x + rect.width / 2 - against.x - against.width / 2, rect.y + rect.height / 2 - against.y - against.height / 2);
              if (apart < (rect.width + against.width) / 2 + 2) found.push(`${name(label)} × ${name(other)}`);
              continue;
            }
            if (rect.left + 1 < against.right && against.left + 1 < rect.right && rect.top + 1 < against.bottom && against.top + 1 < rect.bottom) found.push(`${name(label)} × ${name(other)}`);
          }
          // a footing's own box is generous (a dashed cube): a name may not reach into it
          if (label.classList.contains('ft-tag') && footings.some((footing) => rect.left + 1 < footing.right && footing.left + 1 < rect.right && rect.top + 1 < footing.bottom && footing.top + 1 < rect.bottom)) found.push(`${name(label)} × a footing`);
        }
        return { count: labels.length, problems: [...new Set(found)] };
      }, step);
      // never vacuous: each step draws names to check
      expect(count, `step ${step}`).toBeGreaterThan(0);
      expect(problems, `step ${step}`).toEqual([]);
    }
  });
}

// «Чому це важливо» under the groups is gone (07.10, simplicity pass: one way round the configurator) — the summary half
// of this test stays.
test('the summary carries the scope-aware choices; the foundation is not the visitor\'s choice', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile-chromium', 'the state contract is viewport-independent');
  await openHangarPage(page);

  await openControlGroup(page, 'cladding');
  await page.getByRole('radiogroup', { name: 'Стіни' }).getByText('Сендвіч-панель', { exact: true }).click();
  // 07.10: «Утеплення» stays the thermal answer, and says where the panels bring insulation; the materials one by one
  await expect(stampFact(page, 'Утеплення')).toHaveText('Лише в стінах (сендвіч-панелі)');
  await expect(stampFact(page, 'Огородження')).toHaveText('Стіни: Сендвіч-панель, покрівля: Профнастил');

  await chooseSeparateWorks(page);
  await page.getByRole('checkbox', { name: 'Стіни / огороджувальний контур' }).uncheck();
  await expect(page.locator('.hc-summary-flagship .hc-summary-facts')).not.toContainText('Ворота');
  await expect(stampFact(page, 'Огородження')).toHaveText('Покрівля: Профнастил');
  // the foundation type is not the visitor's choice on /angary (owner, 03.10)
  await expect(page.locator('#hc-foundation-heading, input[name="hc-foundation-type"]')).toHaveCount(0);
});

// Beauty pass (07.10): a chosen answer is filled graphite, with a copper tick; the filled copper stays the actions'.
test('a chosen option is graphite with a copper tick; a copper fill is left for actions', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile-chromium', 'the state contract is viewport-independent');
  await openHangarPage(page);
  const chosen = page.locator('#configurator .hc-option-card input:checked + span').first();
  await expect(chosen).toBeVisible();
  const text = await page.locator('body').evaluate((element) => getComputedStyle(element).color);
  const accent = await page.evaluate(() => {
    const probe = document.createElement('i');
    probe.style.color = 'var(--color-accent)';
    document.body.appendChild(probe);
    const color = getComputedStyle(probe).color;
    probe.remove();
    return color;
  });
  await expect(chosen).toHaveCSS('background-color', text);
  expect(await chosen.evaluate((element) => getComputedStyle(element, '::before').borderLeftColor)).toBe(accent);
  expect(await chosen.evaluate((element) => getComputedStyle(element, '::before').opacity)).toBe('1');
  const action = page.locator('.hc-summary-action');
  expect(await action.evaluate((element) => getComputedStyle(element).backgroundColor)).not.toBe(text);
});

test('on a phone the model stays under the header while the parameters are set, never covers the summary, and lets go above the controls', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile-chromium', 'the explicit mobile viewport runs once');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openHangarPage(page);
  const stage = page.locator('#configurator .hc-preview-surface');
  const header = await page.locator('.site-header').evaluate((element) => Math.round(element.getBoundingClientRect().height));

  await openControlGroup(page, 'scope');
  await page.locator('#hc-scope-heading').scrollIntoViewIfNeeded();
  await expect(page.locator('#configurator .hc-layout')).toHaveAttribute('data-configuring', '');
  expect(await stage.evaluate((element) => Math.round(element.getBoundingClientRect().top))).toBe(header);
  const stageHeight = await stage.evaluate((element) => element.getBoundingClientRect().height);
  expect(stageHeight).toBeLessThan(844 * 0.3);
  // the mini drawing folds to its sizes' line on request, and comes back (07.10)
  const fold = stage.getByRole('button', { name: 'Згорнути', exact: true });
  await fold.click();
  await expect(stage).toHaveClass(/is-folded/);
  await expect(stage.locator('.sheet-image')).toBeHidden();
  await expect(stage.locator('.hc-sheet-readout')).toContainText('24 × 60 × 8 м');
  expect(await stage.evaluate((element) => element.getBoundingClientRect().height)).toBeLessThan(stageHeight);
  const unfold = stage.getByRole('button', { name: 'Показати ескіз', exact: true });
  await expect(unfold).toHaveAttribute('aria-expanded', 'false');
  await unfold.click();
  await expect(stage.locator('.sheet-image')).toBeVisible();
  await expect(stage.getByRole('button', { name: 'Згорнути', exact: true })).toHaveAttribute('aria-expanded', 'true');

  // Past the controls the model stays small, out of sight: grown back above the screen it pushed the summary down
  // under the finger (03.10). It cannot stick beyond the layout, so nothing covers the summary, and nothing moves.
  await page.locator('.hc-summary-disclaimer').scrollIntoViewIfNeeded();
  await page.evaluate(() => window.scrollBy(0, 200));
  const summary = page.locator('.hc-summary-flagship');
  const summaryTop = await summary.evaluate((element) => element.getBoundingClientRect().top);
  expect(await stage.evaluate((element) => element.getBoundingClientRect().bottom)).toBeLessThanOrEqual(summaryTop);
  await page.waitForTimeout(300);
  expect(await summary.evaluate((element) => element.getBoundingClientRect().top)).toBeCloseTo(summaryTop, 0);
  // Back above the controls it lets go, and the model grows in view
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(page.locator('#configurator .hc-layout')).not.toHaveAttribute('data-configuring', '');
});

/** Scrolls just past the configurator's stamp, where the phone's «До заявки» may show */
async function scrollPastSummary(page: Page) {
  await page.evaluate(() => {
    const element = document.querySelector('.hc-summary-flagship');
    if (element) window.scrollTo(0, window.scrollY + element.getBoundingClientRect().bottom + 1);
  });
}

test('mobile inquiry CTA follows attachment, form and overlay conditions', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile-chromium', 'the explicit mobile viewport runs once');
  await page.setViewportSize({ width: 390, height: 844 });
  await openHangarPage(page, false);
  await setWidth(page, '30');

  const stickyCta = page.getByRole('link', { name: /До заявки/ });
  await expect(stickyCta).toBeHidden();
  // The cookie strip no longer hides the shortcut (08.10, from main #160): past the summary it stands above the strip,
  // never under or over it
  await scrollPastSummary(page);
  await expect(stickyCta).toBeVisible();
  const banner = page.locator('.cookie-banner');
  await expect(banner).toBeVisible();
  const bannerTop = await banner.evaluate((element) => element.getBoundingClientRect().top);
  await expect.poll(() => stickyCta.evaluate((element) => element.getBoundingClientRect().bottom)).toBeLessThanOrEqual(bannerTop + 1);
  await page.getByRole('button', { name: 'Лише необхідні', exact: true }).click();
  await expect(banner).toBeHidden();
  await expect(stickyCta).toBeVisible();
  // the strip gone, the shortcut goes down to the screen's edge
  await expect.poll(() => stickyCta.evaluate((element) => Math.round(element.getBoundingClientRect().bottom))).toBe(844);

  // A direct jump can skip every IntersectionObserver transition. The CTA must still derive its
  // state from the summary's real viewport position on the resulting scroll frame.
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(stickyCta).toBeHidden();
  await page.evaluate(() => {
    const target = document.getElementById('process');
    if (target) window.scrollTo(0, window.scrollY + target.getBoundingClientRect().top);
  });
  await expect(stickyCta).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(stickyCta).toBeHidden();

  const summary = page.locator('.hc-summary-flagship');
  await summary.scrollIntoViewIfNeeded();
  await expect(stickyCta).toBeHidden();
  await scrollPastSummary(page);
  await expect(stickyCta).toBeVisible();

  await page.locator('#hc-dimension-length').focus();
  await expect(stickyCta).toBeHidden();
  await page.locator('#hc-dimension-length').blur();
  await expect(stickyCta).toBeHidden();
  await scrollPastSummary(page);
  await expect(stickyCta).toBeVisible();

  const mobileMenu = page.locator('.mobile-menu');
  await mobileMenu.locator('summary').click();
  await expect(stickyCta).toBeHidden();
  await mobileMenu.locator('summary').click();
  await expect(stickyCta).toBeVisible();

  // 3D is a chip on the drawing now (07.10); its fullscreen is an overlay the shortcut keeps out of
  await showWholeSheet(page);
  await openThree(page);
  await expect(page.locator('canvas')).toHaveCount(1);
  await page.getByRole('button', { name: 'Розгорнути', exact: true }).evaluate((button: HTMLButtonElement) => button.click());
  await expect(stickyCta).toBeHidden();
  await page.getByRole('button', { name: /Закрити/ }).click();
  await scrollPastSummary(page);
  await expect(stickyCta).toBeVisible();

  await page.locator('#inquiry').scrollIntoViewIfNeeded();
  await expect(stickyCta).toBeHidden();
  // Past the form — /angary closes with the separate stages after it (03.10) — a «↓» would point the wrong way
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  expect(await page.locator('#inquiry').evaluate((element) => element.getBoundingClientRect().bottom)).toBeLessThan(0);
  // the CTA measures on the next frame: let it, so a stale «hidden» cannot pass for the answer
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await expect(stickyCta).toBeHidden();
  await page.locator('#inquiry').scrollIntoViewIfNeeded();
  await attachmentCard(page).getByRole('button', { name: 'Не додавати', exact: true }).click();
  await page.locator('#configurator').scrollIntoViewIfNeeded();
  await expect(stickyCta).toHaveCount(0);
  const overflow = await page.evaluate(() => ({
    difference: document.documentElement.scrollWidth - window.innerWidth,
    offenders: Array.from(document.querySelectorAll<HTMLElement>('body *'))
      .filter((element) => element.getBoundingClientRect().right > window.innerWidth + 1)
      .slice(0, 10)
      .map((element) => ({
        className: element.className,
        right: Math.round(element.getBoundingClientRect().right),
        width: Math.round(element.getBoundingClientRect().width),
      })),
  }));
  expect(overflow.difference, JSON.stringify(overflow.offenders)).toBeLessThanOrEqual(1);
});

test('sticky inquiry CTA honours the /angary 760/761 breakpoint', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile-chromium', 'the explicit boundary runs once');
  await page.setViewportSize({ width: 760, height: 1024 });
  await openHangarPage(page);
  await setWidth(page, '30');
  const stickyCta = page.getByRole('link', { name: /До заявки/ });
  await scrollPastSummary(page);
  await expect(stickyCta).toBeVisible();
  await page.setViewportSize({ width: 761, height: 1024 });
  await expect(stickyCta).toBeHidden();
});

// ── The steps (07.10) ───────────────────────────────────────────────────────────────────────────────────────────────
// The groups are walked as five steps, one open at a time on every width. They replace the phone accordion and the
// all-open groups of a wide screen (03.10); «Об’єкт» is split into «Задача» (need), «Простір усередині» (space, on
// «Каркас») and «Проєкт» (with the scope, last).

const STEPS = [
  { id: 'task', title: 'Задача' },
  { id: 'size', title: 'Габарити' },
  { id: 'shell', title: 'Стіни й ворота' },
  { id: 'frame', title: 'Каркас' },
  { id: 'check', title: 'Обсяг' },
] as const;

test('on a phone the steps walk one panel at a time: numbered tabs, the open step named, «Далі» landing under the mini drawing', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile-chromium', 'the explicit phone viewport runs once');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openHangarPage(page);
  const controls = page.locator('#configurator .hc-controls');
  await expect(controls).toHaveAttribute('data-steps', '');
  expect(await controls.evaluate((element) => element.hasAttribute('data-accordion'))).toBe(false);
  await expect(controls.locator('.hc-group-toggle')).toHaveCount(0);
  const tabs = controls.getByRole('tab');
  await expect(tabs).toHaveText(STEPS.map((step, index) => `${index + 1}${step.title}`));
  // a phone shows the tabs' numbers; the step on show is named under them
  await expect(tabs.first().locator('.hc-step-number')).toBeVisible();
  await expect(controls.locator('.hc-step-current')).toBeVisible();
  await expect(controls.locator('.hc-step-current')).toHaveText('Крок 1 з 5 · Задача');
  for (const [index, step] of STEPS.entries()) {
    const tab = page.locator(`#hc-step-${step.id}-tab`);
    await expect(tab).toHaveAttribute('aria-controls', `hc-step-${step.id}`);
    await expect(tab).toHaveAttribute('aria-selected', index === 0 ? 'true' : 'false');
    await expect(page.locator(`#hc-step-${step.id}`)).toBeVisible({ visible: index === 0 });
  }
  // a group is still named by its title alone
  await expect(page.locator('section[data-group="dimensions"]')).toHaveAttribute('aria-labelledby', 'hc-dimensions-heading');
  await expect(page.locator('#hc-dimensions-heading')).toHaveText('Розміри');

  // one at a time: «Далі» opens «Габарити», closes «Задача», and the tabs are not left under the mini drawing
  const next = page.locator('#hc-step-task .hc-step-next');
  await expect(next).toHaveText(/Далі: Габарити/);
  await next.scrollIntoViewIfNeeded();
  await next.click();
  await expect(page.locator('#hc-step-size-tab')).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('#hc-step-size-tab')).toBeFocused();
  await expect(page.locator('#hc-step-task')).toBeHidden();
  await expect(page.locator('#hc-step-size')).toBeVisible();
  await expect(controls.locator('.hc-step-current')).toHaveText('Крок 2 з 5 · Габарити');
  await expect(page.locator('#configurator .hc-layout')).toHaveAttribute('data-configuring', '');
  await expect.poll(async () => {
    const stageBottom = await page.locator('#configurator .hc-preview-surface').evaluate((element) => element.getBoundingClientRect().bottom);
    const tabsTop = await controls.getByRole('tablist').evaluate((element) => element.getBoundingClientRect().top);
    return tabsTop - stageBottom;
  }).toBeGreaterThanOrEqual(-1);
  expect(await controls.getByRole('tablist').evaluate((element) => element.getBoundingClientRect().top)).toBeLessThan(844 / 2);
  // «←» goes back, named for what it opens
  await expect(page.locator('#hc-step-size .hc-step-back')).toHaveAccessibleName('Назад: Задача');

  // the folded headers' values went with the accordion: the mini drawing says the sizes, the stamp the task
  await setWidth(page, '30');
  await expect(page.locator('#configurator .hc-preview-surface .hc-sheet-readout')).toContainText('30 × 60 × 8 м');
  await openControlGroup(page, 'need');
  await page.locator('label:has(input[name="hc-purpose"][value="storage"])').click();
  await page.getByLabel('Де будуємо?', { exact: true }).selectOption('Київська область');
  await expect(stampFact(page, 'Задача')).toHaveText('Склад · Київська обл.');
  // a step the visitor answered is marked once left; one merely passed is not (07.10)
  await expect(page.locator('#hc-step-size-tab')).toHaveAttribute('data-done', '');
  await expect(page.locator('#hc-step-task-tab')).not.toHaveAttribute('data-done', /.*/);
  await expect(page.locator('#hc-step-shell-tab')).not.toHaveAttribute('data-done', /.*/);
  // a step takes well under a screen and a half (the groups were 2 screens, 1734 px, open together before 03.10)
  for (const step of STEPS) {
    await page.locator(`#hc-step-${step.id}-tab`).click();
    await expect(page.locator(`#hc-step-${step.id}`)).toBeVisible();
    expect(await controls.evaluate((element) => element.getBoundingClientRect().height), step.id).toBeLessThan(844 * 1.5);
  }
});

test('on a wide screen the configurator walks the same steps, one panel at a time', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile-chromium', 'a wide-screen contract');
  await openHangarPage(page);
  const controls = page.locator('#configurator .hc-controls');
  await expect(controls.locator('.hc-group-toggle')).toHaveCount(0);
  await expect(controls).toHaveAttribute('data-steps', '');
  await expect(controls.locator('.hc-step-title')).toHaveText(STEPS.map((step) => step.title));
  // wider than a phone the tabs carry their names
  for (const title of await controls.locator('.hc-step-title').all()) await expect(title).toBeVisible();
  await expect(controls.locator('.hc-step-panel:visible')).toHaveCount(1);
  await expect(page.locator('#hc-step-task')).toBeVisible();
  await expect(page.locator('#hc-step-task h3')).toHaveText(['Задача']);
  // each step's groups under their plain headings; no foundation on /angary (owner, 03.10)
  await openControlGroup(page, 'envelope');
  await expect(page.locator('#hc-step-shell h3')).toHaveText(['Чи потрібне утеплення?', 'Матеріали', 'Ворота й двері']);
  await expect(controls.locator('.hc-step-panel:visible')).toHaveCount(1);
  await openControlGroup(page, 'scope');
  await expect(page.locator('#hc-step-check h3')).toHaveText(['Обсяг робіт', 'Проєкт']);
  // the arrow keys move between the tabs (the tabs pattern)
  await page.locator('#hc-step-check-tab').focus();
  await page.keyboard.press('ArrowLeft');
  await expect(page.locator('#hc-step-frame-tab')).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('#hc-step-frame-tab')).toBeFocused();
  await page.keyboard.press('Home');
  await expect(page.locator('#hc-step-task-tab')).toHaveAttribute('aria-selected', 'true');
  // the 760/761 px boundary changes nothing about the steps
  for (const width of [761, 760]) {
    await page.setViewportSize({ width, height: 1024 });
    await expect(controls.getByRole('tab')).toHaveCount(5);
    await expect(controls.getByRole('tablist')).toBeVisible();
    await expect(controls.locator('.hc-group-toggle')).toHaveCount(0);
    await expect(controls.locator('.hc-step-panel:visible')).toHaveCount(1);
  }
});

test('«Задача» and the other optional answers reach the stamp and the brief only once given', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile-chromium', 'the state contract is viewport-independent');
  await openHangarPage(page);
  const facts = page.locator('.hc-summary-flagship .hc-summary-facts');
  await expect(facts).not.toContainText('Задача');
  await expect(attachmentCard(page)).toHaveCount(0);

  await openControlGroup(page, 'need');
  await page.locator('label:has(input[name="hc-purpose"][value="machinery"])').click();
  await expect(stampFact(page, 'Задача')).toHaveText('Техніка');
  // the drawn hangar is still the example: the answers are added, its sizes are not the visitor's (04.10)
  await expect(attachmentCard(page)).toContainText('До заявки додано відповіді про об’єкт');
  await expect(previewSheet(page).locator('.sheet-stamp')).toContainText('Приклад · 24 × 60 × 8 м');
  // «Ще не знаю» takes the answer back (07.10: a chip of its own — a chosen chip pressed again took it back before)
  await page.locator('label:has(input[name="hc-purpose"][value=""])').click();
  await expect(page.locator('input[name="hc-purpose"]:checked')).toHaveValue('');
  await expect(facts).not.toContainText('Задача');

  // the project is asked with the scope, the lifting equipment with the frame (07.10)
  await openControlGroup(page, 'project');
  await page.locator('label:has(input[name="hc-project"][value="inProgress"])').click();
  await openControlGroup(page, 'space');
  await page.locator('label:has(input[name="hc-lifting"][value="craneOrHoist"])').click();
  const brief = attachmentCard(page);
  await expect(brief).toContainText('До заявки додано відповіді про об’єкт');
  await brief.getByText('Переглянути параметри', { exact: true }).click();
  await expect(brief.locator('dl > div').first()).toHaveText('ПроєктГотується');
  await expect(brief).toContainText('Підйомне обладнанняКран-балка або тельфер');
  await expect(brief).not.toContainText('Область');
  await expect(brief).not.toContainText('Призначення');
});

test('an unedited ridge keeps the span rule’s slope as the width changes; an edited one is kept', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile-chromium', 'the state contract is viewport-independent');
  await openHangarPage(page);
  await openControlGroup(page, 'dimensions');
  const ridge = page.locator('#hc-dimension-ridge');
  const area = page.locator('.hc-stamp-row .hc-summary-area');
  await expect(area).toContainText('коник 10,6 м · ухил ≈ 12°');
  await expect(page.locator('#hc-dimension-ridge-hint')).toContainText('Коник 10,6 м · ухил ≈ 12° (22 %)');
  // the ridge is a refinement, not a first question (07.10): folded until asked for
  await expect(ridge).toBeHidden();
  await page.locator('#hc-step-size details.hc-more summary').click();
  await expect(ridge).toBeVisible();

  // it used to stay 10.6 m: 19.3° at 12 m and 5.9° at 50 m
  await setWidth(page, '12');
  await expect(ridge).toHaveValue('9,5');
  await expect(area).toContainText('коник 9,5 м · ухил ≈ 14°');
  await setWidth(page, '50');
  await expect(ridge).toHaveValue('11,7');
  await expect(area).toContainText('коник 11,7 м · ухил ≈ 8°');

  await ridge.fill('13');
  await ridge.blur();
  await expect(page.locator('#hc-dimension-ridge-hint')).toContainText('ваше значення');
  await setWidth(page, '40');
  await expect(ridge).toHaveValue('13');
  // an edited ridge stays unfolded, with the way back to the span rule
  await expect(ridge).toBeVisible();
  await expect(page.getByRole('button', { name: 'Підбирати ухил за шириною', exact: true })).toBeVisible();
  const brief = attachmentCard(page);
  await brief.getByText('Переглянути параметри', { exact: true }).click();
  await expect(brief).toContainText('Висота в конику13 м · ухил ≈ 14°');
});

// 08.10: only «Задача» showed without JavaScript — the fallback `.hc-step-panel[hidden] { display: block }` lost to
// Tailwind's layered `[hidden] { display: none !important }`; it now sits in the same layer (configurator-controls.css).
test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });

  test('every step panel shows under its headings, without the tabs and the step buttons', async ({ page }) => {
    await page.goto('/angary', { waitUntil: 'load' });
    const controls = page.locator('#configurator .hc-controls');
    await expect(controls.locator('.hc-group-toggle')).toHaveCount(0);
    for (const step of STEPS) await expect(page.locator(`#hc-step-${step.id}`)).toBeVisible();
    await expect(controls.locator('.hc-steps')).toBeHidden();
    await expect(controls.locator('.hc-step-nav:visible')).toHaveCount(0);
    await expect(controls.locator('.hc-control-group h3')).toHaveText([
      'Задача', 'Розміри', 'Чи потрібне утеплення?', 'Матеріали', 'Ворота й двері', 'Простір усередині', 'Обсяг робіт', 'Проєкт',
    ]);
    for (const heading of await controls.locator('.hc-control-group h3').all()) await expect(heading).toBeVisible();
  });
});
