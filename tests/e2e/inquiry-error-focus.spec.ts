import { expect, test, type Locator, type Page } from '@playwright/test';
import { openControlGroup } from './configurator.helpers';

// W3-07 (owner 25.10: PDO-86 B and the rest of PDO-24). An error of the inquiry form is told from the form's copper titles
// by more than its colour: every message opens with a «!» mark, and an invalid field is framed 2 px — its 1 px border and
// 1 px inside it, so the field does not grow — with the focus halo still round that frame while the cursor is in it. The
// configurator's select and fields take the form's focus (a copper border and a 3 px halo) instead of a 2 px copper outline,
// and every field's focus keeps a transparent outline, which forced colours draw.
// The errors are raised by the browser's own check, as a submit runs it: form.checkValidity() fires the fields' invalid
// handlers and nothing is sent. Every test denies the optional cookies and answers any Google request with an empty 200,
// so no tag can load; a request for /api/leads would fail the test.

let leadRequests: string[] = [];

test.beforeEach(async ({ context, isMobile }) => {
  // the windows are set per test, 1440 and 390, as in inquiry-select.spec.ts
  test.skip(isMobile, 'each test sets its own windows');
  leadRequests = [];
  await context.route(/^https:\/\/[^/]*(?:google|doubleclick)[^/]*\//, (route) => route.fulfill({ status: 200, body: '' }));
  await context.route('**/api/leads', (route) => {
    leadRequests.push(route.request().url());
    return route.abort();
  });
  await context.addInitScript(() => {
    localStorage.setItem('rubikon-consent-state', JSON.stringify({ analytics: 'denied', advertising: 'denied' }));
  });
});

test.afterEach(() => {
  expect(leadRequests, 'nothing is sent').toEqual([]);
});

/** /pro-nas: its form starts with no direction chosen, so the select has an error to show as well */
async function openForm(page: Page, width: number, path = '/pro-nas') {
  await page.setViewportSize({ width, height: width < 761 ? 844 : 900 });
  await page.goto(path, { waitUntil: 'load' });
  const form = page.locator('#inquiry form.inquiry-form');
  // the fields are named once the form has hydrated: their invalid handlers are attached by then
  await expect(form.locator('input[name="name"]')).toBeAttached();
  // phones and tablets fold the form behind «Залишити запит»
  const toggle = page.locator('#inquiry .conversation-form-toggle');
  if (await toggle.isVisible()) await toggle.click();
  await expect(form.locator('input[name="name"]')).toBeVisible();
  return form;
}

/** The browser's own check, as a submit would run it, without the submit */
async function raiseErrors(form: Locator) {
  expect(await form.evaluate((element: HTMLFormElement) => element.checkValidity())).toBe(false);
}

/** A computed box-shadow's layers: commas inside rgb() stay with their colour */
function layers(boxShadow: string) {
  return boxShadow === 'none' ? [] : boxShadow.split(/,(?![^(]*\))/).map((layer) => layer.trim());
}

/** A field's border, shadow and outline where its transitions land (getAnimations() brings its style up to date first) */
async function look(field: Locator) {
  return field.evaluate(async (element) => {
    await Promise.all(element.getAnimations().map((animation) => animation.finished.catch(() => undefined)));
    const style = getComputedStyle(element);
    return {
      border: style.borderTopWidth,
      borderColor: style.borderTopColor,
      shadow: style.boxShadow,
      outline: [style.outlineStyle, style.outlineWidth, style.outlineColor].join(' '),
      height: element.getBoundingClientRect().height,
    };
  });
}

async function errorColour(form: Locator) {
  return form.locator('.inquiry-field-error').first().evaluate((message) => getComputedStyle(message).color);
}

/** The halo of a valid field with focus, as the form draws it: the reference for every other field */
async function formHalo(page: Page) {
  const comment = page.locator('#inquiry-comment');
  await comment.focus();
  await expect.poll(async () => layers((await look(comment)).shadow).length).toBe(1);
  const { shadow, borderColor } = await look(comment);
  expect(shadow).toMatch(/ 0px 0px 0px 3px$/);
  await comment.blur();
  return { shadow, borderColor };
}

const FIELDS = ['input[name="name"]', 'input[name="phone"]', 'select[name="direction"]'];

for (const scheme of ['light', 'dark'] as const) {
  test(`${scheme}: every message opens with a «!» mark that is not read out, and an invalid field is framed 2 px without growing`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme });
    for (const width of [1440, 390]) {
      const form = await openForm(page, width);
      const heights = await Promise.all(FIELDS.map(async (selector) => (await look(form.locator(selector))).height));
      await raiseErrors(form);
      // the toggle hands the focus to the first field on a phone: the frame is measured at rest
      await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());

      const messages = form.locator('.inquiry-field-error, .inquiry-consent > small');
      await expect(messages).toHaveCount(4);
      const marks = await messages.evaluateAll((elements) => elements.map((message) => {
        const mark = getComputedStyle(message, '::before');
        const range = document.createRange();
        range.selectNodeContents(message);
        return {
          text: message.textContent,
          content: mark.content,
          size: `${mark.width} × ${mark.height}`,
          round: mark.borderTopLeftRadius,
          disc: mark.backgroundColor,
          glyph: mark.color,
          colour: getComputedStyle(message).color,
          page: getComputedStyle(document.body).backgroundColor,
          // where the words start: after the mark and its gap
          words: range.getClientRects()[0].left - message.getBoundingClientRect().left,
        };
      }));
      for (const mark of marks) {
        const where = `${scheme} ${width}px «${mark.text}»`;
        expect(mark.content, where).toBe('"!" / ""');
        expect(mark.size, where).toBe('14px × 14px');
        expect(mark.round, where).toBe('50%');
        expect(mark.disc, where).toBe(mark.colour);
        expect(mark.glyph, where).toBe(mark.page);
        expect(mark.words, where).toBeGreaterThanOrEqual(20);
      }
      // the message is the field's description, said once: the mark adds nothing to it
      await expect(form.locator('input[name="name"]')).toHaveAccessibleDescription('Вкажіть, як до вас звертатися.');
      await expect(form.locator('input[name="privacyConsent"]')).toHaveAccessibleDescription('Підтвердьте згоду на обробку персональних даних.');

      const error = await errorColour(form);
      for (const [index, selector] of FIELDS.entries()) {
        const field = await look(form.locator(selector));
        const where = `${scheme} ${width}px ${selector}`;
        expect(field.border, where).toBe('1px');
        expect(field.borderColor, where).toBe(error);
        expect(layers(field.shadow), where).toEqual([`${error} 0px 0px 0px 1px inset`]);
        expect(field.height, where).toBe(heights[index]);
      }
    }
  });
}

