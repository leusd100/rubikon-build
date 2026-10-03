import { expect, test, type Page } from '@playwright/test';
import { openControlGroup } from './configurator.helpers';

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

// The two presentation-only demos («Подивитись каркас», «Порівняти із сендвіч-панеллю») are gone (UX review 2026-10): the
// frame is now told by «Каркас вашого ангара», and the comparison changed 0 pixels of the technical view.
test('the frame drawing follows the configuration and walks a snow and a wind load through it', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile-chromium', 'the state contract is viewport-independent');
  await openHangarPage(page);
  const frame = page.locator('#structure');
  const tour = frame.locator('.ft');
  const steps = frame.locator('.dn-step');
  await expect(frame.locator('.sheet-stamp')).toContainText('Приклад · 24 × 60 × 8 м');
  await expect(page.getByRole('button', { name: /Подивитись каркас|Порівняти із сендвіч-панеллю/ })).toHaveCount(0);
  // The section follows the configurator (03.10): while it shows the example it points back up to the sizes, and the
  // title block always has the way up
  await expect(frame.locator('.direction-editorial-copy')).toContainText('Задайте свої габарити вище — схема перебудується. Креслення будується');
  await expect(frame.locator('.sheet-stamp').getByRole('link', { name: /Змінити габарити/ })).toHaveAttribute('href', '#configurator');
  // 24 m has the centre row: the width between the outer axes is not «the span»; the axes are lettered А, Б, В across it
  // and numbered for the drawn frames along it
  await expect(steps.nth(0)).toContainText('Ширина L');
  await expect(steps.nth(0)).toContainText('L — 24 м між осями крайніх колон А і В у прикладі. Центральний ряд Б ділить її на два прольоти. H — висота стіни.');
  await expect(frame.locator('[data-part~="1"] .ft-bubble')).toHaveText(['А', 'Б', 'В']);
  await expect(frame.locator('[data-part~="3"] .ft-bubble')).toHaveText(['1', '2', '3', '4']);

  await setWidth(page, '16');
  await expect(frame.locator('.sheet-stamp')).toContainText('Ваш ангар · 16 × 60 × 8 м');
  // the configurator's stamp marks the value that changed
  await expect(page.locator('.hc-stamp-row .hc-summary-dimensions')).toHaveClass(/is-changed/);
  await expect(steps.nth(1)).toContainText('Для ширини 16 м у попередній візуалізації показано портальну раму');
  await expect(frame.locator('.direction-editorial-copy')).not.toContainText('Задайте свої габарити');
  await expect(steps.nth(0)).toContainText('Проліт L — відстань між осями крайніх колон А і В: 16 м у вашій конфігурації. Усередині колон немає. H — висота стіни.');
  await expect(frame.locator('[data-part~="1"] .ft-bubble')).toHaveText(['А', 'В']);
  // a short building is drawn whole: as many numbered axes as frames, none at a break
  await setLength(page, '18');
  await expect(frame.locator('[data-part~="3"] .ft-bubble')).toHaveText(['1', '2', '3', '4']);
  await setLength(page, '12');
  await expect(frame.locator('[data-part~="3"] .ft-bubble')).toHaveText(['1', '2', '3']);
  await setLength(page, '60');

  // each step holds as long as it builds, and its progress bar fills as long
  const durations = ['4200ms', '4800ms', '5200ms', '6400ms', '7600ms'];
  for (const index of [0, 1, 2, 3, 4]) {
    await steps.nth(index).click();
    await expect(steps.nth(index)).toHaveAttribute('aria-pressed', 'true');
    await expect(tour).toHaveAttribute('data-step', String(index + 1));
    expect(await tour.evaluate((element) => (element as HTMLElement).style.getPropertyValue('--dn-step-ms'))).toBe(durations[index]);
  }
  // step 3 names the end wall's posts with the other members
  await steps.nth(2).click();
  await expect(frame.locator('[data-tags="3"] .ft-tag')).toHaveCount(4);
  await expect(frame.locator('[data-tags="3"] .ft-tag').filter({ hasText: 'фахверку' })).toHaveCount(1);
  // steps 4 and 5 follow a load through the frame, with the chain it takes over the drawing; the other steps do not
  const snow = frame.locator('g[data-load="snow"]');
  const wind = frame.locator('g[data-load="wind"]');
  const snowChain = frame.locator('.ft-chain[data-load="snow"]');
  const windChain = frame.locator('.ft-chain[data-load="wind"]');
  await steps.nth(3).click();
  await expect(snow).toHaveCSS('opacity', '1');
  await expect(wind).toHaveCSS('opacity', '0');
  await expect(snowChain).toBeVisible();
  await expect(windChain).toBeHidden();
  await expect(snowChain.locator('li')).toHaveText(['Покрівля', 'Прогони', 'Ригель рами', 'Колони', 'Фундаменти', 'Ґрунт']);
  await steps.nth(4).click();
  await expect(wind).toHaveCSS('opacity', '1');
  await expect(windChain).toBeVisible();
  await expect(snowChain).toBeHidden();
  await expect(windChain.locator('li')).toHaveText(['Торцева стіна', 'Стійки фахверку', 'В’язі покрівлі', 'В’язі стін', 'Фундаменти']);
  // …then, once the chain has lit, the first bay leans as it would without the bracing, with the note that says so
  await expect(steps.nth(4)).toContainText('Без в’язей рами схилилися б уздовж будівлі, як доміно, — в’язі тримають їх рівно.');
  await expect(frame.locator('.ft-note')).toHaveText('Деформацію показано умовно, у збільшеному масштабі');
  await expect(wind.locator('.ft-ghost')).toHaveCSS('animation-name', 'ft-ghost');
  await expect(frame.locator('.ft-note')).toHaveCSS('animation-name', 'ft-ghost');
  await expect(wind.locator('.ft-link[data-brace]').first()).toHaveCSS('animation-name', 'ft-light, ft-unbraced');
  await steps.nth(0).click();
  await expect(snow).toHaveCSS('opacity', '0');
  await expect(wind).toHaveCSS('opacity', '0');
  await expect(snowChain).toBeHidden();
  await expect(windChain).toBeHidden();
  // it attaches nothing: the brief is attached by the width edit, not by the drawing
  await expect(attachmentCard(page)).toContainText('16 × 60 × 8 м');
});

