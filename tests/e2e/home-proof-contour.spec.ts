import { expect, test, type Locator, type Page } from '@playwright/test';
import { homeProofContour } from '../../app/data/homeProofContour';
import { homeProofFrame } from '../../app/data/homeProofFrame';
import { homeProofMeasures } from '../../app/data/homeProofMeasures';

// HOME's proof (owner, 04.10): one «Креслення» sheet, the photo left of a seam and right of it its tracing with one of
// three layers chosen in the title block — «Контур» (the lines and figures measured from the photos), «Каркас» (the
// default: a SCHEME of a frame of this object's type in its silhouette, labelled so) and «Навантаження» (the snow's way
// through that scheme). The seam is a real range input (keys, screen readers); a mouse drags anywhere in the frame, a
// finger only the handle, and on a phone «Фото» / «Схема» show one side whole. «Контур на фото» lays the measured lines
// — and only those — over the photo too. Arriving with motion, the sheet plots in as a whole photo and the seam sweeps
// once from the right edge across the gable and back to rest («шов-плотер»); without motion or JavaScript the sheet
// stands complete. On a laptop the whole sheet fits under the header.
// The review of 04.10 added: the sweep still plays when the visitor arrives by the wheel or a swipe; the right side's
// words (the stamp, the load's chain) lie on it only; no name on the frame covers another or runs off it; the load is
// never drawn in the measured copper. The owner's review of 04.10 added: a dragged seam snaps to the measured verticals
// and names them; the load is a drawing's comb of arrows and lines on a casing, weight rather than a glow.

const DEFAULT_SPLIT = 62;
// The first view's sweep (ProofContour): SWEEP_AT after the sheet arrives, once the page has been quiet SWEEP_QUIET, from
// the right edge to SWEEP_TURN and back to rest over SWEEP_MS (SWEEP_MS_PHONE on a phone)
const SWEEP_AT = 1050;
const SWEEP_QUIET = 250;
const SWEEP_TURN = 15;
const SWEEP_MS = 3000;
const SWEEP_MS_PHONE = 2200;
// Snapping, in per cent of the frame: a dragged seam is caught within GRAB of a measured line and let go beyond RELEASE
const SNAP_GRAB = 0.8;
const SNAP_RELEASE = 1.4;
const lineOf = (id: string) => homeProofContour.lines.find((line) => line.id === id)!;
/** A measured vertical's mean x, in per cent of the frame: where the seam snaps */
const meanX = (id: string, from: number, to?: number) => {
  const part = lineOf(id).points.slice(from, to);
  return (part.reduce((sum, [x]) => sum + x, 0) / part.length / homeProofContour.photo.width) * 100;
};
// What the seam snaps to: the gates' jambs and the gable's corners — never the ridge, which nobody measured. Its words say
// «наближено» exactly where the line is approximate
const SNAPS = [
  { line: 'gable-base', at: meanX('gable-base', 1), name: 'Лівий кут фронтона' },
  { line: 'gate-left', at: meanX('gate-left', 0, 2), name: 'Ліві ворота, одвірок' },
  { line: 'gate-left', at: meanX('gate-left', 2), name: 'Ліві ворота, одвірок' },
  { line: 'gate-right', at: meanX('gate-right', 0, 2), name: 'Праві ворота, одвірок' },
  { line: 'gate-right', at: meanX('gate-right', 2), name: 'Праві ворота, одвірок' },
  { line: 'gable-corner-right', at: meanX('gable-corner-right', 2), name: 'Правий кут фронтона' },
].map((snap) => ({ ...snap, status: lineOf(snap.line).approximate ? 'наближено' : 'виміряно' }));
/** The seam's place in tenths of a per cent, as the stage's --split carries it */
const tenths = (value: number) => `${Math.round(value * 10) / 10}%`;
const SLIDER = /^Порівняти фото й (?:схему|контур за фото|ескіз)$/;
// Words that claim more than a photo and a scheme can give. «Не креслення цього ангара» — the scheme saying what it is
// not — stays allowed by the look-behind.
const FORBIDDEN = /digital\s*twin|двійник|3\s*d\b|тривимір|модел|точн|обмір|x-?ray|рентген|(?<!не\s)креслення\s+(?:цього|ангара)|конструкція цього ангара|паспорт|load\s*path|explorer|наш каркас/i;
// No length, area, mass or level anywhere on the sheet: the photos give no scale
const UNITS = /\d\s*(?:мм|см|м|км|м²|кг|т)(?![а-яіїєґʼ’])|метр|відмітк|[+−]\d|\d\.\d/iu;
const COPPER = 'rgb(204, 132, 85)';
const PAPER = 'rgb(237, 232, 222)';

async function open(page: Page, path = '/') {
  await page.route(/\.mp4(?:\?|$)/, (route) => route.abort());
  await page.addInitScript(() => {
    try {
      localStorage.setItem('rubikon-consent-state', JSON.stringify({ analytics: 'denied', advertising: 'denied' }));
    } catch { /* storage unavailable */ }
  });
  await page.goto(path, { waitUntil: 'load' });
  const sheet = page.locator('#real-object .hv2-contour');
  await sheet.scrollIntoViewIfNeeded();
  await page.waitForFunction(() => [...document.querySelectorAll('.hv2-contour img')].every((image) => (image as HTMLImageElement).complete && (image as HTMLImageElement).naturalWidth > 0));
  // With motion the picture is still being plotted in for a second, clipped, and a clipped frame takes no pointer; then
  // the seam sweeps for three more. The tests here start from the sheet at rest (the arrival has tests of its own)
  await page.waitForFunction(() => {
    const figure = document.querySelector<HTMLElement>('.hv2-contour');
    const image = figure?.querySelector('.sheet-image');
    if (!figure || !image || figure.dataset.sheetState === 'armed' || figure.querySelector('.hv2-contour-stage[data-sweep]')) return false;
    return image.getAnimations().every((animation) => animation.playState === 'finished');
  });
  const slider = sheet.getByRole('slider', { name: SLIDER });
  // The controls come alive with hydration
  await expect(slider).toBeEnabled();
  return { sheet, stage: sheet.locator('.hv2-contour-stage'), slider, layers: sheet.getByRole('group', { name: 'Що показати праворуч' }) };
}

/** The keyboard's focus ring, drawn on the handle's disc */
const ringOf = (stage: Locator) => stage.locator('.hv2-contour-handle').evaluate((element) => getComputedStyle(element, '::before').outlineStyle);

async function touchDrag(page: Page, from: { x: number; y: number }, to: { x: number; y: number }, steps = 10) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [from] });
  for (let step = 1; step <= steps; step += 1) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: from.x + ((to.x - from.x) * step) / steps, y: from.y + ((to.y - from.y) * step) / steps }] });
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}

/** A screenshot of the region once two in a row agree (the photo may still be painting after it has loaded) */
async function steadyShot(page: Page, clip: { x: number; y: number; width: number; height: number }) {
  let previous = await page.screenshot({ clip });
  for (let attempt = 0; attempt < 6; attempt += 1) {
    await page.waitForTimeout(150);
    const next = await page.screenshot({ clip });
    if (next.equals(previous)) return next;
    previous = next;
  }
  return previous;
}

/** How many pixels of two shots of one region differ by more than `threshold` in a channel. Re-compositing the stage (a
 *  layer shown or hidden) re-rasters the photo on a phone's fractional pixel ratio with ±1 noise across it and, rarely,
 *  a speck or two more; a line of the scheme or the contour on it is hundreds of pixels (review, 04.10: the exact
 *  comparison failed 1 run in 8 already before) */
const SPECKS = 20;
async function differing(page: Page, a: Buffer, b: Buffer, threshold = 40) {
  // Decoded on a blank page of its own: the site's CSP keeps data: URLs out of fetch
  const scratch = await page.context().newPage();
  const count = await scratch.evaluate(async ([first, second, limit]) => {
    const pixels = async (data: string) => {
      const image = await createImageBitmap(await (await fetch(`data:image/png;base64,${data}`)).blob());
      const canvas = new OffscreenCanvas(image.width, image.height);
      const context = canvas.getContext('2d')!;
      context.drawImage(image, 0, 0);
      return context.getImageData(0, 0, image.width, image.height).data;
    };
    const [x, y] = await Promise.all([pixels(first as string), pixels(second as string)]);
    let count = 0;
    for (let index = 0; index < x.length; index += 4) {
      if (Math.max(Math.abs(x[index] - y[index]), Math.abs(x[index + 1] - y[index + 1]), Math.abs(x[index + 2] - y[index + 2])) > (limit as number)) count += 1;
    }
    return count;
  }, [a.toString('base64'), b.toString('base64'), threshold] as const);
  await scratch.close();
  return count;
}

/** Where the seam stands, in per cent of the frame */
async function seamAt(stage: Locator) {
  return stage.evaluate((element) => {
    const frame = element.getBoundingClientRect();
    const seam = element.querySelector('.hv2-contour-seam')!.getBoundingClientRect();
    return ((seam.left + seam.width / 2 - frame.left) / frame.width) * 100;
  });
}

/** The words on the stage that cover one another or run off the frame: the figures, the scheme's names, the stamp, the
 *  chain, the seam's names and, while a dragged seam holds a line, that line's name. What lies right of the seam is
 *  clipped there, so only its visible part counts — but `atRest` (the seam where it rests) a figure or a name cut by the
 *  seam counts too, and so does the handle */
async function clashes(stage: Locator, atRest = false) {
  return stage.evaluate((element, rest) => {
    const frame = element.getBoundingClientRect();
    const split = parseFloat(getComputedStyle(element).getPropertyValue('--split'));
    const seam = frame.left + (frame.width * split) / 100;
    const shown = (node: Element) => {
      for (let at: Element | null = node; at && at !== element; at = at.parentElement) {
        const style = getComputedStyle(at);
        if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) < 0.05) return false;
      }
      return true;
    };
    const boxes: { name: string; left: number; right: number; top: number; bottom: number; cut: number; seamCut: number }[] = [];
    const add = (node: Element | null, name: string, rightSide: boolean) => {
      if (!node || !shown(node)) return;
      const box = node.getBoundingClientRect();
      const left = Math.max(rightSide ? seam : frame.left, box.left, frame.left);
      const right = Math.min(box.right, frame.right);
      if (right - left < 2) return;
      const cut = Math.max(frame.left - box.left, box.right - frame.right, frame.top - box.top, box.bottom - frame.bottom);
      const seamCut = rightSide && /^(?:figure|name) /.test(name) ? seam - box.left : 0;
      boxes.push({ name, left, right, top: Math.max(box.top, frame.top), bottom: Math.min(box.bottom, frame.bottom), cut, seamCut });
    };
    for (const node of element.querySelectorAll<HTMLElement>('.hv2-proof-measure')) add(node, `figure ${node.dataset.measure}`, true);
    for (const node of element.querySelectorAll<HTMLElement>('.hv2-proof-tag')) add(node, `name ${node.dataset.tag}`, true);
    add(element.querySelector('.hv2-contour-stamp'), 'stamp', true);
    add(element.querySelector('.hv2-contour-chain'), 'chain', true);
    const [left, right] = element.querySelectorAll('.hv2-contour-seamtags > span');
    add(left, '‹ Фото', false);
    add(right, 'seam name right', false);
    // faded out (opacity 0) while no line is held
    add(element.querySelector('.hv2-contour-snap'), 'snapped line’s name', false);
    if (rest) add(element.querySelector('.hv2-contour-handle'), 'handle', false);
    const found: string[] = [];
    for (const [index, a] of boxes.entries()) {
      if (a.cut > 1 && !a.name.startsWith('‹') && a.name !== 'seam name right') found.push(`${a.name} runs off the frame by ${Math.round(a.cut)} px`);
      if (rest && a.seamCut > 1) found.push(`${a.name} cut by the resting seam by ${Math.round(a.seamCut)} px`);
      for (const b of boxes.slice(index + 1)) {
        const x = Math.min(a.right, b.right) - Math.max(a.left, b.left);
        const y = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
        if (x > 1 && y > 1) found.push(`${a.name} × ${b.name}`);
      }
    }
    return found;
  }, atRest);
}

