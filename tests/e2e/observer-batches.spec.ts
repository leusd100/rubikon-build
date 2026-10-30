import { expect, test, type Page } from '@playwright/test';

// An IntersectionObserver's reports go out in a task of their own, and on a busy page a frame can get in first: one call
// then holds «out of view, in view» for one target, and no more come until the target leaves (recorded in Chrome, 30.10;
// docs/handoffs/2026-10-30-home-contour-open-flake.md). Reading only the first left a block in its state before arrival
// with the block on the screen. When that task runs cannot be forced, so here the page's own observers keep a target's
// real reports until the test lets them go, in one call: the batch is real, the race is not.

type Held = { heldReports: boolean[]; letReportsGo: () => void };

async function holdReports(page: Page, target: string) {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.context().route(/^https:\/\/[^/]*(?:google|doubleclick)[^/]*\//, (route) => route.fulfill({ status: 200, body: '' }));
  await page.addInitScript((selector) => {
    try {
      localStorage.setItem('rubikon-consent-state', JSON.stringify({ analytics: 'denied', advertising: 'denied' }));
    } catch { /* storage unavailable */ }
    const Native = window.IntersectionObserver;
    const sends: (() => void)[] = [];
    const heldReports: boolean[] = [];
    let holding = true;
    Object.assign(window, { heldReports, letReportsGo: () => { holding = false; sends.splice(0).forEach((send) => send()); } });
    window.IntersectionObserver = class extends Native {
      constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
        const reports: IntersectionObserverEntry[] = [];
        super((entries, observer) => {
          if (!holding || !entries[0].target.matches(selector)) {
            callback(entries, observer);
            return;
          }
          // From the first «out of view»: a hero is still in view when it is first watched, if the jump to the anchor comes later
          const first = reports.length ? 0 : entries.findIndex((entry) => !entry.isIntersecting);
          if (first < 0) return;
          if (!reports.length) sends.push(() => callback(reports, observer));
          reports.push(...entries.slice(first));
          heldReports.push(...entries.slice(first).map((entry) => entry.isIntersecting));
        }, options);
      }
    };
  }, target);
}

const held = (page: Page) => page.evaluate(() => (window as unknown as Held).heldReports);
const letGo = (page: Page) => page.evaluate(() => (window as unknown as Held).letReportsGo());
const centre = (page: Page, selector: string) => page.locator(selector).first().evaluate((element) => element.scrollIntoView({ block: 'center', behavior: 'instant' }));
const scrollTop = (page: Page) => page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));

/** Out of view, then in view, all of it still in the browser's hands as far as the page can tell */
async function reachInOneCall(page: Page, target: string, into = target) {
  await expect.poll(() => held(page)).toContainEqual(false);
  await centre(page, into);
  await expect.poll(() => held(page)).toContainEqual(true);
}

type Site = {
  site: string;
  path: string;
  target: string;
  /** Where to scroll, where it is not the target itself */
  into?: string;
  /** Scroll here rather than to the target: the hero is in view only at the top */
  top?: boolean;
  /** A wide screen's behaviour: these tours are off at ≤ 1050 px or ≤ 760 px, and a phone's hero has no video */
  wide?: boolean;
  armed?: (page: Page) => Promise<void>;
  arrived: (page: Page) => Promise<void>;
};