test('without motion the wind step stands complete: no leaning bay, no note', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile-chromium', 'the motion contract is viewport-independent');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openHangarPage(page);
  const frame = page.locator('#structure');
  await frame.locator('.dn-step').nth(4).click();
  await expect(frame.locator('.ft-chain[data-load="wind"]')).toBeVisible();
  for (const selector of ['[data-load="wind"] .ft-ghost', '.ft-note']) {
    await expect(frame.locator(selector)).toHaveCSS('animation-name', 'none');
    await expect(frame.locator(selector)).toHaveCSS('opacity', '0');
  }
  await expect(frame.locator('[data-load="wind"] .ft-link[data-brace]').first()).toHaveCSS('opacity', '1');
});

// Every name, axis bubble and dimension letter a step shows sits whole inside that step's camera window, clear of the
// others and of the footings — at a phone's sizes too (03.10). The legend sits in its own band above the window.
for (const [width, length] of [['24', '60'], ['12', '18'], ['50', '120']] as const) {
  test(`the frame's labels stay inside each step's camera at ${width} × ${length} m`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await openHangarPage(page);
    await setWidth(page, width);
    await setLength(page, length);
    const frame = page.locator('#structure');
    for (const step of [1, 2, 3]) {
      await frame.locator('.dn-step').nth(step - 1).click();
      await frame.locator('.ft-sheet').scrollIntoViewIfNeeded();
      await expect(frame.locator('.ft')).toHaveAttribute('data-step', String(step));
      // the names fade in over 0.3 s
      if (step > 1) await expect(frame.locator(`[data-tags="${step}"]`)).toHaveCSS('opacity', '1');
      const problems = await frame.evaluate((root, shown) => {
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
        const labels = [...root.querySelectorAll(selectors[shown])];
        const others = [...root.querySelectorAll('.ft-bubble, .ft-letter')];
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
        return [...new Set(found)];
      }, step);
      expect(problems, `step ${step}`).toEqual([]);
    }
  });
}