async function expectSplit(slider: Locator, stage: Locator, value: number) {
  await expect(slider).toHaveValue(String(value));
  await expect.poll(() => seamAt(stage)).toBeCloseTo(value, 0);
}

/** Moves the seam by the keys (they work the same on every project) */
async function splitTo(page: Page, slider: Locator, value: number) {
  await slider.focus();
  await page.keyboard.press('Home');
  for (let step = 0; step < Math.floor(value / 10); step += 1) await page.keyboard.press('PageUp');
  for (let step = 0; step < value % 10; step += 1) await page.keyboard.press('ArrowRight');
  await expect(slider).toHaveValue(String(value));
}

/** The page as a visitor reaches it with motion: the consent answered, the sheet below the fold, hydrated and armed */
async function arrive(page: Page) {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.route(/\.mp4(?:\?|$)/, (route) => route.abort());
  await page.addInitScript(() => {
    try {
      localStorage.setItem('rubikon-consent-state', JSON.stringify({ analytics: 'denied', advertising: 'denied' }));
    } catch { /* storage unavailable */ }
  });
  await page.goto('/', { waitUntil: 'load' });
  const sheet = page.locator('#real-object .hv2-contour');
  const range = sheet.locator('.hv2-contour-range');
  await expect(range).toBeEnabled();
  return { sheet, stage: sheet.locator('.hv2-contour-stage'), range };
}

/** One frame of the first view as the page drew it: the stage's data-sweep, data-gliding and data-pulse; its --split and
 *  where the seam is drawn, how far the tracing and the scheme are uncovered (per cent); the range's value; the figures'
 *  and the names' opacity; whether the picture is still plotting in; the handle's rings; whatever else animates on the
 *  stage */
type Frame = {
  t: number; sweep: string | null; gliding: boolean; pulse: boolean; split: number; seam: number; trace: number; scheme: number;
  range: string; words: number[]; plotting: boolean; rings: string; others: string[];
};
/** The frames, and when the sheet arrived, the sweep started and the seam stopped waiting or sweeping, and the page
 *  scrolled */
type Arrival = { frames: Frame[]; on: number | null; run: number | null; ended: number | null; scrolls: number[]; done: boolean };

/** Records every frame of the first view in the page itself — a test's polls are too far apart for a three-second
 *  sweep — until 2.5 s after the seam stops waiting or sweeping (the rings have rung by then) */