// The mark costs a message as little room as it can (review 25.10): a field's mark floats on the first line only, as in the
// brief's frame, and the consent's mark stands in the checkbox's column. At 367–386 px the direction message of /pro-nas
// («Оберіть напрям робіт або «Ще не визначено».») runs onto a second line, as it does in the brief's prototype: 375 shows
// that second line starting under the mark. 470 and 820 are where a mark beside the consent's words had pushed them onto
// one more line.
test('the mark takes room on the first line only, no line grows, and the consent\'s words keep their full width', async ({ page }) => {
  for (const width of [375, 470, 820, 1440]) {
    const form = await openForm(page, width);
    await raiseErrors(form);
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    const messages = await form.locator('.inquiry-field-error, .inquiry-consent > small').evaluateAll(async (elements) => {
      // the reduced-motion reset gives a new message's mark a .01ms transition: measure two frames on, where it has landed
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      return elements.map((message) => {
        const range = document.createRange();
        range.selectNodeContents(message);
        const lines = new Map<number, number>();
        for (const rect of range.getClientRects()) {
          if (rect.width === 0) continue;
          const top = Math.round(rect.top);
          lines.set(top, Math.min(lines.get(top) ?? Infinity, rect.left));
        }
        const box = message.getBoundingClientRect();
        const consentText = message.closest('.inquiry-consent')?.querySelector(':scope > span');
        return {
          text: message.textContent,
          consent: !!consentText,
          starts: [...lines.entries()].sort(([a], [b]) => a - b).map(([, left]) => left - box.left),
          textStart: consentText ? consentText.getBoundingClientRect().left - box.left : null,
          height: box.height,
          lineHeight: Number.parseFloat(getComputedStyle(message).lineHeight),
        };
      });
    });
    expect(messages).toHaveLength(4);
    for (const message of messages) {
      const where = `${width}px «${message.text}»`;
      expect(message.height, `${where}: no line grows`).toBeCloseTo(message.starts.length * message.lineHeight, 0);
      if (message.consent) {
        for (const start of message.starts) expect(start, `${where}: the words under the consent's text`).toBeCloseTo(message.textStart ?? -1, 1);
      } else {
        expect(message.starts[0], `${where}: the first line after the mark`).toBeCloseTo(20, 0);
        for (const start of message.starts.slice(1)) expect(start, `${where}: a later line under the mark`).toBeCloseTo(0, 1);
      }
    }
    if (width === 375) expect(messages.filter((message) => !message.consent && message.starts.length > 1), 'a field message on two lines').not.toHaveLength(0);
  }
});