test('the summary carries the scope-aware choices; «Чому це важливо» explains a group in place', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile-chromium', 'the state contract is viewport-independent');
  await openHangarPage(page);

  await page.getByRole('radiogroup', { name: 'Стіни' }).getByText('Сендвіч-панель', { exact: true }).click();
  await expect(page.locator('.hc-summary-flagship .hc-summary-facts')).toContainText(
    'КонтурІндивідуальна конфігурація',
  );

  await page.getByRole('checkbox', { name: 'Стіни / огороджувальний контур' }).uncheck();
  await expect(page.locator('.hc-summary-flagship .hc-summary-facts')).not.toContainText('Ворота');

  // The explanation that used to be its own section, folded under the group it explains
  const why = page.locator('.hc-why[data-why="cladding"]');
  await expect(why.locator('img')).toHaveCount(2);
  await expect(why.locator('img').first()).toBeHidden();
  await why.locator('summary').click();
  await expect(why).toHaveAttribute('open', '');
  await expect(why.locator('img').first()).toBeVisible();
  await expect(why).toContainText('Профнастил формує легкий неутеплений контур.');
  // the foundation type is not the visitor's choice on /angary (owner, 03.10)
  await expect(page.locator('#hc-foundation-heading, input[name="hc-foundation-type"]')).toHaveCount(0);
});

test('a chosen option is graphite; copper is left for actions', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile-chromium', 'the state contract is viewport-independent');
  await openHangarPage(page);
  const chosen = page.locator('.hc-option-card input:checked + span').first();
  const text = await page.locator('body').evaluate((element) => getComputedStyle(element).color);
  await expect(chosen).toHaveCSS('background-color', text);
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

  await page.locator('#hc-scope-heading').scrollIntoViewIfNeeded();
  await expect(page.locator('#configurator .hc-layout')).toHaveAttribute('data-configuring', '');
  expect(await stage.evaluate((element) => Math.round(element.getBoundingClientRect().top))).toBe(header);
  const stageHeight = await stage.evaluate((element) => element.getBoundingClientRect().height);
  expect(stageHeight).toBeLessThan(844 * 0.3);

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

test('mobile inquiry CTA follows attachment, form and overlay conditions', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile-chromium', 'the explicit mobile viewport runs once');
  await page.setViewportSize({ width: 390, height: 844 });
  await openHangarPage(page, false);
  await setWidth(page, '30');

  const stickyCta = page.getByRole('link', { name: /До заявки/ });
  await expect(stickyCta).toBeHidden();
  await page.getByRole('button', { name: 'Лише необхідні', exact: true }).click();
  await expect(stickyCta).toBeHidden();

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
  await page.evaluate(() => {
    const element = document.querySelector('.hc-summary-flagship');
    if (element) window.scrollTo(0, window.scrollY + element.getBoundingClientRect().bottom + 1);
  });
  await expect(stickyCta).toBeVisible();

  await page.locator('#hc-dimension-length').focus();
  await expect(stickyCta).toBeHidden();
  await page.locator('#hc-dimension-length').blur();
  await expect(stickyCta).toBeHidden();
  await page.evaluate(() => {
    const element = document.querySelector('.hc-summary-flagship');
    if (element) window.scrollTo(0, window.scrollY + element.getBoundingClientRect().bottom + 1);
  });
  await expect(stickyCta).toBeVisible();

  const mobileMenu = page.locator('.mobile-menu');
  await mobileMenu.locator('summary').click();
  await expect(stickyCta).toBeHidden();
  await mobileMenu.locator('summary').click();
  await expect(stickyCta).toBeVisible();

  await page.getByRole('button', { name: '3D', exact: true }).evaluate((button: HTMLButtonElement) => button.click());
  await expect(page.locator('canvas')).toHaveCount(1);
  await page.getByRole('button', { name: 'Розгорнути', exact: true }).evaluate((button: HTMLButtonElement) => button.click());
  await expect(stickyCta).toBeHidden();
  await page.getByRole('button', { name: /Закрити/ }).click();
  await page.evaluate(() => {
    const element = document.querySelector('.hc-summary-flagship');
    if (element) window.scrollTo(0, window.scrollY + element.getBoundingClientRect().bottom + 1);
  });
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
  await page.evaluate(() => {
    const element = document.querySelector('.hc-summary-flagship');
    if (element) window.scrollTo(0, window.scrollY + element.getBoundingClientRect().bottom + 1);
  });
  await expect(stickyCta).toBeVisible();
  await page.setViewportSize({ width: 761, height: 1024 });
  await expect(stickyCta).toBeHidden();
});