async function recordArrival(page: Page) {
  await page.evaluate(() => {
    const stage = document.querySelector<HTMLElement>('#real-object .hv2-contour-stage')!;
    const sheet = stage.closest('figure')!;
    const image = sheet.querySelector('.sheet-image')!;
    const handle = stage.querySelector('.hv2-contour-handle')!;
    const arrival = { frames: [] as unknown[], on: null as number | null, run: null as number | null, ended: null as number | null, scrolls: [] as number[], done: false };
    Object.assign(window, { arrival });
    new MutationObserver(() => {
      const now = performance.now();
      if (arrival.on === null && sheet.dataset.sheetState === 'on') arrival.on = now;
      if (arrival.run === null && stage.dataset.sweep === 'run') arrival.run = now;
      if (arrival.ended === null && arrival.on !== null && stage.dataset.sweep === undefined) arrival.ended = now;
    }).observe(sheet, { attributes: true, subtree: true, attributeFilter: ['data-sheet-state', 'data-sweep'] });
    addEventListener('scroll', () => arrival.scrolls.push(performance.now()), { passive: true });
    const inset = (selector: string) => parseFloat(getComputedStyle(stage.querySelector(selector)!).clipPath.split(' ').at(-1) ?? '');
    const opacity = (selector: string) => Number(getComputedStyle(stage.querySelector(selector)!).opacity);
    const tick = () => {
      const frame = stage.getBoundingClientRect();
      const seam = stage.querySelector('.hv2-contour-seam')!.getBoundingClientRect();
      const rings = getComputedStyle(handle, '::after');
      arrival.frames.push({
        t: performance.now(),
        sweep: stage.dataset.sweep ?? null,
        gliding: stage.dataset.gliding !== undefined,
        pulse: stage.dataset.pulse !== undefined,
        split: parseFloat(getComputedStyle(stage).getPropertyValue('--split')),
        seam: ((seam.left + seam.width / 2 - frame.left) / frame.width) * 100,
        trace: inset('.hv2-contour-trace'),
        scheme: inset('svg.hv2-proof-frame'),
        range: stage.querySelector<HTMLInputElement>('.hv2-contour-range')!.value,
        words: [opacity('.hv2-proof-labels'), opacity('svg.hv2-proof-marks')],
        plotting: image.getAnimations().some((animation) => animation.playState === 'running'),
        rings: `${rings.animationName} ${rings.animationIterationCount}`,
        others: document.getAnimations().filter((animation) => {
          const target = (animation.effect as KeyframeEffect | null)?.target;
          return target && target !== stage && stage.contains(target);
        }).map((animation) => (animation as CSSAnimation).animationName ?? (animation as CSSTransition).transitionProperty ?? 'script'),
      });
      if ((arrival.ended !== null && performance.now() - arrival.ended > 2500) || arrival.frames.length > 3000) arrival.done = true;
      else requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

async function arrivalOf(page: Page) {
  await page.waitForFunction(() => (window as unknown as { arrival: Arrival }).arrival.done, undefined, { timeout: 20_000 });
  return page.evaluate(() => (window as unknown as { arrival: Arrival }).arrival);
}

test('the sheet names both sides, states the retouch and what the scheme is, and carries every measured line', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const { sheet, stage, layers } = await open(page);
  const stamp = sheet.locator('figcaption');
  for (const words of ['Ліворуч', 'Фото об’єкта', 'Праворуч', 'виміряно', 'наближено', 'схема', 'Реальний об’єкт: фото, виміри, схема.', 'Фото з ретушшю переднього плану']) {
    await expect(stamp).toContainText(words);
  }
  const note = stamp.locator('.sheet-cell-note');
  for (const words of ['за вісьмома фото цього ангара', 'без масштабу', 'Креслень саме цього ангара в нас немає', 'схемою', 'такого типу, як на цьому об’єкті', 'без розмірів']) {
    await expect(note).toContainText(words);
  }
  // The layers: «Каркас» is the default, and the frame says what its right side is — a scheme, without sizes
  await expect(layers.getByRole('button')).toHaveText(['Контур', 'Каркас', 'Навантаження']);
  await expect(layers.getByRole('button', { name: 'Каркас' })).toHaveAttribute('aria-pressed', 'true');
  await expect(stage.locator('.hv2-contour-stamp')).toHaveText(/Схема · без розмірів\s*каркас такого типу, як на цьому об’єкті/);
  await expect(stage.locator('.hv2-contour-canvas > picture img')).toHaveAttribute('src', homeProofContour.photo.src);

  // The lines: one per record, the approximate ones dashed, each with its words, in the photo's own pixels
  const lines = stage.locator('svg.hv2-contour-lines .hv2-contour-ink path');
  await expect(lines).toHaveCount(homeProofContour.lines.length);
  expect(await lines.evaluateAll((paths) => paths.map((path) => path.getAttribute('data-line')))).toEqual(homeProofContour.lines.map((line) => line.id));
  await expect(stage.locator('.hv2-contour-ink path[data-approximate]')).toHaveCount(homeProofContour.lines.filter((line) => line.approximate).length);
  // …solid on the scheme's layers (owner, 04.10: one outline there), dashed in «Контур», where the legend reads them
  for (const path of await stage.locator('.hv2-contour-ink path[data-approximate]').all()) {
    expect(await path.evaluate((element) => getComputedStyle(element).strokeDasharray)).toBe('none');
  }
  await layers.getByRole('button', { name: 'Контур' }).click();
  for (const path of await stage.locator('.hv2-contour-ink path[data-approximate]').all()) {
    expect(await path.evaluate((element) => getComputedStyle(element).strokeDasharray)).toMatch(/^[\d.]+px,? [\d.]+px$/);
  }
  await layers.getByRole('button', { name: 'Каркас' }).click();
  for (const svg of ['svg.hv2-contour-lines', 'svg.hv2-proof-frame', 'svg.hv2-proof-marks']) {
    await expect(stage.locator(svg)).toHaveAttribute('viewBox', `0 0 ${homeProofContour.photo.width} ${homeProofContour.photo.height}`);
  }
  // Under role="img" the lines' own titles reach no one: the accessible names say which lines are approximate, and
  // what the scheme is and is not
  await expect(stage.getByRole('img', { name: homeProofContour.label })).toBeVisible();
  await expect(stage.getByRole('img', { name: homeProofFrame.label })).toBeVisible();
  // …and the figures, drawn for the eye, are a list for a screen reader
  await expect(stage.getByRole('list', { name: 'Виміряно за фото, без масштабу' }).getByRole('listitem')).toHaveText(homeProofMeasures.map((measure) => measure.spoken));

  // Figures only where something was measured, each with its sign; never a size; none of the words that claim more
  const text = await sheet.evaluate((element) => element.textContent ?? '');
  const outsideMeasures = await sheet.evaluate((element) => {
    const copy = element.cloneNode(true) as HTMLElement;
    for (const measure of copy.querySelectorAll('[data-measure]')) measure.remove();
    return copy.textContent ?? '';
  });
  expect(outsideMeasures).not.toMatch(/\d/);
  for (const figure of await sheet.locator('[data-measure]').allTextContents()) {
    for (const match of figure.matchAll(/\d+(?:,\d+)?/g)) expect(figure.slice(0, match.index), figure).toMatch(/(?:[≈±] |приблизно |похибка )$/);
  }
  expect(text).not.toMatch(UNITS);
  expect(homeProofContour.label).not.toMatch(/\d/);
  expect(homeProofFrame.label).not.toMatch(/\d/);
  await expect(stage.getByRole('slider', { name: SLIDER })).toHaveAttribute('aria-valuetext', 'Фото ліворуч, схема праворуч: більше фото');
  for (const words of [await sheet.innerText(), text, homeProofFrame.label, await page.locator('#real-object').evaluate((element) => element.textContent ?? '')]) {
    expect(words).not.toMatch(FORBIDDEN);
  }
});

test('the scheme is its own layer: its gable plane paper-white, what stands behind it copper, never dashed, and always under its stamp', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const { stage, slider } = await open(page);
  const scheme = stage.locator('svg.hv2-proof-frame[data-layer="scheme"]');
  await expect(scheme).toBeVisible();
  // Every member of the scheme is in it and none carries the measured lines' «approximate» mark. The gable's own plane is
  // paper-white; what stands behind it is copper, solid (owner, 04.10), and only behind it
  await expect(scheme.locator('[data-group]')).toHaveCount(homeProofFrame.members.filter((member) => member.group !== 'footing').length);
  await expect(scheme.locator('[data-approximate]')).toHaveCount(0);
  await expect(stage.locator('.hv2-contour-lines [data-group]')).toHaveCount(0);
  const strokes = new Set(await scheme.locator('.hv2-proof-scheme [data-group]:not([data-hidden])').evaluateAll((paths) => paths.map((path) => getComputedStyle(path).stroke)));
  expect([...strokes]).toEqual([PAPER]);
  expect(await stage.locator('.hv2-contour-ink path').first().evaluate((path) => getComputedStyle(path).stroke)).toBe(COPPER);
  const hidden = scheme.locator('.hv2-proof-scheme [data-hidden]');
  await expect(hidden).toHaveCount(homeProofFrame.members.filter((member) => member.hidden).length);
  expect(new Set(await hidden.evaluateAll((paths) => paths.map((path) => getComputedStyle(path).stroke)))).toEqual(new Set([COPPER]));
  expect(new Set(await scheme.locator('.hv2-proof-scheme [data-group]').evaluateAll((paths) => paths.map((path) => getComputedStyle(path).strokeDasharray)))).not.toContainEqual(expect.stringMatching(/px,? [\d.]+px$/));
  expect(await hidden.evaluateAll((paths) => paths.every((path) => Number(path.getAttribute('data-depth')) > 0))).toBe(true);
  // Line weights on a drawing's scale (owner, 04.10): the measured outline heaviest; the gable's chords, its columns and
  // what the section cuts one step down; its webs another; the blockwork finest. Square ends and sharp joins, as a
  // plotter draws them (the outline's approximate pieces are the «Контур» layer's to tell apart)
  const weight = (selector: string) => stage.locator(selector).first().evaluate((element) => parseFloat(getComputedStyle(element).strokeWidth));
  const outline = await weight('.hv2-contour-ink path[data-kind="outline"]:not([data-approximate])');
  const chord = await weight('.hv2-proof-scheme [data-group="truss"][data-depth="0"]');
  const web = await weight('.hv2-proof-scheme [data-group="web"][data-depth="0"]');
  expect(outline).toBeGreaterThan(chord);
  for (const selector of ['.hv2-proof-scheme [data-group="column"][data-depth="0"]', '.hv2-proof-cut']) expect(await weight(selector), selector).toBe(chord);
  expect(chord).toBeGreaterThan(web);
  expect(web).toBeGreaterThan(await weight('.hv2-proof-blocks'));
  const ends = await stage.locator('.hv2-proof-scheme [data-group], .hv2-contour-ink path:not([data-approximate], [data-kind="outline"])').evaluateAll((paths) => paths.map((path) => `${getComputedStyle(path).strokeLinecap} ${getComputedStyle(path).strokeLinejoin}`));
  expect(new Set(ends)).toEqual(new Set(['butt miter']));
  // …but the outline, drawn in parts, closes its corners with square ends (butt ends notched them)
  const outlineEnds = await stage.locator('.hv2-contour-ink path[data-kind="outline"]').evaluateAll((paths) => paths.map((path) => `${getComputedStyle(path).strokeLinecap} ${getComputedStyle(path).strokeLinejoin}`));
  expect(new Set(outlineEnds)).toEqual(new Set(['square miter']));
  // The truss's panel points are open nodes: a ring in the scheme's paper, the sheet's dark inside it
  const nodes = stage.locator('.hv2-proof-nodes circle');
  await expect(nodes).toHaveCount(homeProofFrame.nodes.length);
  expect(new Set(await nodes.evaluateAll((circles) => circles.map((circle) => `${getComputedStyle(circle).stroke} ${getComputedStyle(circle).fill === getComputedStyle(circle).stroke}`)))).toEqual(new Set([`${PAPER} false`]));
  // Its names are words on the scheme, its legend says «схема» in the scheme's own colour
  for (const tag of homeProofFrame.tags) await expect(stage.locator(`.hv2-proof-tag[data-tag="${tag.id}"]`)).toHaveText(tag.text);
  await expect(page.locator('#real-object .hv2-contour-legend [data-on] [data-key="scheme"]')).toBeVisible();

  // The stamp belongs to the right side and lies on it only, clipped at the seam: in full while that side has room for
  // it, its first word where it has not, none at all where not even that fits (never a fragment — review, 04.10: «ХЕМА»),
  // never over the photo and never under «‹ Фото»
  const frame = (await stage.boundingBox())!;
  const phone = page.viewportSize()!.width <= 760;
  const stamp = stage.locator('.hv2-contour-stamp');
  for (const value of [0, 30, DEFAULT_SPLIT, 80, 90, 95, 99]) {
    await splitTo(page, slider, value);
    const seam = frame.x + (frame.width * value) / 100;
    const room = frame.x + frame.width - seam;
    // the first word with its offset and air (ProofContour: SHORT_STAMP 96 + STAMP_OFFSET 10 + AIR 8)
    if (room < 114) {
      await expect(stage, `${value}`).toHaveAttribute('data-stamp', 'none');
      await expect(stamp, `${value}`).toBeHidden();
      continue;
    }
    await expect(stamp, `${value}`).toBeVisible();
    const box = (await stamp.boundingBox())!;
    expect(box.x + box.width, `${value}`).toBeLessThanOrEqual(frame.x + frame.width);
    expect(box.y, `${value}`).toBeGreaterThanOrEqual(frame.y);
    await expect(stage.locator('.hv2-contour-corner'), `${value}`).toHaveCSS('clip-path', `inset(0px 0px 0px ${value}%)`);
    if (phone) {
      // a phone's stamp is its first word
      await expect(stamp, `${value}`).toHaveText(/^схема$/i, { useInnerText: true });
    } else if (room >= 230) {
      await expect(stage, `${value}`).not.toHaveAttribute('data-stamp', /.*/);
      await expect(stamp, `${value}`).toContainText('каркас такого типу, як на цьому об’єкті', { useInnerText: true });
      expect(box.x, `${value}`).toBeGreaterThanOrEqual(seam);
    } else {
      await expect(stage, `${value}`).toHaveAttribute('data-stamp', 'short');
      await expect(stamp, `${value}`).toHaveText(/^схема$/i, { useInnerText: true });
    }
    await expect.poll(() => clashes(stage), { message: `${value}`, timeout: 2_000 }).toEqual([]);
  }
  // Only the photo: no scheme, no stamp
  await splitTo(page, slider, 100);
  await expect(stamp).toBeHidden();

  // The section's hatch at a step the frame's width can draw: coarser as the window narrows, so on a phone it stays
  // lines, not grey
  const step = { 'hv2-proof-hatch': 6, 'hv2-proof-hatch-m': 9, 'hv2-proof-hatch-l': 13 };
  for (const [id, width] of Object.entries(step)) await expect(page.locator(`#real-object pattern#${id}`)).toHaveAttribute('width', String(width));
  for (const [width, id] of [[1440, 'hv2-proof-hatch'], [960, 'hv2-proof-hatch'], [959, 'hv2-proof-hatch-m'], [600, 'hv2-proof-hatch-m'], [599, 'hv2-proof-hatch-l'], [320, 'hv2-proof-hatch-l']] as const) {
    await page.setViewportSize({ width, height: 900 });
    for (const part of ['.hv2-proof-cut', '.hv2-proof-footing[data-cut]']) {
      await expect(stage.locator(part).first(), `${width} ${part}`).toHaveCSS('fill', `url("#${id}")`);
    }
  }
});

test('the load is drawn in its own tint, as a drawing writes it, and lights the members it passes in the scheme’s paper on a casing — weight, no glow, nothing in the measured copper', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const { stage, layers } = await open(page);
  await layers.getByRole('button', { name: 'Навантаження' }).click();
  await expect(stage.locator('.hv2-proof-load')).toBeVisible();
  const strokes = await stage.locator('.hv2-proof-load :is(path, rect, circle)').evaluateAll((parts) => parts.map((part) => {
    const style = getComputedStyle(part);
    return { kind: part.getAttribute('class') ?? part.parentElement?.getAttribute('class') ?? '', stroke: style.stroke, fill: style.fill, dash: style.strokeDasharray };
  }));
  expect(strokes.length).toBeGreaterThan(10);
  // The legend's «виміряно» is a solid copper line: no part of the load may be one
  for (const part of strokes) {
    expect(part.stroke === COPPER && part.dash === 'none', `${part.kind}: ${part.stroke} ${part.dash}`).toBe(false);
    expect(part.fill, part.kind).not.toBe(COPPER);
  }
  const load = await page.locator('#real-object .hv2-contour-legend [data-on] [data-key="load"] path').evaluate((path) => getComputedStyle(path).stroke);
  expect(load).not.toBe(COPPER);
  const strokesOf = async (selector: string) => new Set(await stage.locator(selector).evaluateAll((parts) => parts.map((part) => getComputedStyle(part).stroke)));

  // The snow spread over the roof: one line and an even comb of arrows down from it, in the load's tint, the arrows
  // headed and the line not
  await expect(stage.locator('.hv2-proof-snow path')).toHaveCount(homeProofFrame.load.arrows.length + 1);
  await expect(stage.locator('.hv2-proof-snow .hv2-proof-comb')).toHaveCount(1);
  expect(await strokesOf('.hv2-proof-snow path')).toEqual(new Set([load]));
  expect(await stage.locator('.hv2-proof-snow path:not(.hv2-proof-comb)').evaluateAll((paths) => paths.map((path) => path.getAttribute('marker-end')))).toEqual(homeProofFrame.load.arrows.map(() => 'url(#hv2-proof-head)'));
  await expect(stage.locator('.hv2-proof-comb')).not.toHaveAttribute('marker-end', /.*/);
  // The strip one truss carries with the edge the snow settles on, and the nodes the purlins bear on, in the same tint
  await expect(stage.locator('g.hv2-proof-roof > path')).toHaveCount(2);
  expect(await strokesOf('.hv2-proof-roof-edge')).toEqual(new Set([load]));
  const bearings = stage.locator('.hv2-proof-bearing circle');
  await expect(bearings).toHaveCount(homeProofFrame.nodes.length);
  expect(new Set(await bearings.evaluateAll((circles) => circles.map((circle) => getComputedStyle(circle).fill)))).toEqual(new Set([load]));

  // The lit truss is the scheme's own paper; each lit link a light paper line drawn over a dark, wider casing, with no
  // filter anywhere in it (owner, 04.10: «вага, а не неон» — the drop-shadow glow is gone)
  expect(await strokesOf('.hv2-proof-lit-truss path')).toEqual(new Set([PAPER]));
  const links = stage.locator('.hv2-proof-link');
  await expect(links).toHaveCount(homeProofFrame.load.links.length);
  for (const link of await links.all()) {
    const parts = await link.evaluate((group) => {
      const casing = group.querySelector('.hv2-proof-link-casing')!;
      const light = group.querySelector('path:not(.hv2-proof-link-casing)')!;
      const [casingStyle, lightStyle] = [getComputedStyle(casing), getComputedStyle(light)];
      return {
        tag: group.tagName, paths: group.querySelectorAll('path').length, casingFirst: group.firstElementChild === casing, light: lightStyle.stroke,
        casingDark: Math.max(...(casingStyle.stroke.match(/\d+/g) ?? ['255']).slice(0, 3).map(Number)) < 60,
        wider: parseFloat(casingStyle.strokeWidth) > parseFloat(lightStyle.strokeWidth),
        filters: [group, casing, light].map((element) => getComputedStyle(element).filter),
      };
    });
    expect(parts).toEqual({ tag: 'g', paths: 2, casingFirst: true, light: PAPER, casingDark: true, wider: true, filters: ['none', 'none', 'none'] });
  }
  // The drops are the legend's dotted «навантаження»
  expect(await strokesOf('.hv2-proof-flow')).toEqual(new Set([load]));
});

test('the seam rests between the gates, and nothing of the right side lies over the photo — the contour only when asked', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const { stage, slider } = await open(page);
  await expectSplit(slider, stage, DEFAULT_SPLIT);
  // The seam sits right of the left gate and left of the right one, on the photo's own pixels
  const [gateLeft, gateRight] = homeProofContour.lines.filter((line) => line.kind === 'gate');
  const rightmost = Math.max(...gateLeft.points.map(([x]) => x)) / homeProofContour.photo.width * 100;
  const leftmost = Math.min(...gateRight.points.map(([x]) => x)) / homeProofContour.photo.width * 100;
  expect(DEFAULT_SPLIT).toBeGreaterThan(rightmost);
  expect(DEFAULT_SPLIT).toBeLessThan(leftmost);

  // Pixels of the photo side (clear of the seam, its handle and the seam's names) are the same with and without every
  // layer of the right side: the scheme, the lines, the figures and the names…
  const frame = (await stage.boundingBox())!;
  const photoSide = { x: frame.x + 1, y: frame.y + 40, width: frame.width * (DEFAULT_SPLIT / 100) - 30, height: frame.height - 41 };
  const layers = stage.locator('.hv2-contour-canvas > :is(svg, .hv2-proof-labels)');
  const hide = (hidden: boolean) => layers.evaluateAll((elements, value) => { for (const element of elements) (element as HTMLElement).style.visibility = value ? 'hidden' : ''; }, hidden);
  const withLayers = await steadyShot(page, photoSide);
  await hide(true);
  const withoutLayers = await steadyShot(page, photoSide);
  expect(await differing(page, withLayers, withoutLayers)).toBeLessThan(SPECKS);
  await hide(false);

  // …and differ once «Контур на фото» lays the measured lines over the photo (so the comparison can see a line) —
  // the lines only: with them on, the photo side is the same with and without the scheme
  const toggle = page.locator('#real-object').getByRole('button', { name: 'Контур на фото', exact: true });
  const lines = stage.locator('svg.hv2-contour-lines');
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(() => lines.evaluate((element) => getComputedStyle(element).clipPath)).toMatch(/^inset\(0px\)$|^none$/);
  const linesOnPhoto = await steadyShot(page, photoSide);
  expect(await differing(page, linesOnPhoto, withoutLayers)).toBeGreaterThan(200);
  await stage.locator('svg.hv2-proof-frame').evaluate((element) => { (element as SVGElement).style.visibility = 'hidden'; });
  expect(await differing(page, await steadyShot(page, photoSide), linesOnPhoto)).toBeLessThan(SPECKS);
  await stage.locator('svg.hv2-proof-frame').evaluate((element) => { (element as SVGElement).style.visibility = ''; });
  expect(await stage.locator('svg.hv2-proof-frame').evaluate((element) => getComputedStyle(element).clipPath)).toContain(`${DEFAULT_SPLIT}%`);
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  await expect.poll(() => lines.evaluate((element) => getComputedStyle(element).clipPath)).toContain(`${DEFAULT_SPLIT}%`);
});

