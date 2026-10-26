import { expect, test, type Page } from '@playwright/test';

// W2-01 · the /angary route «Ви · Ми» on a phone (owner 24.10: PDO-11 A). Up to 760 px it takes the other direction
// pages' phone layout: each step's drawing beside its title and outcome, «Ви» / «Ми» leading their lines, and 01's brief
// action under its sentence in «Ви», clear of the drawing, before and after the brief is attached. From 761 px nothing
// changes. Every test denies the optional cookies and answers any Google request with an empty 200, so no tag can load.

test.beforeEach(async ({ context, isMobile }) => {
  test.skip(isMobile, 'each test sets its own windows');
  await context.route(/^https:\/\/[^/]*(?:google|doubleclick)[^/]*\//, (route) => route.fulfill({ status: 200, body: '' }));
  await context.addInitScript(() => {
    localStorage.setItem('rubikon-consent-state', JSON.stringify({ analytics: 'denied', advertising: 'denied' }));
  });
});

async function open(page: Page, width: number, height = 844) {
  await page.setViewportSize({ width, height });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/angary', { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
}

const steps = (page: Page) => page.locator('#process .angary-route > li');

/** Each step: its drawing beside its title or on a row of its own, every text shown, the drawing inside the shell, and
 *  how «Ви» / «Ми» stand (inline before their line, or a block over it) */
const layout = (page: Page) => steps(page).evaluateAll((items) => items.map((item) => {
  const box = (selector: string) => item.querySelector(selector)!.getBoundingClientRect();
  const [title, node, you, we, result] = ['h3', '.ps-node', '.ps-you', '.ps-we', '.ps-result'].map(box);
  const shell = item.closest('.shell')!.getBoundingClientRect();
  return {
    beside: node.left >= title.right - 1 && node.top < title.bottom,
    ownRow: node.top >= you.bottom - 1,
    texts: [you, we, result].every((rect) => rect.height > 0 && rect.width > 0),
    inside: node.right <= shell.right + 0.5,
    labels: [...item.querySelectorAll(':is(.ps-you, .ps-we) > small')].map((label) => getComputedStyle(label).display),
  };
}));

/** 01's action: its height, whether it stands inside «Ви», and whether it and 01's words keep clear of the drawing */
const briefAction = (page: Page) => steps(page).first().evaluate((item) => {
  const link = item.querySelector('.angary-route-brief-action')!.getBoundingClientRect();
  const you = item.querySelector('.ps-you')!.getBoundingClientRect();
  const drawing = item.querySelector('.ps-node .pd')!.getBoundingClientRect();
  const apart = (rect: DOMRect) => rect.right <= drawing.left || rect.left >= drawing.right || rect.bottom <= drawing.top || rect.top >= drawing.bottom;
  const words = [...item.querySelectorAll('h3, .ps-you > span, .ps-result')].map((element) => element.getBoundingClientRect());
  return { height: link.height, inYou: link.top >= you.top - 0.5 && link.bottom <= you.bottom + 0.5, clear: [link, ...words].every(apart) };
});

test.describe('/angary · «Ви · Ми» on a phone (PDO-11 A)', () => {
  test('each of the five steps has its drawing beside its title, «Ви» and «Ми» lead their lines, every word stays', async ({ page }) => {
    for (const width of [320, 390]) {
      await open(page, width);
      await expect(steps(page)).toHaveCount(5);
      for (const [index, step] of (await layout(page)).entries()) {
        expect({ beside: step.beside, texts: step.texts, inside: step.inside, labels: step.labels }, `${width}px, step ${index + 1}`)
          .toEqual({ beside: true, texts: true, inside: true, labels: ['inline', 'inline'] });
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), `${width}px`).toBeLessThanOrEqual(1);
    }
  });

  test('01\'s brief action stays in «Ви», at least 44 px tall and clear of the drawing, before and after the brief is attached', async ({ page }) => {
    await open(page, 390);
    const first = steps(page).first();
    await expect(first.getByRole('link')).toHaveText('Сформувати бриф');
    let action = await briefAction(page);
    expect(action.height).toBeGreaterThanOrEqual(44);
    expect(action).toMatchObject({ inYou: true, clear: true });

    // «Обговорити цю конфігурацію» attaches the brief (it opens the form, sends nothing): 01's «Ви» gets the longer line
    await page.locator('.hc-summary').getByRole('link', { name: /Обговорити цю конфігурацію/ }).click();
    await expect(page.locator('#process ol')).toHaveAttribute('data-brief', 'attached');
    await expect(first.locator('.ps-you')).toContainText('Додано до заявки:');
    await expect(first.getByRole('link')).toHaveText(/^Надіслати бриф/);
    action = await briefAction(page);
    expect(action.height).toBeGreaterThanOrEqual(44);
    expect(action).toMatchObject({ inYou: true, clear: true });
  });

  test('from 761 px each step keeps its drawing on a row of its own, under «Ви»', async ({ page }) => {
    for (const width of [761, 768]) {
      await open(page, width, 1024);
      for (const [index, step] of (await layout(page)).entries()) {
        expect({ ownRow: step.ownRow, labels: step.labels }, `${width}px, step ${index + 1}`).toEqual({ ownRow: true, labels: ['block', 'block'] });
      }
    }
  });
});