// ── «Об’єкт» and the phone accordion (03.10) ────────────────────────────────────────────────────────────────────────

test('on a phone the groups fold: «Об’єкт» open first, one group at a time, each header saying its value', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile-chromium', 'the explicit phone viewport runs once');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openHangarPage(page);
  const controls = page.locator('#configurator .hc-controls');
  await expect(controls).toHaveAttribute('data-accordion', '');
  const toggles = controls.locator('.hc-group-toggle');
  // no foundation group on /angary (owner, 03.10)
  await expect(toggles).toHaveText([
    'Об’єктЩе не вказано',
    'Розміри24 × 60 × 8 м',
    'Контур будівліХолодний · профнастил',
    'Огороджувальні конструкціїПрофнастил',
    'Обсяг заявки4 з 4 робіт',
    'Прорізиодні ворота · без дверей',
  ]);
  for (const [index, group] of ['object', 'dimensions', 'envelope', 'cladding', 'scope', 'openings'].entries()) {
    const toggle = toggles.nth(index);
    await expect(toggle).toHaveAttribute('aria-controls', `hc-${group}-panel`);
    await expect(toggle).toHaveAttribute('aria-expanded', index === 0 ? 'true' : 'false');
    await expect(page.locator(`#hc-${group}-panel`)).toBeVisible({ visible: index === 0 });
  }
  // a group is still named by its title alone, not by the value under it
  await expect(page.locator('section[data-group="dimensions"]')).toHaveAttribute('aria-labelledby', 'hc-dimensions-heading');
  await expect(page.locator('#hc-dimensions-heading')).toHaveText('Розміри');

  // one at a time: opening «Розміри» folds «Об’єкт», and the opened header is not left under the mini drawing
  await toggles.nth(1).click();
  await expect(toggles.nth(1)).toHaveAttribute('aria-expanded', 'true');
  await expect(toggles.nth(0)).toHaveAttribute('aria-expanded', 'false');
  await expect(page.locator('#hc-object-panel')).toBeHidden();
  await expect.poll(async () => {
    const stageBottom = await page.locator('#configurator .hc-preview-surface').evaluate((element) => element.getBoundingClientRect().bottom);
    const headerTop = await toggles.nth(1).evaluate((element) => element.getBoundingClientRect().top);
    return headerTop - stageBottom;
  }).toBeGreaterThanOrEqual(-1);
  await expect(page.locator('#configurator .hc-layout')).toHaveAttribute('data-configuring', '');

  await setWidth(page, '30');
  await expect(toggles.nth(1)).toContainText('30 × 60 × 8 м');
  await openControlGroup(page, 'object');
  await page.locator('label:has(input[name="hc-purpose"][value="storage"])').click();
  await page.getByLabel('Область будівництва', { exact: true }).selectOption('Київська область');
  await expect(toggles.nth(0)).toContainText('Склад · Київська обл.');
  // the open header closes its own group: every group may be folded
  await toggles.nth(0).click();
  await expect(controls.locator('.hc-group-toggle[aria-expanded="true"]')).toHaveCount(0);
  // folded, the configurator's controls take well under a screen and a half (they were 2 screens, 1734 px, before)
  expect(await controls.evaluate((element) => element.getBoundingClientRect().height)).toBeLessThan(844 * 1.5);
});

test('on a phone «Змінити габарити ↑» under the frame drawing opens «Розміри» and lands on it', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile-chromium', 'the explicit phone viewport runs once');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openHangarPage(page);
  const dimensions = page.locator('#configurator .hc-group-toggle[aria-controls="hc-dimensions-panel"]');
  await expect(dimensions).toHaveAttribute('aria-expanded', 'false');

  const resize = page.locator('#structure a[data-open-group="dimensions"]');
  await resize.scrollIntoViewIfNeeded();
  await resize.click();
  await expect(dimensions).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('#hc-dimensions-panel')).toBeVisible();
  await expect(dimensions).toBeFocused();
  // its header just under the mini drawing, not under it and not a screen away
  await expect.poll(async () => {
    const stageBottom = await page.locator('#configurator .hc-preview-surface').evaluate((element) => element.getBoundingClientRect().bottom);
    const headerTop = await dimensions.evaluate((element) => element.getBoundingClientRect().top);
    return headerTop - stageBottom;
  }).toBeGreaterThanOrEqual(-1);
  expect(await dimensions.evaluate((element) => element.getBoundingClientRect().top)).toBeLessThan(844 / 2);
});