test('the title block switches the right side: the contour with its figures, the scheme with its names, the load link by link', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const { sheet, stage, slider, layers } = await open(page);
  const desktop = (await page.viewportSize())!.width > 760;
  const figure = (id: string) => stage.locator(`.hv2-proof-measure[data-measure="${id}"]`);
  const pressed = async (name: string) => {
    for (const button of await layers.getByRole('button').all()) {
      await expect(button).toHaveAttribute('aria-pressed', String((await button.textContent()) === name));
    }
  };

  // «Каркас»: the scheme, its names, the three figures' titles; the load waits
  await expect(stage.locator('.hv2-proof-scheme')).toBeVisible();
  await expect(stage.locator('.hv2-proof-load')).toBeHidden();
  if (desktop) {
    await expect(figure('slope')).toBeVisible();
    // the gates' «=» marks read as stray strokes across the scheme (owner, 04.10): «Контур» only
    for (const id of ['gates', 'proportion']) await expect(figure(id)).toBeHidden();
    await expect(figure('slope').locator('small')).toBeHidden();
    // the slope's uncertainty is part of its title, also where the line under it is hidden
    await expect(figure('slope')).toContainText('± 0,6°', { useInnerText: true });
    await expect(stage.locator('.hv2-proof-tag')).toHaveCount(homeProofFrame.tags.length);
    for (const tag of await stage.locator('.hv2-proof-tag').all()) await expect(tag).toBeVisible();
    await expect(stage.locator('.hv2-contour-seamtags > span').nth(1)).toHaveText('Схема ›');
  } else {
    // A phone: no words inside the frame — the figures are chips under the note
    await expect(stage.locator('.hv2-proof-labels')).toBeHidden();
    await expect(sheet.locator('.hv2-contour-chips > span')).toHaveText(['Схил ≈ 10,5° ± 0,6°', 'Ворота однакові']);
  }

  await expect(stage.getByRole('img', { name: homeProofFrame.label })).toBeVisible();

  // «Контур»: no scheme — and no name of it for a screen reader; every figure with the line under it
  await layers.getByRole('button', { name: 'Контур' }).click();
  await pressed('Контур');
  await expect(stage.locator('.hv2-proof-scheme')).toBeHidden();
  await expect(stage.getByRole('img', { name: homeProofFrame.label })).toHaveCount(0);
  await expect(stage.locator('.hv2-contour-stamp')).toHaveText(/Виміряно за фото\s*без масштабу/);
  await expect(slider).toHaveAccessibleName('Порівняти фото й контур за фото');
  await expect(slider).toHaveAttribute('aria-valuetext', 'Фото ліворуч, контур за фото праворуч: більше фото');
  if (desktop) {
    for (const measure of homeProofMeasures) {
      await expect(figure(measure.id)).toBeVisible();
      await expect(figure(measure.id)).toHaveText(`${measure.title}${measure.detail}`);
    }
    await expect(stage.locator('.hv2-proof-tag').first()).toBeHidden();
    await expect(stage.locator('.hv2-contour-seamtags > span').nth(1)).toHaveText('Контур ›');
  } else {
    await expect(sheet.getByRole('button', { name: 'Контур', exact: true }).last()).toBeVisible();
  }

  // «Навантаження»: the scheme stepped back, the snow's way lit, its chain in words
  await layers.getByRole('button', { name: 'Навантаження' }).click();
  await pressed('Навантаження');
  await expect(stage.locator('.hv2-proof-load')).toBeVisible();
  expect(Number(await stage.locator('.hv2-proof-scheme').evaluate((element) => getComputedStyle(element).opacity))).toBeLessThan(0.6);
  await expect(stage.locator('.hv2-proof-flow')).toHaveCount(homeProofFrame.load.legs.length);
  // the snow as a drawing writes a spread load: its comb's line and the arrows down from it
  await expect(stage.locator('.hv2-proof-snow path')).toHaveCount(homeProofFrame.load.arrows.length + 1);
  await expect(figure('slope')).toBeHidden();
  const chain = 'Сніг → покрівля → прогони → ферма → стіни й колони → фундаменти → ґрунт';
  if (desktop) {
    await expect(stage.locator('.hv2-contour-chain')).toBeVisible();
    await expect(stage.locator('.hv2-contour-chain > span')).toHaveText(chain.split(' → '));
    // over the gravel, under the frame's foot, not on the lit roof
    const [chainBox, frameBox] = [(await stage.locator('.hv2-contour-chain').boundingBox())!, (await stage.boundingBox())!];
    expect(chainBox.y).toBeGreaterThan(frameBox.y + frameBox.height * 0.6);
  } else {
    await expect(sheet.locator('.hv2-contour-chain-text')).toHaveText(chain);
    // its way down the frame wants the wider right side
    await expectSplit(slider, stage, 40);
  }
  // With reduced motion the way stands lit, nothing running
  expect(await stage.locator('.hv2-proof-load').evaluate((element) => element.getAnimations({ subtree: true }).length)).toBe(0);

  // And back: the default layer, the seam where the visitor left it
  await layers.getByRole('button', { name: 'Каркас' }).click();
  await pressed('Каркас');
  await expect(stage.locator('.hv2-proof-load')).toBeHidden();
});