const SITES: Site[] = [
  {
    site: 'GrainComplexBuilder',
    path: '/zernoskhovyshcha',
    target: '#kompleks .gc-scroll',
    armed: (page) => expect(page.locator('#kompleks .gc')).toHaveAttribute('data-gc', 'armed'),
    arrived: async (page) => {
      await expect(page.locator('#kompleks .gc')).not.toHaveAttribute('data-gc', 'armed');
      await expect(page.locator('#kompleks .gc')).toHaveAttribute('data-inview', '');
    },
  },
  {
    site: 'ScopeCells',
    path: '/',
    target: '#real-object .hv2-scope-chips',
    armed: (page) => expect(page.locator('#real-object .hv2-scope-chips')).toHaveAttribute('data-draw', 'armed'),
    arrived: (page) => expect(page.locator('#real-object .hv2-scope-chips')).toHaveAttribute('data-draw', /^(on|done)$/),
  },
  {
    site: 'useFirstViewBuildUp',
    path: '/angary',
    target: '#configurator .sheet',
    into: '#configurator .hc-preview-sheet',
    armed: (page) => expect(page.locator('#configurator .hc-preview-image')).toHaveAttribute('data-build', 'armed'),
    arrived: (page) => expect(page.locator('#configurator .hc-preview-image')).not.toHaveAttribute('data-build', 'armed'),
  },
  {
    site: 'CapabilityFigure',
    path: '/pro-nas',
    target: '.about-cap .cap-fig',
    arrived: (page) => expect(page.locator('.about-cap li[data-on]')).toHaveCount(1),
  },
  {
    site: 'CostFactorsFigure',
    path: '/yak-pratsyuiemo',
    target: '.proc-factors',
    arrived: (page) => expect(page.locator('.proc-factors')).toHaveAttribute('data-active', /./),
  },
  {
    site: 'ChangeSheets',
    path: '/yak-pratsyuiemo',
    target: '.cs',
    wide: true,
    arrived: (page) => expect(page.locator('.cs')).toHaveAttribute('data-reached', /1/),
  },
  {
    site: 'FormatsScope',
    path: '/yak-pratsyuiemo',
    target: '#obsiah .dfmt-figure',
    wide: true,
    arrived: async (page) => {
      await expect(page.locator('#obsiah .dfmt-figure')).toHaveAttribute('data-live', 'true');
      await expect(page.locator('#obsiah svg.fs')).toHaveAttribute('data-format', 'work-package');
    },
  },
  {
    site: 'useDrawingTour',
    path: '/metalokonstruktsii',
    target: '.dn-section .dn-visual',
    arrived: (page) => expect(page.locator('.dn-section').getByRole('button', { name: 'Пауза показу вузла', exact: true })).toBeVisible(),
  },
  {
    site: 'useDeferredMedia',
    path: '/#real-object',
    target: 'video.direction-hero-video',
    top: true,
    wide: true,
    // Starts visible, so the clip is already playing while the reports are held: the stale «out of view» would pause it
    arrived: async (page) => {
      await page.evaluate(() => new Promise((settled) => { requestAnimationFrame(() => requestAnimationFrame(settled)); }));
      await expect.poll(() => page.locator('video.direction-hero-video').evaluateAll((videos) => videos.some((video) => !(video as HTMLVideoElement).paused))).toBe(true);
    },
  },
];

for (const { site, path, target, into, top, wide, armed, arrived } of SITES) {
  test(`${site}: a target reported «out of view, in view» in one call has arrived`, async ({ page }) => {
    if (wide) await page.setViewportSize({ width: 1440, height: 900 });
    await holdReports(page, target);
    await page.goto(path, { waitUntil: 'load' });
    await armed?.(page);
    if (top) {
      await expect.poll(() => held(page)).toContainEqual(false);
      await scrollTop(page);
      await expect.poll(() => held(page)).toContainEqual(true);
    } else {
      await reachInOneCall(page, target, into);
    }
    await letGo(page);
    await arrived(page);
  });
}

// Passed straight through: the visitor was there, so the arrival holds, but what is true now is «out of view»
test('GrainComplexBuilder: a drawing passed in one call has arrived and does not count as in view', async ({ page }) => {
  await holdReports(page, '#kompleks .gc-scroll');
  await page.goto('/zernoskhovyshcha', { waitUntil: 'load' });
  const builder = page.locator('#kompleks .gc');
  await expect(builder).toHaveAttribute('data-gc', 'armed');
  await reachInOneCall(page, '#kompleks .gc-scroll');
  await scrollTop(page);
  await expect.poll(async () => (await held(page)).at(-1)).toBe(false);
  await letGo(page);
  await expect(builder).not.toHaveAttribute('data-gc', 'armed');
  await expect(builder).not.toHaveAttribute('data-inview');
});

test('FormatsScope: a block passed in one call still walks and does not count as on screen', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await holdReports(page, '#obsiah .dfmt-figure');
  await page.goto('/yak-pratsyuiemo', { waitUntil: 'load' });
  await reachInOneCall(page, '#obsiah .dfmt-figure');
  await scrollTop(page);
  await expect.poll(async () => (await held(page)).at(-1)).toBe(false);
  await letGo(page);
  await expect(page.locator('#obsiah svg.fs')).toHaveAttribute('data-format', 'work-package');
  await expect(page.locator('#obsiah .dfmt-figure')).not.toHaveAttribute('data-live');
});