test('on a wide screen every group stays open under a plain heading, «Об’єкт» first', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile-chromium', 'a wide-screen contract');
  await openHangarPage(page);
  const controls = page.locator('#configurator .hc-controls');
  await expect(controls.locator('.hc-group-toggle')).toHaveCount(0);
  await expect(controls).not.toHaveAttribute('data-accordion', '');
  await expect(controls.locator('.hc-control-group h3')).toHaveText(['Об’єкт', 'Розміри', 'Контур будівлі', 'Огороджувальні конструкції', 'Обсяг заявки', 'Прорізи']);
  for (const group of ['object', 'dimensions', 'envelope', 'cladding', 'scope', 'openings']) await expect(page.locator(`#hc-${group}-panel`)).toBeVisible();
  // the 761 px boundary is still a wide screen
  await page.setViewportSize({ width: 761, height: 1024 });
  await expect(controls.locator('.hc-group-toggle')).toHaveCount(0);
  await page.setViewportSize({ width: 760, height: 1024 });
  await expect(controls.locator('.hc-group-toggle')).toHaveCount(6);
});

test('«Об’єкт»: optional answers that reach the stamp and the brief only once given', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile-chromium', 'the state contract is viewport-independent');
  await openHangarPage(page);
  const facts = page.locator('.hc-summary-flagship .hc-summary-facts');
  await expect(facts).not.toContainText('Призначення');
  await expect(attachmentCard(page)).toHaveCount(0);

  const technika = page.locator('label:has(input[name="hc-purpose"][value="machinery"])');
  await technika.click();
  await expect(facts).toContainText('ПризначенняТехніка');
  // the drawn hangar is still the example: the answers are added, its sizes are not the visitor's (04.10)
  await expect(attachmentCard(page)).toContainText('До заявки додано відповіді про об’єкт');
  // the chosen purpose clicked again is taken back: the stamp loses the cell
  await technika.click();
  await expect(page.locator('input[name="hc-purpose"]:checked')).toHaveCount(0);
  await expect(facts).not.toContainText('Призначення');

  await page.locator('label:has(input[name="hc-project"][value="inProgress"])').click();
  await page.locator('label:has(input[name="hc-lifting"][value="craneOrHoist"])').click();
  const brief = attachmentCard(page);
  await brief.getByText('Переглянути параметри', { exact: true }).click();
  await expect(brief.locator('dl > div').first()).toHaveText('ПроєктГотується');
  await expect(brief).toContainText('Підйомне обладнанняКран-балка або тельфер');
  await expect(brief).not.toContainText('Область');

  const why = page.locator('.hc-why[data-why="object"]');
  await why.locator('summary').click();
  await expect(why).toContainText('Снігове й вітрове навантаження залежать від того, де стоїть ангар');
});

test('an unedited ridge keeps the span rule’s slope as the width changes; an edited one is kept', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile-chromium', 'the state contract is viewport-independent');
  await openHangarPage(page);
  const ridge = page.locator('#hc-dimension-ridge');
  const area = page.locator('.hc-stamp-row .hc-summary-area');
  await expect(area).toContainText('коник 10,6 м · ухил ≈ 12°');
  await expect(page.locator('#hc-dimension-ridge-hint')).toContainText('Коник 10,6 м · ухил ≈ 12° (22 %)');

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
  const brief = attachmentCard(page);
  await brief.getByText('Переглянути параметри', { exact: true }).click();
  await expect(brief).toContainText('Висота в конику13 м · ухил ≈ 14°');
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });

  test('every configurator group is open under its heading', async ({ page }) => {
    await page.goto('/angary', { waitUntil: 'load' });
    const controls = page.locator('#configurator .hc-controls');
    await expect(controls.locator('.hc-group-toggle')).toHaveCount(0);
    for (const group of ['object', 'dimensions', 'envelope', 'cladding', 'scope', 'openings']) await expect(page.locator(`#hc-${group}-panel`)).toBeVisible();
  });
});