test('the keys move the seam: arrows by one, PageUp / PageDown by ten, Home and End to the edges', async ({ page }) => {
  const { stage, slider } = await open(page);
  await slider.focus();
  await page.keyboard.press('ArrowRight');
  await expectSplit(slider, stage, DEFAULT_SPLIT + 1);
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowLeft');
  await expectSplit(slider, stage, DEFAULT_SPLIT - 1);
  await page.keyboard.press('PageUp');
  await expectSplit(slider, stage, DEFAULT_SPLIT + 9);
  await page.keyboard.press('PageDown');
  await page.keyboard.press('PageDown');
  await expectSplit(slider, stage, DEFAULT_SPLIT - 11);
  await page.keyboard.press('Home');
  await expectSplit(slider, stage, 0);
  await expect(slider).toHaveAttribute('aria-valuetext', 'Лише схема');
  await page.keyboard.press('End');
  await expectSplit(slider, stage, 100);
  await expect(slider).toHaveAttribute('aria-valuetext', 'Лише фото');
  // The focus shows on the handle, the input itself being invisible
  expect(await ringOf(stage)).toBe('solid');
});

test('a mouse drags anywhere in the frame; a finger scrolls and zooms the page there and drags only the handle', async ({ page }, testInfo) => {
  const { stage, slider } = await open(page);
  // Pinch-zoom stays the page's everywhere in the frame, the handle too: the photo is what a visitor zooms into
  expect(await stage.evaluate((element) => getComputedStyle(element).touchAction)).toBe('pan-y pinch-zoom');
  expect(await stage.locator('.hv2-contour-handle').evaluate((element) => getComputedStyle(element).touchAction)).toBe('pan-y pinch-zoom');
  const frame = (await stage.boundingBox())!;
  const y = frame.y + frame.height * 0.25;

  if (testInfo.project.name === 'desktop-chromium') {
    // The handle says «drag me» under a mouse: a grab cursor, a heavier disc
    expect(await stage.evaluate((element) => getComputedStyle(element).cursor)).toBe('ew-resize');
    const handle = stage.locator('.hv2-contour-handle');
    expect(await handle.evaluate((element) => getComputedStyle(element).cursor)).toBe('grab');
    await handle.hover();
    await expect.poll(() => handle.evaluate((element) => getComputedStyle(element, '::before').borderTopWidth)).toBe('3px');

    await page.mouse.move(frame.x + frame.width * 0.3, y);
    await page.mouse.down();
    await page.mouse.move(frame.x + frame.width * 0.8, y, { steps: 8 });
    await page.mouse.up();
    await expect.poll(() => seamAt(stage)).toBeCloseTo(80, 0);
    await expect(slider).toHaveValue('80');
    // The mouse put the focus on the range, but the keyboard's ring waits for a key
    await expect(slider).toBeFocused();
    expect(await ringOf(stage)).toBe('none');
    await page.keyboard.press('ArrowRight');
    await expect(slider).toHaveValue('81');
    expect(await ringOf(stage)).toBe('solid');
    return;
  }

  // A tap on the photo is a scroll's start, not a seam move
  await page.touchscreen.tap(frame.x + frame.width * 0.2, y);
  await expectSplit(slider, stage, DEFAULT_SPLIT);
  // The handle follows the finger, from where it was grabbed
  const handle = (await stage.locator('.hv2-contour-handle').boundingBox())!;
  const from = { x: handle.x + handle.width / 2 + 6, y: handle.y + handle.height / 2 };
  await touchDrag(page, from, { x: from.x - frame.width * 0.32, y: from.y });
  await expect.poll(() => seamAt(stage)).toBeCloseTo(30, 0);
  expect(await ringOf(stage)).toBe('none');

  // A vertical swipe that starts on the handle scrolls the page and leaves the seam alone
  const grip = (await stage.locator('.hv2-contour-handle').boundingBox())!;
  const before = { scroll: await page.evaluate(() => window.scrollY), split: await slider.inputValue() };
  const start = { x: grip.x + grip.width / 2, y: grip.y + grip.height / 2 };
  await touchDrag(page, start, { x: start.x, y: start.y - 140 });
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(before.scroll + 40);
  await expect(slider).toHaveValue(before.split);
});

test('dragged near a measured line the seam holds to it, lights it and names it at its top; pulled past, it lets go; the keys never snap', async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const touch = testInfo.project.name !== 'desktop-chromium';
  // The phone's tick, recorded: one per line caught, and from a finger only
  await page.addInitScript(() => {
    const ticks: unknown[] = [];
    Object.assign(window, { ticks });
    Object.defineProperty(Navigator.prototype, 'vibrate', { configurable: true, value: (pattern: unknown) => ticks.push(pattern) > 0 });
  });
  const { stage, slider } = await open(page);
  const ticks = () => page.evaluate(() => (window as unknown as { ticks: unknown[] }).ticks);
  // The left gate's right jamb, the measured line next to the resting seam
  const jamb = SNAPS[2];
  expect(Math.abs(DEFAULT_SPLIT - jamb.at)).toBeGreaterThan(SNAP_RELEASE);
  const held = () => stage.evaluate((element) => ({
    split: getComputedStyle(element).getPropertyValue('--split'),
    snapped: element.dataset.snapped ?? null,
    lines: [...element.querySelectorAll<SVGPathElement>('.hv2-contour-lines path[data-snapped]')].map((path) => `${path.parentElement!.getAttribute('class')} ${path.dataset.line}`),
  }));
  // the held line and its casing grow together, and it is drawn once more over the photo (.hv2-contour-held)
  const holding = { split: tenths(jamb.at), snapped: '', lines: [`hv2-contour-casing ${jamb.line}`, `hv2-contour-ink ${jamb.line}`] };
  const name = stage.locator('.hv2-contour-snap');
  const ink = stage.locator(`.hv2-contour-ink path[data-line="${jamb.line}"]`);
  const look = () => ink.evaluate((path) => ({ stroke: getComputedStyle(path).stroke, width: parseFloat(getComputedStyle(path).strokeWidth) }));
  const plain = await look();
  expect(plain.stroke).toBe(COPPER);

  // The handle taken where it is drawn: a mouse could take the frame anywhere, a finger takes only the handle
  const frame = (await stage.boundingBox())!;
  const grip = (await stage.locator('.hv2-contour-handle').boundingBox())!;
  const y = grip.y + grip.height / 2;
  let x = grip.x + grip.width / 2;
  const cdp = touch ? await page.context().newCDPSession(page) : null;
  const finger = (type: 'touchStart' | 'touchMove' | 'touchEnd', at: number) => cdp!.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x: at, y }] });
  const dragTo = async (value: number) => {
    const to = frame.x + (frame.width * value) / 100;
    for (let step = 1; step <= 6; step += 1) {
      const at = x + ((to - x) * step) / 6;
      if (touch) await finger('touchMove', at);
      else await page.mouse.move(at, y);
    }
    x = to;
  };
  if (touch) await finger('touchStart', x);
  else {
    await page.mouse.move(x, y);
    await page.mouse.down();
  }

  // Within GRAB of the jamb the seam stands on it, at its mean x, the range at the nearest whole per cent
  await dragTo(jamb.at + SNAP_GRAB * 0.6);
  await expect.poll(held).toEqual(holding);
  await expect.poll(() => seamAt(stage)).toBeCloseTo(jamb.at, 1);
  await expect(slider).toHaveValue(String(Math.round(jamb.at)));
  // …the line lights up, heavier and out of the measured copper; its name and status stand at the top of the seam in
  // place of the seam's names, on the side with room — here the photo's — for the eye only; and a finger feels it once
  const lit = await look();
  expect(lit.stroke).not.toBe(COPPER);
  expect(lit.width).toBeGreaterThan(plain.width);
  await expect(stage).toHaveAttribute('data-snap-side', 'left');
  await expect(name).toHaveCSS('opacity', '1');
  // (its hidden one-line copy, which it is measured by, is not read)
  await expect(name).toHaveText(new RegExp(`^${jamb.name}\\s*${jamb.status}$`), { useInnerText: true });
  await expect(name.locator(':scope > small')).toHaveText('виміряно');
  await expect(stage.locator('.hv2-contour-seamtags')).toBeHidden();
  await expect(stage.locator('svg.hv2-contour-held path')).toHaveCount(2);
  await expect(name).toHaveAttribute('aria-hidden', 'true');
  const box = (await name.boundingBox())!;
  expect(box.x + box.width).toBeLessThan(frame.x + (frame.width * jamb.at) / 100);
  expect(await ticks()).toEqual(touch ? [6] : []);

  // Pulled within RELEASE it holds, and does not tick again
  await dragTo(jamb.at + SNAP_RELEASE * 0.85);
  await expect.poll(held).toEqual(holding);
  expect(await ticks()).toEqual(touch ? [6] : []);
  // Past RELEASE it lets go: the seam follows the pointer again, nothing is lit, the name fades
  await dragTo(jamb.at + SNAP_RELEASE + 0.6);
  await expect.poll(async () => { const { snapped, lines } = await held(); return { snapped, lines }; }).toEqual({ snapped: null, lines: [] });
  await expect.poll(() => seamAt(stage)).toBeCloseTo(jamb.at + SNAP_RELEASE + 0.6, 0);
  expect((await look()).stroke).toBe(COPPER);
  await expect(name).toHaveCSS('opacity', '0');
  // Back within GRAB from the other side it catches again, with one more tick
  await dragTo(jamb.at - SNAP_GRAB * 0.6);
  await expect.poll(held).toEqual(holding);
  expect(await ticks()).toEqual(touch ? [6, 6] : []);
  // The ridge, which nobody measured, holds nothing
  const ridge = (lineOf('gable-rake-right').points[0][0] / homeProofContour.photo.width) * 100;
  await dragTo(ridge);
  await expect.poll(async () => { const { snapped, lines } = await held(); return { snapped, lines }; }).toEqual({ snapped: null, lines: [] });
  await expect.poll(() => seamAt(stage)).toBeCloseTo(ridge, 0);
  // Let go on the jamb, the seam stays on it and the hold ends
  await dragTo(jamb.at + SNAP_GRAB * 0.6);
  await expect.poll(held).toEqual(holding);
  if (touch) await finger('touchEnd', x);
  else await page.mouse.up();
  await expect.poll(held).toEqual({ split: tenths(jamb.at), snapped: null, lines: [] });
  await expect(name).toHaveCSS('opacity', '0');
  expect(await ticks()).toEqual(touch ? [6, 6, 6] : []);

  // The keys step by whole per cent and never snap: 61 and 60 both lie within GRAB of the jamb
  await expect(slider).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect.poll(held).toEqual({ split: '61%', snapped: null, lines: [] });
  await page.keyboard.press('ArrowLeft');
  await expect.poll(held).toEqual({ split: '60%', snapped: null, lines: [] });
  expect(Math.abs(60 - jamb.at)).toBeLessThan(SNAP_GRAB);
  expect(Math.abs(61 - jamb.at)).toBeLessThan(SNAP_GRAB);
});