test('an invalid field keeps the focus halo round its frame — marked by the form or found by the browser', async ({ page }) => {
  let form = await openForm(page, 1440);
  const halo = await formHalo(page);
  await raiseErrors(form);
  const error = await errorColour(form);
  for (const selector of FIELDS) {
    const field = form.locator(selector);
    await field.focus();
    await expect.poll(async () => layers((await look(field)).shadow), selector).toEqual([`${error} 0px 0px 0px 1px inset`, halo.shadow]);
    expect((await look(field)).borderColor, selector).toBe(error);
  }

  // edited and left too short, before any check: the browser's own :user-invalid, without the form's mark on the label
  form = await openForm(page, 1440);
  const name = form.locator('input[name="name"]');
  await name.fill('І');
  await name.blur();
  await expect.poll(() => name.evaluate((element) => element.matches(':user-invalid'))).toBe(true);
  await expect(name.locator('xpath=..')).not.toHaveClass(/is-invalid/);
  await expect.poll(async () => layers((await look(name)).shadow)).toEqual([`${error} 0px 0px 0px 1px inset`]);
  await name.focus();
  await expect.poll(async () => layers((await look(name)).shadow)).toEqual([`${error} 0px 0px 0px 1px inset`, halo.shadow]);
});

test('forced colours: the marks stay visible and a field with focus still shows it', async ({ page }) => {
  await page.emulateMedia({ forcedColors: 'active' });
  const form = await openForm(page, 1440);
  await raiseErrors(form);
  const marks = await form.locator('.inquiry-field-error, .inquiry-consent > small').evaluateAll((elements) => elements.map((message) => {
    const mark = getComputedStyle(message, '::before');
    return { text: message.textContent, content: mark.content, disc: mark.backgroundColor, glyph: mark.color, page: getComputedStyle(document.body).backgroundColor };
  }));
  expect(marks).toHaveLength(4);
  for (const mark of marks) {
    expect(mark.content, mark.text ?? '').toBe('"!" / ""');
    expect(mark.disc, mark.text ?? '').not.toBe(mark.page);
    expect(mark.glyph, mark.text ?? '').not.toBe(mark.disc);
  }
  // a valid field and an invalid one: the halo is gone in this mode, the outline is what shows
  for (const selector of ['#inquiry-comment', 'input[name="name"]', 'select[name="direction"]']) {
    const field = page.locator(`#inquiry form.inquiry-form ${selector}`);
    await field.focus();
    const { outline } = await look(field);
    expect(outline, selector).toMatch(/^solid 2px /);
    expect(outline, selector).not.toContain('rgba(0, 0, 0, 0)');
  }
});

/** Focus by the keyboard: back one stop and forward again */
async function tabInto(page: Page, field: Locator) {
  await field.focus();
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Tab');
  await expect(field).toBeFocused();
  expect(await field.evaluate((element) => element.matches(':focus-visible'))).toBe(true);
}

for (const width of [1440, 390]) {
  test(`${width}px /angary: the configurator's select and size fields take the form's focus, not a 2 px copper outline`, async ({ page }) => {
    await openForm(page, width, '/angary');
    const halo = await formHalo(page);
    await openControlGroup(page, 'object');
    const region = page.locator('#hc-object-region');
    await region.scrollIntoViewIfNeeded();
    await tabInto(page, region);
    await expect.poll(async () => (await look(region)).shadow).toBe(halo.shadow);
    const select = await look(region);
    expect(select.borderColor).toBe(halo.borderColor);
    expect(select.outline).toBe('solid 2px rgba(0, 0, 0, 0)');

    await openControlGroup(page, 'dimensions');
    const widthField = page.locator('#hc-dimension-width');
    await tabInto(page, widthField);
    await expect.poll(async () => (await look(widthField)).shadow).toBe(halo.shadow);
    const typed = await look(widthField);
    expect(typed.borderColor).toBe(halo.borderColor);
    expect(typed.outline).toBe('solid 2px rgba(0, 0, 0, 0)');
  });
}

test('forced colours: the configurator\'s select with focus shows an outline', async ({ page }) => {
  await page.emulateMedia({ forcedColors: 'active' });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/angary', { waitUntil: 'load' });
  await openControlGroup(page, 'object');
  const region = page.locator('#hc-object-region');
  await tabInto(page, region);
  const { outline } = await look(region);
  expect(outline).toMatch(/^solid 2px /);
  expect(outline).not.toContain('rgba(0, 0, 0, 0)');
});