test('the held line’s name stays whole inside the frame and over no other word, at every measured line it can hold', async ({ page }, testInfo) => {
  test.setTimeout(180_000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const desktop = testInfo.project.name === 'desktop-chromium';
  // From tablet to wide screen in every layer; on phones in the default one (no other words in a phone's frame but the
  // stamp). Every miss is collected, so one run names them all
  const windows = desktop ? [[1440, 900], [1280, 720], [1024, 768], [768, 1024]] : [[412, 839], [390, 800], [360, 800], [320, 800]];
  const found: string[] = [];
  for (const [width, height] of windows) {
    await page.setViewportSize({ width, height });
    const { stage, layers } = await open(page);
    const name = stage.locator('.hv2-contour-snap');
    for (const layer of desktop ? ['Каркас', 'Контур', 'Навантаження'] : ['Каркас']) {
      await layers.getByRole('button', { name: layer }).click();
      for (const snap of SNAPS) {
        await stage.evaluate((element) => element.scrollIntoView({ block: 'center' }));
        const frame = (await stage.boundingBox())!;
        const y = frame.y + frame.height * 0.3;
        // a mouse takes the frame anywhere, so each line is reached from the middle (no line within GRAB there)
        await page.mouse.move(frame.x + frame.width / 2, y);
        await page.mouse.down();
        await page.mouse.move(frame.x + (frame.width * (snap.at + SNAP_GRAB * 0.4)) / 100, y, { steps: 5 });
        await expect.poll(() => stage.evaluate((element) => getComputedStyle(element).getPropertyValue('--split'))).toBe(tenths(snap.at));
        await expect(name).toHaveCSS('opacity', '1');
        // its words say «наближено» exactly where the line is approximate
        await expect(name).toHaveText(new RegExp(`^${snap.name}\\s*${snap.status}$`), { useInnerText: true });
        found.push(...(await clashes(stage)).map((clash) => `${width}×${height} ${layer} ${snap.name} (${snap.at.toFixed(1)} %): ${clash}`));
        await page.mouse.up();
        await expect(name).toHaveCSS('opacity', '0');
      }
    }
  }
  expect(found).toEqual([]);
});

test('grabbed at either end of the frame, the handle stays under the finger', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'desktop-chromium', '«Фото», «Схема» and the finger are the phone\'s');
  // Without the sweep, so the handle is measured where it rests
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const { sheet, stage, slider } = await open(page);
  const handle = stage.locator('.hv2-contour-handle');
  for (const [side, edge, move] of [['Схема', 0, 120], ['Фото', 100, -120]] as const) {
    await sheet.getByRole('button', { name: side, exact: true }).click();
    await expectSplit(slider, stage, edge);
    // The buttons sit under the frame: bring the frame back clear of the sticky header
    await stage.evaluate((element) => element.scrollIntoView({ block: 'center' }));
    const frame = (await stage.boundingBox())!;
    // At the edge the handle is held clear of the frame, off the seam: the finger takes it where it is drawn
    const grip = (await handle.boundingBox())!;
    const from = { x: grip.x + grip.width / 2, y: grip.y + grip.height / 2 };
    const to = { x: from.x + move, y: from.y };
    await touchDrag(page, from, to);
    const centre = async () => { const box = (await handle.boundingBox())!; return box.x + box.width / 2; };
    await expect.poll(async () => Math.abs((await centre()) - to.x), { message: side }).toBeLessThanOrEqual(2);
    await expect.poll(() => seamAt(stage)).toBeCloseTo(((to.x - frame.x) / frame.width) * 100, 0);
  }
});

test('on a phone the handle rests under the gable, clear of both gates and the base line', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'desktop-chromium', 'a phone\'s frame');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const width of [412, 390, 360, 320]) {
    await page.setViewportSize({ width, height: 800 });
    const { stage, slider } = await open(page);
    await expectSplit(slider, stage, DEFAULT_SPLIT);
    // The gates' corners and jambs next to the seam, and where the base line crosses it, in the photo's own pixels
    const [gateLeft, gateRight] = homeProofContour.lines.filter((line) => line.kind === 'gate');
    const base = homeProofContour.lines.find((line) => line.id === 'gable-base')!.points;
    const seamX = (DEFAULT_SPLIT / 100) * homeProofContour.photo.width;
    const baseY = base[0][1] + ((base[1][1] - base[0][1]) * (seamX - base[0][0])) / (base[1][0] - base[0][0]);
    const marks = [...gateLeft.points.slice(1), ...gateRight.points.slice(0, 2), [seamX, baseY] as const];
    const covered = await stage.evaluate((element, points) => {
      const svg = element.querySelector<SVGSVGElement>('svg.hv2-contour-lines')!;
      const ctm = svg.getScreenCTM()!;
      const handle = element.querySelector('.hv2-contour-handle')!;
      const disc = handle.getBoundingClientRect();
      const style = getComputedStyle(handle, '::before');
      // The disc as drawn: the handle's box less the pseudo-element's insets
      const left = disc.left + parseFloat(style.left), right = disc.right - parseFloat(style.right);
      const bottom = disc.bottom - parseFloat(style.bottom), top = bottom - parseFloat(style.height);
      const cx = (left + right) / 2, cy = (top + bottom) / 2, radius = (right - left) / 2;
      // A line's own width counts: its casing is about three CSS pixels across
      return points.filter(([x, y]) => Math.hypot(ctm.a * x + ctm.e - cx, ctm.d * y + ctm.f - cy) < radius + 2);
    }, marks);
    expect(covered, `${width}`).toEqual([]);
  }
});

test('on a phone «Фото» and «Схема» show one side whole, and bring the seam back when pressed again', async ({ page }, testInfo) => {
  const { sheet, stage, slider } = await open(page);
  const photo = sheet.getByRole('button', { name: 'Фото', exact: true });
  const scheme = sheet.getByRole('button', { name: 'Схема', exact: true });
  if (testInfo.project.name === 'desktop-chromium') {
    // A mouse has the whole frame to drag; the two buttons are for fingers
    await expect(photo).toBeHidden();
    await expect(scheme).toBeHidden();
    return;
  }
  await expect(photo).toHaveAttribute('aria-pressed', 'false');
  await photo.click();
  await expect(photo).toHaveAttribute('aria-pressed', 'true');
  await expectSplit(slider, stage, 100);
  await scheme.click();
  await expect(scheme).toHaveAttribute('aria-pressed', 'true');
  await expect(photo).toHaveAttribute('aria-pressed', 'false');
  await expectSplit(slider, stage, 0);
  await scheme.click();
  await expect(scheme).toHaveAttribute('aria-pressed', 'false');
  await expectSplit(slider, stage, DEFAULT_SPLIT);
  for (const button of [photo, scheme, sheet.getByRole('button', { name: 'Контур на фото', exact: true }), ...await sheet.getByRole('group', { name: 'Що показати праворуч' }).getByRole('button').all()]) {
    const box = (await button.boundingBox())!;
    expect(box.height).toBeGreaterThanOrEqual(44);
  }
});

test('on a phone the title block keeps its height whichever layer is on', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'desktop-chromium', 'a phone\'s title block');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const width of [412, 390, 360, 320]) {
    await page.setViewportSize({ width, height: 800 });
    const { sheet, layers } = await open(page);
    const heights = new Set<number>();
    for (const layer of ['Каркас', 'Навантаження', 'Контур', 'Каркас']) {
      await layers.getByRole('button', { name: layer }).click();
      heights.add(Math.round((await sheet.locator('figcaption').boundingBox())!.height));
    }
    expect([...heights], `${width}`).toHaveLength(1);
  }
});

test('arriving with motion, the photo plots in whole, then the seam sweeps once from the edge across the gable and back to rest, the drawing whole behind it', async ({ page }, testInfo) => {
  test.setTimeout(45_000);
  const phone = testInfo.project.name !== 'desktop-chromium';
  const { sheet, stage, range } = await arrive(page);
  // Armed below the fold: the seam waits at the right edge — the photo whole — while the range keeps its resting value
  await expect(sheet).toHaveAttribute('data-sheet-state', 'armed');
  await expect(stage).toHaveAttribute('data-sweep', 'wait');
  expect(await stage.evaluate((element) => getComputedStyle(element).getPropertyValue('--split'))).toBe('100%');
  await expect(range).toHaveValue(String(DEFAULT_SPLIT));
  // (the tracing goes there once on hydration, unseen: the armed sheet's picture is clipped away)
  await expect.poll(() => stage.locator('.hv2-contour-trace').evaluate((element) => getComputedStyle(element).clipPath)).toBe('inset(0px 0px 0px 100%)');
  await recordArrival(page);
  await page.evaluate(() => Promise.all([...document.querySelectorAll<HTMLImageElement>('.hv2-contour img')].map((image) => { image.loading = 'eager'; return image.decode().catch(() => undefined); })));
  await sheet.scrollIntoViewIfNeeded();
  const { frames, on, run, ended } = await arrivalOf(page);
  expect([on, run, ended].every((at) => at !== null), 'the sheet arrived, the seam swept and stopped').toBe(true);
  const plotting = frames.filter((frame) => frame.t >= on! && frame.t < run!);
  const sweep = frames.filter((frame) => frame.t >= run! && frame.t < ended!);
  const after = frames.filter((frame) => frame.t >= ended!);

  // While the picture plots in, the photo stands whole: the seam at the right edge, nothing of the right side uncovered,
  // nothing drawing in
  expect(plotting.length).toBeGreaterThan(10);
  for (const frame of plotting) {
    expect(frame, `${frame.t}`).toMatchObject({ sweep: 'wait', gliding: false, split: 100, trace: 100, scheme: 100, others: [] });
    expect(frame.seam, `${frame.t}`).toBeCloseTo(100, 1);
  }
  // The sweep starts SWEEP_AT after the sheet arrived, the picture plotted in by then (a few ms: two observers read the
  // clock a moment apart), and runs its time once — a shorter one on a phone
  expect(run! - on!).toBeGreaterThanOrEqual(SWEEP_AT - 5);
  const duration = phone ? SWEEP_MS_PHONE : SWEEP_MS;
  expect(ended! - run!).toBeGreaterThanOrEqual(duration - 20);
  expect(ended! - run!).toBeLessThan(duration + 400);
  expect(sweep.length).toBeGreaterThan(20);
  for (const frame of sweep) expect(frame, `${frame.t}`).toMatchObject({ sweep: 'run', gliding: true, plotting: false });

  // From the edge across the gable — past its left corner, to the turn — and back to rest: one way out, one way back
  const splits = sweep.map((frame) => frame.split);
  const turn = splits.indexOf(Math.min(...splits));
  expect(splits[0]).toBeGreaterThan(99);
  expect(splits[turn]).toBeCloseTo(SWEEP_TURN, 0);
  expect(splits[turn]).toBeLessThan(SNAPS[0].at);
  expect(splits.slice(0, turn + 1)).toEqual(splits.slice(0, turn + 1).toSorted((a, b) => b - a));
  expect(splits.slice(turn)).toEqual(splits.slice(turn).toSorted((a, b) => a - b));
  // The seam is drawn where --split is, and the tracing and the scheme are uncovered exactly to it: what it has passed is
  // the drawing, whole — no line draws in, nothing else moves on the stage
  for (const frame of sweep) {
    expect(frame.seam, `${frame.t}`).toBeCloseTo(frame.split, 1);
    expect(frame.trace, `${frame.t}`).toBeCloseTo(frame.split, 2);
    expect(frame.scheme, `${frame.t}`).toBeCloseTo(frame.split, 2);
    expect(frame.others, `${frame.t}`).toEqual([]);
  }
  // The range and what it says never move; the figures and the names wait until the seam rests
  for (const frame of [...plotting, ...sweep]) expect([frame.range, ...frame.words], `${frame.t}`).toEqual([String(DEFAULT_SPLIT), 0, 0]);

  // At rest, in one frame: the sweep's marks gone, the seam at its split, and two rings from the handle — once
  expect(after[0]).toMatchObject({ sweep: null, gliding: false, pulse: true, split: DEFAULT_SPLIT, range: String(DEFAULT_SPLIT), rings: 'hv2-contour-pulse 2' });
  for (const frame of after) expect(frame, `${frame.t}`).toMatchObject({ sweep: null, gliding: false, split: DEFAULT_SPLIT, range: String(DEFAULT_SPLIT) });
  expect(frames.filter((frame) => frame.t < ended!).some((frame) => frame.pulse)).toBe(false);
  const rung = after.findIndex((frame) => !frame.pulse);
  expect(rung).toBeGreaterThan(0);
  expect(after.slice(rung).some((frame) => frame.pulse)).toBe(false);
  // …and the figures and the names come in
  for (const part of ['.hv2-proof-labels', 'svg.hv2-proof-marks']) {
    await expect.poll(() => stage.locator(part).evaluate((element) => getComputedStyle(element).opacity), part).toBe('1');
  }
  if (!phone) await expect(stage.locator('.hv2-proof-measure[data-measure="slope"]')).toBeVisible();
  await expectSplit(range, stage, DEFAULT_SPLIT);
});

test('arriving the usual way — the wheel, or a finger swiping over the sheet — the seam still sweeps once, when the page is quiet', async ({ page }, testInfo) => {
  test.setTimeout(45_000);
  const { sheet, stage, range } = await arrive(page);
  await recordArrival(page);
  const viewport = page.viewportSize()!;
  const top = () => sheet.evaluate((element) => element.getBoundingClientRect().top);
  if (testInfo.project.name === 'desktop-chromium') {
    // The pointer rests mid-window, so the wheel turns over the sheet once it scrolls under it
    await page.mouse.move(viewport.width / 2, viewport.height / 2);
    await sheet.evaluate((element) => window.scrollTo({ top: element.getBoundingClientRect().top + window.scrollY - window.innerHeight, behavior: 'instant' }));
    while ((await top()) > 130) {
      await page.mouse.wheel(0, 100);
      await page.waitForTimeout(40);
    }
  } else {
    // The sheet enters from below; the finger starts on it and swipes it up
    await sheet.evaluate((element) => window.scrollTo({ top: element.getBoundingClientRect().top + window.scrollY - window.innerHeight + 200, behavior: 'instant' }));
    for (let swipe = 0; swipe < 6 && (await top()) > 90; swipe += 1) {
      const from = { x: viewport.width / 2, y: Math.min(viewport.height - 20, (await top()) + 120) };
      await touchDrag(page, from, { x: from.x, y: from.y - 160 });
      await page.waitForTimeout(80);
    }
  }
  const { frames, on, run, ended, scrolls } = await arrivalOf(page);
  expect([on, run, ended].every((at) => at !== null), 'the sheet arrived, the seam swept and stopped').toBe(true);
  // It waits for the page to have been quiet SWEEP_QUIET: the eye is on the way, not on the seam (a few ms: the page's
  // listener and the record's read the clock a moment apart)
  expect(run! - on!).toBeGreaterThanOrEqual(SWEEP_AT - 5);
  expect(scrolls.length).toBeGreaterThan(0);
  expect(run! - Math.max(...scrolls.filter((at) => at < run!))).toBeGreaterThanOrEqual(SWEEP_QUIET - 5);
  // …then runs its whole course, to the turn and back — the wheel and the swipe never stopped it — and rings
  expect(ended! - run!).toBeGreaterThanOrEqual((testInfo.project.name === 'desktop-chromium' ? SWEEP_MS : SWEEP_MS_PHONE) - 20);
  expect(Math.min(...frames.filter((frame) => frame.t >= run! && frame.t < ended!).map((frame) => frame.split))).toBeCloseTo(SWEEP_TURN, 0);
  expect(frames.find((frame) => frame.t >= ended!)).toMatchObject({ sweep: null, gliding: false, pulse: true, split: DEFAULT_SPLIT });
  expect(new Set(frames.map((frame) => frame.range))).toEqual(new Set([String(DEFAULT_SPLIT)]));
  await expectSplit(range, stage, DEFAULT_SPLIT);
});

test('a key in the sheet before the sweep stops it: the seam goes from the edge to the visitor’s split, no sweep, no rings', async ({ page }) => {
  test.setTimeout(45_000);
  const { sheet, stage, range } = await arrive(page);
  await recordArrival(page);
  await sheet.scrollIntoViewIfNeeded();
  await expect(sheet).toHaveAttribute('data-sheet-state', 'on');
  await range.focus();
  await page.keyboard.press('ArrowRight');
  const { frames, on, run, ended } = await arrivalOf(page);
  // Stopped while it waited at the edge — and it never starts afterwards (the record runs past when it would have)
  expect(run).toBeNull();
  expect(ended! - on!).toBeLessThan(SWEEP_AT);
  expect(frames.filter((frame) => frame.sweep === 'run' || frame.gliding || frame.pulse)).toEqual([]);
  expect(frames.at(-1)!.t - on!).toBeGreaterThan(SWEEP_AT + SWEEP_QUIET);
  // The key's own step: the seam rests at 63, never left of where the state put it
  await expect(stage).not.toHaveAttribute('data-sweep', /.*/);
  await expectSplit(range, stage, DEFAULT_SPLIT + 1);
  expect(Math.min(...frames.filter((frame) => frame.t >= ended!).map((frame) => frame.split))).toBeGreaterThanOrEqual(DEFAULT_SPLIT);
  await expect(stage).not.toHaveAttribute('data-pulse', /.*/);
});

test('a mouse pressed in the sheet, or a finger on one of its buttons, stops the sweep where it is: back to rest, no rings', async ({ page }, testInfo) => {
  test.setTimeout(45_000);
  const phone = testInfo.project.name !== 'desktop-chromium';
  const { sheet, stage, range } = await arrive(page);
  await recordArrival(page);
  await sheet.scrollIntoViewIfNeeded();
  await page.waitForFunction(() => document.querySelector<HTMLElement>('#real-object .hv2-contour-stage')!.dataset.sweep === 'run');
  if (phone) {
    // A finger on a button (here the layer already on: it changes nothing else)
    await sheet.getByRole('group', { name: 'Що показати праворуч' }).getByRole('button', { name: 'Каркас' }).tap();
  } else {
    // A mouse on the title block, clear of every control: the press moves nothing itself
    const cell = (await sheet.locator('figcaption .sheet-cell').first().boundingBox())!;
    await page.mouse.click(cell.x + cell.width / 2, cell.y + cell.height / 2);
  }
  const { frames, run, ended } = await arrivalOf(page);
  // Cut short; at once the seam's place is the state's again, the range never moved, and no rings: they are the
  // finished sweep's last word
  expect(run).not.toBeNull();
  expect(ended! - run!).toBeLessThan((phone ? SWEEP_MS_PHONE : SWEEP_MS) - 300);
  for (const frame of frames.filter((at) => at.t >= ended!)) expect(frame, `${frame.t}`).toMatchObject({ sweep: null, gliding: false, pulse: false, split: DEFAULT_SPLIT });
  expect(new Set(frames.map((frame) => frame.range))).toEqual(new Set([String(DEFAULT_SPLIT)]));
  await expectSplit(range, stage, DEFAULT_SPLIT);
});

test('with reduced motion the sheet stands static and complete at its resting split', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const { sheet, stage, slider } = await open(page);
  await expect(sheet).not.toHaveAttribute('data-sheet-state', /.+/);
  await expectSplit(slider, stage, DEFAULT_SPLIT);
  const paths = sheet.locator('.hv2-contour-lines path, .hv2-proof-scheme [data-group]');
  expect(await sheet.evaluate((element) => element.getAnimations({ subtree: true }).length)).toBe(0);
  expect(await paths.evaluateAll((elements) => elements.filter((element) => {
    const style = getComputedStyle(element);
    return !/^0(px)?$/.test(style.strokeDashoffset) || style.opacity !== '1';
  }).length)).toBe(0);
  for (const part of ['.hv2-proof-cut', '.hv2-proof-nodes', '.hv2-proof-labels', '.hv2-proof-marks']) {
    expect(await stage.locator(part).first().evaluate((element) => getComputedStyle(element).opacity), part).toBe('1');
  }
  // The seam and the layers do not slide (the site's reduced-motion rule leaves a hundredth of a millisecond at most)
  for (const part of ['svg.hv2-contour-lines', 'svg.hv2-proof-frame', '.hv2-contour-trace', '.hv2-contour-seam', '.hv2-contour-handle']) {
    expect(await stage.locator(part).evaluate((element) => Math.max(...getComputedStyle(element).transitionDuration.split(',').map(parseFloat))), part).toBeLessThanOrEqual(0.0001);
  }
  // No sweep — the seam never waits at the edge — and no rings, ever
  await page.waitForTimeout(6_000);
  for (const mark of ['data-sweep', 'data-gliding', 'data-pulse']) await expect(stage).not.toHaveAttribute(mark, /.*/);
  expect(await stage.evaluate((element) => getComputedStyle(element).getPropertyValue('--split'))).toBe(`${DEFAULT_SPLIT}%`);
  expect(await stage.locator('.hv2-contour-trace').evaluate((element) => getComputedStyle(element).clipPath)).toBe(`inset(0px 0px 0px ${DEFAULT_SPLIT}%)`);
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('the sheet is complete at its resting split: photo, tracing, scheme, lines, figures; the controls say they cannot move it', async ({ page }) => {
    await page.goto('/', { waitUntil: 'load' });
    const stage = page.locator('#real-object .hv2-contour-stage');
    await stage.scrollIntoViewIfNeeded();
    await expect(page.locator('#real-object .hv2-contour')).not.toHaveAttribute('data-sheet-state', /.+/);
    await expect.poll(() => seamAt(stage)).toBeCloseTo(DEFAULT_SPLIT, 0);
    await expect(stage.locator('.hv2-contour-ink path')).toHaveCount(homeProofContour.lines.length);
    await expect(stage.locator('picture img')).toHaveCount(2);
    await expect(stage.locator('picture img').first()).toBeVisible();
    await expect(stage.locator('.hv2-proof-scheme')).toBeVisible();
    await expect(stage.locator('.hv2-contour-stamp')).toContainText('каркас такого типу, як на цьому об’єкті');
    expect(await stage.locator('.hv2-contour-trace').evaluate((element) => getComputedStyle(element).clipPath)).toContain(`${DEFAULT_SPLIT}%`);
    // No sweep waits on a script that never runs: the seam at rest, the figures and the names in
    await expect(stage).not.toHaveAttribute('data-sweep', /.*/);
    expect(await stage.evaluate((element) => getComputedStyle(element).getPropertyValue('--split'))).toBe(`${DEFAULT_SPLIT}%`);
    for (const part of ['.hv2-proof-labels', 'svg.hv2-proof-marks']) expect(await stage.locator(part).evaluate((element) => getComputedStyle(element).opacity), part).toBe('1');
    if ((page.viewportSize()?.width ?? 0) > 760) await expect(stage.locator('.hv2-proof-measure[data-measure="slope"]')).toBeVisible();
    // Nothing offers a move the static sheet cannot make: the slider and the buttons are disabled, out of the tab order
    await expect(stage.getByRole('slider', { name: SLIDER })).toBeDisabled();
    for (const button of await page.locator('#real-object .hv2-contour figcaption button').all()) await expect(button).toBeDisabled();
  });
});

test('on a laptop the whole sheet fits under the header, and the crop keeps the gable whole', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'laptop windows');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const [width, height] of [[1280, 720], [1366, 768], [1440, 900], [1536, 864], [1920, 1080]]) {
    await page.setViewportSize({ width, height });
    const { sheet, stage } = await open(page);
    await sheet.evaluate((element) => window.scrollTo({ top: element.getBoundingClientRect().top + window.scrollY - 117, behavior: 'instant' }));
    const box = (await sheet.boundingBox())!;
    expect(Math.round(box.y), `${width}×${height}`).toBe(117);
    expect(box.y + box.height, `${width}×${height}`).toBeLessThanOrEqual(height);
    // The title block keeps its place under the picture, not over it
    const image = (await sheet.locator('.sheet-image').boundingBox())!;
    const stamp = (await sheet.locator('figcaption').boundingBox())!;
    expect(stamp.y, `${width}×${height}`).toBeGreaterThanOrEqual(image.y + image.height);
    expect(stamp.y + stamp.height, `${width}×${height}`).toBeLessThanOrEqual(box.y + box.height);
    // The canvas keeps the sheet's width; the stage shows the photo's rows from above the apex to below the base
    const rows = await stage.evaluate((element) => {
      const frame = element.getBoundingClientRect();
      const canvas = element.querySelector('.hv2-contour-canvas')!.getBoundingClientRect();
      const scale = canvas.height / 788;
      return { width: canvas.width - frame.width, top: (frame.top - canvas.top) / scale, bottom: (frame.bottom - canvas.top) / scale };
    });
    expect(Math.abs(rows.width), `${width}×${height}`).toBeLessThanOrEqual(1);
    expect(rows.top, `${width}×${height}`).toBeLessThanOrEqual(100);
    expect(rows.bottom, `${width}×${height}`).toBeGreaterThanOrEqual(640);
    // …and the scheme's foot with it: the footings and the load's arrowheads end inside the frame
    const foot = await stage.evaluate((element) => {
      const svg = element.querySelector<SVGSVGElement>('svg.hv2-proof-frame')!;
      const lowest = Math.max(...[...svg.querySelectorAll<SVGGraphicsElement>('.hv2-proof-footing, .hv2-proof-flow')].map((part) => {
        const box = part.getBBox();
        return box.y + box.height;
      }));
      const ctm = svg.getScreenCTM()!;
      return { lowest: ctm.d * lowest + ctm.f, bottom: element.getBoundingClientRect().bottom };
    });
    expect(foot.lowest, `${width}×${height}`).toBeLessThanOrEqual(foot.bottom - 2);
    // …and the load's comb at the top: its line and its arrows' tails start inside the frame
    const head = await stage.evaluate((element) => {
      const svg = element.querySelector<SVGSVGElement>('svg.hv2-proof-frame')!;
      const ctm = svg.getScreenCTM()!;
      return { highest: ctm.d * svg.querySelector<SVGGraphicsElement>('.hv2-proof-snow')!.getBBox().y + ctm.f, top: element.getBoundingClientRect().top };
    });
    expect(head.highest, `${width}×${height}`).toBeGreaterThanOrEqual(head.top);
  }
});

test('from tablet to wide screen, no word on the frame covers another or runs off it', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'desktop windows');
  test.setTimeout(120_000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  // At rest in every layer from 761 px up; the seam dragged right over the figures on short laptops (where the seam's
  // name used to land on them) and to the far right (where «‹ Фото» met the stamp)
  const plan: [number, number, number[]][] = [
    [761, 900, [DEFAULT_SPLIT]], [768, 1024, [DEFAULT_SPLIT]], [1024, 768, [DEFAULT_SPLIT, 70]], [1180, 820, [DEFAULT_SPLIT]],
    [1280, 720, [DEFAULT_SPLIT, 64, 68, 72]], [1366, 768, [64, 68, 72]], [1440, 780, [64, 68, 72, 85, 88, 92, 95, 99]],
    [1440, 900, [DEFAULT_SPLIT]], [1920, 1080, [DEFAULT_SPLIT]],
  ];
  for (const [width, height, splits] of plan) {
    await page.setViewportSize({ width, height });
    const { sheet, stage, slider, layers } = await open(page);
    await sheet.evaluate((element) => window.scrollTo({ top: element.getBoundingClientRect().top + window.scrollY - 117, behavior: 'instant' }));
    for (const layer of ['Каркас', 'Контур', 'Навантаження']) {
      await layers.getByRole('button', { name: layer }).click();
      for (const value of splits) {
        await splitTo(page, slider, value);
        // polled: the handle reaches the new split on the next frame
        await expect.poll(() => clashes(stage, value === DEFAULT_SPLIT), { message: `${width}×${height} ${layer} ${value}`, timeout: 2_000 }).toEqual([]);
      }
    }
  }
});

test('no horizontal overflow at 320 px, and the title block keeps every word whole inside its cell', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  const { sheet } = await open(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  const box = (await sheet.boundingBox())!;
  expect(box.x + box.width).toBeLessThanOrEqual(320);
  const overflowing = await sheet.locator('figcaption, figcaption .sheet-cell, figcaption .sheet-cell b, figcaption .sheet-action, figcaption button').evaluateAll((elements) =>
    elements.filter((element) => element.scrollWidth > element.clientWidth + 1).map((element) => element.textContent));
  expect(overflowing).toEqual([]);
});

test('the sheet stays dark in the light theme', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'light' });
  const { sheet } = await open(page);
  const light = await sheet.evaluate((element) => getComputedStyle(element).backgroundColor);
  await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'dark' });
  expect(await sheet.evaluate((element) => getComputedStyle(element).backgroundColor)).toBe(light);
  expect(light).toBe('rgb(29, 32, 30)');
});

// Test only (owner, 04.10): /?xray=sketch puts the old generated sketch on the right, to compare it with the scheme.
// Read on the client: the server HTML is the default page's, so no second indexable version exists, and the default
// page never loads the sketch.
test('the sketch shows only in its test mode, read on the client, never on the default page', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const server = async (path: string) => {
    const response = await page.request.get(path);
    expect(response.status(), path).toBe(200);
    return page.evaluate((markup) => new DOMParser().parseFromString(markup, 'text/html').querySelector('#real-object')?.outerHTML ?? '', await response.text());
  };
  const plain = await server('/');
  expect(plain).not.toContain('/concepts/');
  expect(await server('/?xray=sketch')).toBe(plain);

  const { stage } = await open(page);
  await expect(page.locator('#real-object img[src*="/concepts/"], #real-object [srcset*="/concepts/"]')).toHaveCount(0);
  expect(await page.evaluate(() => performance.getEntriesByType('resource').filter((entry) => entry.name.includes('/concepts/hangar-')).length)).toBe(0);
  await expect(stage.locator('.hv2-contour-sketch')).toHaveCount(0);

  const sketch = await open(page, '/?xray=sketch');
  await expect(sketch.layers.getByRole('button')).toHaveText(['Ескіз', 'Каркас']);
  await expect(sketch.layers.getByRole('button', { name: 'Ескіз' })).toHaveAttribute('aria-pressed', 'true');
  const image = sketch.stage.getByRole('img', { name: /^Згенероване зображення/ });
  await expect(image).toBeVisible();
  await expect(image).toHaveAttribute('src', /\/concepts\/hangar-xray-/);
  await expect(sketch.slider).toHaveAccessibleName('Порівняти фото й ескіз');
  await expect(sketch.stage.locator('.hv2-contour-stamp')).toHaveText(/Тест\s*згенероване зображення/);
  await expect(sketch.sheet.locator('.sheet-cell-note')).toContainText('Тестовий режим для порівняння.');
  // The scheme's name is not read while the sketch is on
  await expect(sketch.stage.getByRole('img', { name: homeProofFrame.label })).toHaveCount(0);
  // «Контур на фото» lays the measured lines over the photo only: the sketch has its own composition
  const toggle = sketch.sheet.getByRole('button', { name: 'Контур на фото', exact: true });
  await toggle.click();
  await expect(sketch.stage.locator('svg.hv2-contour-lines')).toBeVisible();
  await expect.poll(() => sketch.stage.locator('svg.hv2-contour-lines').evaluate((element) => getComputedStyle(element).clipPath)).toMatch(/^inset\(0px (?:38%|calc\(38%\)) 0px 0px\)$/);
  await toggle.click();
  // The scheme is one press away, for the comparison — with its own note, not the sketch's
  await sketch.layers.getByRole('button', { name: 'Каркас' }).click();
  await expect(sketch.stage.locator('.hv2-proof-scheme')).toBeVisible();
  await expect(sketch.stage.locator('.hv2-contour-sketch')).toBeHidden();
  const note = sketch.sheet.locator('.sheet-cell-note');
  await expect(note).not.toContainText('згенероване');
  await expect(note).toContainText('Креслень саме цього ангара в нас немає, тож каркас показано схемою');
  await expect(sketch.stage.getByRole('img', { name: homeProofFrame.label })).toBeVisible();
  // No visible word names the old idea
  expect(await sketch.sheet.innerText()).not.toMatch(/x-?ray|рентген/i);
});
