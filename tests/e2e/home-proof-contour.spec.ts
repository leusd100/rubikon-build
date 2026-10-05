import { expect, test, type Locator, type Page } from '@playwright/test';
import { homeProofContour } from '../../app/data/homeProofContour';
import { homeProofFrame } from '../../app/data/homeProofFrame';
import { homeProofMeasures } from '../../app/data/homeProofMeasures';

// HOME's proof (owner, 04.10): one «Креслення» sheet, the photo left of a seam and right of it its tracing with one of
// four layers chosen in the title block — «Контур» (the lines and figures measured from the photos), «Каркас» (the
// default: a SCHEME of a frame of this object's type in its silhouette, labelled so), «Сніг» and «Вітер» (each load's
// way through that scheme, each in its own tint). The seam is a real range input (keys, screen readers); a mouse drags
// anywhere in the frame, a finger only the handle, and on a phone «Фото» / «Схема» show one side whole. «Контур на
// фото» lays the measured lines — and only those — over the photo too. Arriving with motion, the sheet plots in as a
// whole photo and the seam sweeps once from the right edge across the gable and back to rest («шов-плотер»); without
// motion or JavaScript the sheet stands complete. On a laptop the sheet fits under the header where the window has the
// room, and its title block is never under the picture.
// The review of 04.10 added: the sweep still plays when the visitor arrives by the wheel or a swipe; the right side's
// words (the stamp) lie on it only; no name on the frame covers another or runs off it; the loads are never drawn in the
// measured copper. The owner's reviews of 04.10 added: a load is a drawing's comb of arrows and lines on a casing, weight
// rather than a glow; a mouse over the frame leads the seam without a press; passing a measured vertical the seam lights
// it and names it, but never holds there; the tracing is quiet — the photo inside the building only, the paper and its
// grid round it; a phone's frame is a close-up of the gable. The fourth round's review (04.10) added: each load's way is
// written in the title block's legend, word by word as the drawing reaches it, not on the frame; a name that meets the
// seam's names or the stamp is hidden whole, as one the seam cuts; a narrower frame drops the figures' second lines and
// the purlins' name; a key, the range, a button or a layer leaves no line lit; the scheme's name says the wind's way;
// the wind's gusts are long where the frame has room and short in a phone's close-up; a phone's close-up keeps the
// base clear of the handle; the seam's parts ride one rail moved by a transform, so moving it shifts no layout.
// The review of 05.10 rebuilt the seam for speed: the right side is a window moved to the seam by a transform, its
// content moved back by as much (no clip-path anywhere); --split lives on the four that carry it only, not on the stage;
// a mouse leading the seam is eased by the page itself, and the rest of the sheet — the range, the names that give way,
// the stamp — is told at most every COMMIT_EVERY while a pointer moves it, at once when it stops. The seam's right-hand
// name gives way to a word of the drawing it would cover; the purlins' name stands on the right wall's face at every
// width; a load's legend is compact, its tint its key.

const DEFAULT_SPLIT = 62;
// The first view's sweep (ProofContour): SWEEP_AT after the sheet arrives, once the page has been quiet SWEEP_QUIET, from
// the right edge to SWEEP_TURN and back to rest over SWEEP_MS (SWEEP_MS_PHONE on a phone)
const SWEEP_AT = 1050;
const SWEEP_QUIET = 250;
const SWEEP_TURN = 15;
const SWEEP_MS = 3000;
const SWEEP_MS_PHONE = 2200;
// Passing a measured line, in per cent of the frame: it is lit within GRAB of the seam, until the seam is past RELEASE
const SNAP_GRAB = 0.8;
const SNAP_RELEASE = 1.4;
// While a pointer moves the seam, the rest of the sheet is told at most this often, ms (ProofContour's COMMIT_EVERY); a
// mouse leading the seam closes FOLLOW_EASE of the way left on each frame
const COMMIT_EVERY = 100;
const FOLLOW_EASE = 0.32;
// The four that carry the seam's place (ProofContour; home-v2.css registers --split not inherited, so the stage keeps
// its initial 62 %): the right side's window and its counter-moved content, the rail, the handle
const CARRIERS = ['.hv2-contour-pane', '.hv2-contour-pane-inner', '.hv2-contour-rail', '.hv2-contour-handle'];
// The right side's own copy of the measured lines (role="img"), and the photo's (aria-hidden, shown by «Контур на фото»)
const PANE_LINES = '.hv2-contour-pane svg.hv2-contour-lines';
const PHOTO_LINES = 'svg.hv2-contour-lines[data-on-photo]';
// A phone's close-up of the gable (≤ 760 px): the canvas 1.22 × the frame's width, 19.46 % of it off to the left, so a
// per cent of the canvas stands at (per cent × ZOOM − LEFT) of the frame — the photo's columns 245–1504 and rows 92–738;
// there the sweep turns at 1 %, just past the gable's left corner
const PHONE_ZOOM = 1.22;
const PHONE_LEFT = 19.46;
const PHONE_TOP_ROW = 92;
const SWEEP_TURN_PHONE = 1;
const onStage = (canvas: number, phone: boolean) => (phone ? canvas * PHONE_ZOOM - PHONE_LEFT : canvas);
const onCanvas = (stage: number, phone: boolean) => (phone ? (stage + PHONE_LEFT) / PHONE_ZOOM : stage);
const phoneOf = (page: Page) => page.viewportSize()!.width <= 760;
const LAYERS = ['Контур', 'Каркас', 'Сніг', 'Вітер'];
// Each load's way as the legend writes it (ProofContour's CHAINS): word by word, each word lit with its part of the
// drawing — the part that carries the same --n in ProofFrame (the wind skips 1: its lift has no word of its own)
const CHAINS = {
  load: {
    button: 'Сніг', group: '.hv2-proof-load',
    words: [
      ['Сніг', 0, '.hv2-proof-snow'], ['покрівля', 1, '.hv2-proof-roof'], ['прогони', 2, '.hv2-proof-bearing'], ['ферма', 3, '.hv2-proof-lit-truss'],
      ['стіни й колони', 4, '.hv2-proof-link[data-link="4"]'], ['фундаменти', 5, '.hv2-proof-link[data-link="5"]'], ['ґрунт', 6, '.hv2-proof-ground'],
    ],
  },
  wind: {
    button: 'Вітер', group: '.hv2-proof-wind',
    words: [
      ['Вітер', 0, '.hv2-proof-gusts'], ['стіна', 2, '.hv2-proof-link[data-link="2"]'], ['ферма', 3, '.hv2-proof-link[data-link="3"]'],
      ['стіна й колона', 4, '.hv2-proof-link[data-link="4"]'], ['фундаменти', 5, '.hv2-proof-link[data-link="5"]'], ['ґрунт', 6, '.hv2-proof-reactions'],
    ],
  },
} as const;
type Load = keyof typeof CHAINS;
const lineOf = (id: string) => homeProofContour.lines.find((line) => line.id === id)!;
/** A measured vertical's mean x, in per cent of the canvas: where the seam lights it */
const meanX = (id: string, from: number, to?: number) => {
  const part = lineOf(id).points.slice(from, to);
  return (part.reduce((sum, [x]) => sum + x, 0) / part.length / homeProofContour.photo.width) * 100;
};
// What the seam lights: the gates' jambs and the gable's corners — never the ridge, which nobody measured. Its words say
// «наближено» exactly where the line is approximate
const SNAPS = [
  { line: 'gable-base', at: meanX('gable-base', 1), name: 'Лівий кут фронтона' },
  { line: 'gate-left', at: meanX('gate-left', 0, 2), name: 'Ліві ворота, одвірок' },
  { line: 'gate-left', at: meanX('gate-left', 2), name: 'Ліві ворота, одвірок' },
  { line: 'gate-right', at: meanX('gate-right', 0, 2), name: 'Праві ворота, одвірок' },
  { line: 'gate-right', at: meanX('gate-right', 2), name: 'Праві ворота, одвірок' },
  { line: 'gable-corner-right', at: meanX('gable-corner-right', 2), name: 'Правий кут фронтона' },
].map((snap) => ({ ...snap, status: lineOf(snap.line).approximate ? 'наближено' : 'виміряно' }));
type Snap = (typeof SNAPS)[number];
/** The seam's place in tenths of a per cent, as its four carriers' --split has it */
const tenths = (value: number) => `${Math.round(value * 10) / 10}%`;
const rgb = (color: string) => (color.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number);
/** How far apart two colours are: the largest difference in a channel */
const apart = (a: string, b: string) => Math.max(...rgb(a).map((value, index) => Math.abs(value - rgb(b)[index])));
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
  // The photo, loaded (it may still be painting after that: steadyShot). The tracing's copy of it is the quiet tracing's
  // own test, so a tracing that never loads fails there, not in every test
  await page.waitForFunction(() => {
    const image = document.querySelector<HTMLImageElement>('#real-object .hv2-contour-canvas > picture img');
    return Boolean(image?.complete && image.naturalWidth > 0);
  });
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

/** The four carriers' --split: one value while they move as one, else each named (never the stage's: it has none) */
function splitOf(stage: Locator) {
  return stage.evaluate((element, carriers) => {
    const values = carriers.map((selector) => getComputedStyle(element.querySelector(selector)!).getPropertyValue('--split'));
    return new Set(values).size === 1 ? values[0] : carriers.map((selector, index) => `${selector} ${values[index]}`).join(', ');
  }, CARRIERS);
}

/** The right side as a window (ProofContour): its left edge in per cent of the frame — where it uncovers the drawing —
 *  and whether it clips what it holds there; how far its content stands off the frame, and its canvas off the photo's,
 *  px (none: the window moves, the drawing never slides). Whatever lies in it is drawn right of that edge only */
function windowOf(stage: Locator) {
  return stage.evaluate((element) => {
    const frame = element.getBoundingClientRect();
    const pane = element.querySelector<HTMLElement>('.hv2-contour-pane')!;
    const [box, inner, photo, drawing] = [pane, pane.querySelector('.hv2-contour-pane-inner')!, element.querySelector(':scope > .hv2-contour-canvas')!, pane.querySelector('.hv2-contour-canvas')!]
      .map((part) => part.getBoundingClientRect());
    return {
      edge: ((box.left - frame.left) / frame.width) * 100,
      clips: getComputedStyle(pane).overflow === 'hidden',
      inner: Math.abs(inner.left - frame.left),
      drift: Math.max(...(['left', 'top', 'width', 'height'] as const).map((side) => Math.abs(drawing[side] - photo[side]))),
    };
  });
}

/** The window's edge at `value` per cent of the frame (polled: a glide reaches it on a later frame), clipping there, its
 *  content and its canvas standing exactly where the photo's do */
async function expectWindow(stage: Locator, value: number, message?: string) {
  await expect.poll(async () => (await windowOf(stage)).edge, message).toBeCloseTo(value, 2);
  const { clips, inner, drift } = await windowOf(stage);
  expect({ clips, inner: inner < 0.05, drift: drift < 0.05 }, `${message ?? ''} inner ${inner} px, drift ${drift} px`).toEqual({ clips: true, inner: true, drift: true });
}

/** A load's tint as the legend writes it: the colour of its way's words — the tint is the key, no line is drawn */
const tintOf = (sheet: Locator, load: Load) => sheet.locator(`.hv2-contour-legend-chain[data-load="${load}"] > span:not([data-key])`).first().evaluate((word) => getComputedStyle(word).color);

/** A load's way as the legend writes it, read with reduced motion (no word mid-way through its light): the active
 *  layer's set — the only one shown — holds one chain: its key first, not drawn (compact, so the title block keeps its
 *  height on a laptop — review, 05.10: the tint is the key), then each link's word in that tint, in the way's order,
 *  each with the --n of its part of the drawing (so the word lights with it). Nothing of it is on the frame or in a
 *  phone's facts any more (review, 04.10: no free room there on a laptop) */
async function expectChain(sheet: Locator, load: Load, tint: string) {
  const sets = await sheet.locator('.hv2-contour-legend-set').evaluateAll((elements) => elements.map((element) => ({
    layer: (element as HTMLElement).dataset.layer, on: 'on' in (element as HTMLElement).dataset, visibility: getComputedStyle(element).visibility,
  })));
  expect(sets.filter((set) => set.visibility === 'visible'), load).toEqual([{ layer: load, on: true, visibility: 'visible' }]);
  const chain = sheet.locator(`.hv2-contour-legend-set[data-layer="${load}"] > .hv2-contour-legend-chain`);
  await expect(chain).toHaveCount(1);
  await expect(chain).toHaveAttribute('data-load', load);
  await expect(chain).toBeVisible();
  const parts = await chain.evaluate((element) => [...element.children].map((child) => ({
    key: (child as HTMLElement).dataset.key ?? null, text: child.textContent, n: (child as HTMLElement).style.getPropertyValue('--n'),
    color: getComputedStyle(child).color, drawn: getComputedStyle(child).display !== 'none',
  })));
  const [lead] = parts;
  expect({ key: lead.key, text: lead.text, n: lead.n, drawn: lead.drawn }, load).toEqual({ key: load, text: '', n: '', drawn: false });
  expect(parts.slice(1).map(({ key, text, n, drawn }) => [key, text, Number(n), drawn]), load).toEqual(CHAINS[load].words.map(([word, n]) => [null, word, n, true]));
  for (const part of parts.slice(1)) expect(part.color, `${load} ${part.text}`).toBe(tint);
  const stage = sheet.locator('.hv2-contour-stage');
  for (const [word, n, part] of CHAINS[load].words) {
    const steps = await stage.locator(`${CHAINS[load].group} > ${part}`).evaluateAll((elements) => elements.map((element) => (element as SVGElement).style.getPropertyValue('--n')));
    expect(steps.length, `${load} ${word}`).toBeGreaterThan(0);
    expect(new Set(steps), `${load} ${word}`).toEqual(new Set([String(n)]));
  }
  await expect(stage.locator('.hv2-contour-chain')).toHaveCount(0);
  await expect(sheet.locator('.hv2-contour-chain-text')).toHaveCount(0);
}

/** Where the stage puts the seam for a pointer at clientX, held `offset` off it (ProofContour's splitAt), unrounded, in
 *  per cent of the frame — the page's own sum, so the expectation is the page's to the last tenth */
function pointerAt(stage: Locator, clientX: number, offset = 0) {
  return stage.evaluate((element, [x, by]) => {
    const box = element.getBoundingClientRect();
    return Math.min(100, Math.max(0, ((x - by - box.left) / box.width) * 100));
  }, [clientX, offset] as const);
}

/** The seam as drawn and what it lights: --split, data-snapped, the measured lines marked lit (casing and ink), and the
 *  paths of the lit line's copy over the photo */
function seamState(stage: Locator) {
  return stage.evaluate((element, carriers) => {
    const splits = carriers.map((selector) => getComputedStyle(element.querySelector(selector)!).getPropertyValue('--split'));
    return {
      // the four carriers as one, or each named
      split: new Set(splits).size === 1 ? splits[0] : carriers.map((selector, index) => `${selector} ${splits[index]}`).join(', '),
      snapped: element.dataset.snapped ?? null,
      // both copies of the lines, the photo's and the right side's
      lines: [...element.querySelectorAll<SVGPathElement>('.hv2-contour-lines path[data-snapped]')]
        .map((path) => `${path.closest('.hv2-contour-pane') ? 'pane' : 'photo'} ${path.parentElement!.getAttribute('class')} ${path.dataset.line}`),
      held: element.querySelectorAll('svg.hv2-contour-held path').length,
    };
  }, CARRIERS);
}

/** Which measured line a seam moved by a pointer lights (ProofContour's splitAt): the first within GRAB of it, kept until
 *  the seam is past RELEASE; `caught` counts the lines it has lit (a finger feels each) */
function litModel(phone: boolean) {
  let lit: Snap | null = null;
  let caught = 0;
  return {
    move(value: number) {
      const near = lit && Math.abs(value - onStage(lit.at, phone)) < SNAP_RELEASE
        ? lit
        : SNAPS.find((snap) => Math.abs(value - onStage(snap.at, phone)) < SNAP_GRAB) ?? null;
      if (near && near !== lit) caught += 1;
      lit = near;
    },
    reset() { lit = null; },
    get lit() { return lit; },
    get caught() { return caught; },
    /** The seamState a seam at `value` shows */
    state(value: number) {
      return lit
        ? { split: tenths(value), snapped: '', lines: ['photo', 'pane'].flatMap((copy) => [`${copy} hv2-contour-casing ${lit!.line}`, `${copy} hv2-contour-ink ${lit!.line}`]), held: 2 }
        : { split: tenths(value), snapped: null, lines: [], held: 0 };
    },
  };
}

/** clashes() once the frame has settled (the handle reaches a new split on the next frame): none, or what stays */
async function settledClashes(stage: Locator, atRest = false) {
  let found = await clashes(stage, atRest);
  for (let attempt = 0; attempt < 10 && found.length > 0; attempt += 1) {
    await stage.page().waitForTimeout(150);
    found = await clashes(stage, atRest);
  }
  return found;
}

/** The words on the stage that cover one another or run off the frame: the figures, the scheme's names, the stamp, the
 *  seam's names and, while the seam lights a measured line, that line's name (a load's way is the legend's now). What
 *  lies right of the seam is clipped there, so only its visible part counts — but `atRest` (the seam where it rests) a
 *  figure or a name cut by the seam counts too, and so does the handle */
async function clashes(stage: Locator, atRest = false) {
  return stage.evaluate((element, rest) => {
    const frame = element.getBoundingClientRect();
    const split = parseFloat(getComputedStyle(element.querySelector('.hv2-contour-pane')!).getPropertyValue('--split'));
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
    const [left, right] = element.querySelectorAll('.hv2-contour-seamtags > span');
    add(left, '‹ Фото', false);
    add(right, 'seam name right', false);
    // faded out (opacity 0) while no line is lit
    add(element.querySelector('.hv2-contour-snap'), 'lit line’s name', false);
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

/** One frame of the first view as the page drew it: the stage's data-sweep, data-gliding, data-pulse and data-following;
 *  the seam's --split (its four carriers', and how far apart they are) and where the seam is drawn; where the right
 *  side's window has its edge (per cent of the frame) and how far its drawing stands off the photo's canvas (px); the
 *  script animations of --split on the carriers (the sweep's); the range's value; the figures' and the names' opacity;
 *  whether the picture is still plotting in; the handle's rings; whatever else animates on the stage */
type Frame = {
  t: number; sweep: string | null; gliding: boolean; pulse: boolean; following: boolean; split: number; spread: number; seam: number; window: number; drift: number;
  sweeps: number; range: string; words: number[]; plotting: boolean; rings: string; others: string[];
};
/** The frames, and when the sheet arrived, the sweep started and the seam stopped waiting or sweeping, and the page
 *  scrolled; and every layout shift meanwhile, by what shifted */
type Arrival = { frames: Frame[]; on: number | null; run: number | null; ended: number | null; scrolls: number[]; shifts: string[][]; done: boolean };

/** Records every frame of the first view in the page itself — a test's polls are too far apart for a three-second
 *  sweep — until 2.5 s after the seam stops waiting or sweeping (the rings have rung by then) */
async function recordArrival(page: Page) {
  await page.evaluate((selectors) => {
    const stage = document.querySelector<HTMLElement>('#real-object .hv2-contour-stage')!;
    const sheet = stage.closest('figure')!;
    const image = sheet.querySelector('.sheet-image')!;
    const handle = stage.querySelector('.hv2-contour-handle')!;
    const carriers = selectors.map((selector) => stage.querySelector(selector)!);
    const [pane] = carriers;
    const photo = stage.querySelector(':scope > .hv2-contour-canvas')!;
    const drawing = pane.querySelector('.hv2-contour-canvas')!;
    const arrival = { frames: [] as unknown[], on: null as number | null, run: null as number | null, ended: null as number | null, scrolls: [] as number[], shifts: [] as string[][], done: false };
    Object.assign(window, { arrival });
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        arrival.shifts.push((entry as unknown as { sources: { node?: Node }[] }).sources.map(({ node }) => (node instanceof Element ? node.getAttribute('class') ?? node.nodeName : String(node))));
      }
    }).observe({ type: 'layout-shift' });
    new MutationObserver(() => {
      const now = performance.now();
      if (arrival.on === null && sheet.dataset.sheetState === 'on') arrival.on = now;
      if (arrival.run === null && stage.dataset.sweep === 'run') arrival.run = now;
      if (arrival.ended === null && arrival.on !== null && stage.dataset.sweep === undefined) arrival.ended = now;
    }).observe(sheet, { attributes: true, subtree: true, attributeFilter: ['data-sheet-state', 'data-sweep'] });
    addEventListener('scroll', () => arrival.scrolls.push(performance.now()), { passive: true });
    const opacity = (selector: string) => Number(getComputedStyle(stage.querySelector(selector)!).opacity);
    // The sweep's own: a script's animation of --split on a carrier
    const sweeping = (animation: Animation) => {
      const effect = animation.effect as KeyframeEffect | null;
      return !(animation instanceof CSSAnimation) && !(animation instanceof CSSTransition) && carriers.includes(effect?.target as Element)
        && (effect?.getKeyframes() ?? []).every((keyframe) => '--split' in keyframe);
    };
    const tick = () => {
      const frame = stage.getBoundingClientRect();
      const seam = stage.querySelector('.hv2-contour-seam')!.getBoundingClientRect();
      const [box, inside, under] = [pane, drawing, photo].map((part) => part.getBoundingClientRect());
      const splits = carriers.map((carrier) => parseFloat(getComputedStyle(carrier).getPropertyValue('--split')));
      const rings = getComputedStyle(handle, '::after');
      const animations = document.getAnimations().filter((animation) => {
        const target = (animation.effect as KeyframeEffect | null)?.target;
        return target && target !== stage && stage.contains(target);
      });
      arrival.frames.push({
        t: performance.now(),
        sweep: stage.dataset.sweep ?? null,
        gliding: stage.dataset.gliding !== undefined,
        pulse: stage.dataset.pulse !== undefined,
        following: stage.dataset.following !== undefined,
        split: splits[0],
        spread: Math.max(...splits) - Math.min(...splits),
        seam: ((seam.left + seam.width / 2 - frame.left) / frame.width) * 100,
        window: ((box.left - frame.left) / frame.width) * 100,
        drift: Math.max(Math.abs(inside.left - under.left), Math.abs(inside.top - under.top), Math.abs(inside.width - under.width)),
        sweeps: animations.filter(sweeping).length,
        range: stage.querySelector<HTMLInputElement>('.hv2-contour-range')!.value,
        words: [opacity('.hv2-proof-labels'), opacity('svg.hv2-proof-marks')],
        plotting: image.getAnimations().some((animation) => animation.playState === 'running'),
        rings: `${rings.animationName} ${rings.animationIterationCount}`,
        others: animations.filter((animation) => !sweeping(animation))
          .map((animation) => (animation as CSSAnimation).animationName ?? (animation as CSSTransition).transitionProperty ?? 'script'),
      });
      if ((arrival.ended !== null && performance.now() - arrival.ended > 2500) || arrival.frames.length > 3000) arrival.done = true;
      else requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, CARRIERS);
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
  await expect(layers.getByRole('button')).toHaveText(LAYERS);
  await expect(layers.getByRole('button', { name: 'Каркас' })).toHaveAttribute('aria-pressed', 'true');
  await expect(stage.locator('.hv2-contour-stamp')).toHaveText(/Схема · без розмірів\s*каркас такого типу, як на цьому об’єкті/);
  await expect(stage.locator('.hv2-contour-canvas > picture img')).toHaveAttribute('src', homeProofContour.photo.src);

  // The lines: one per record, the approximate ones dashed, each with its words, in the photo's own pixels — the right
  // side's copy, and the same lines once more in the photo's (aria-hidden: «Контур на фото» shows it)
  const lines = stage.locator(`${PANE_LINES} .hv2-contour-ink path`);
  await expect(lines).toHaveCount(homeProofContour.lines.length);
  expect(await lines.evaluateAll((paths) => paths.map((path) => path.getAttribute('data-line')))).toEqual(homeProofContour.lines.map((line) => line.id));
  await expect(stage.locator(`${PANE_LINES} .hv2-contour-ink path[data-approximate]`)).toHaveCount(homeProofContour.lines.filter((line) => line.approximate).length);
  await expect(stage.locator('svg.hv2-contour-lines')).toHaveCount(2);
  await expect(stage.locator(PHOTO_LINES)).toHaveAttribute('aria-hidden', 'true');
  expect(await stage.locator(`${PHOTO_LINES} path`).evaluateAll((paths) => paths.map((path) => [path.parentElement!.getAttribute('class'), path.getAttribute('data-line'), path.getAttribute('d')])))
    .toEqual(await stage.locator(`${PANE_LINES} path`).evaluateAll((paths) => paths.map((path) => [path.parentElement!.getAttribute('class'), path.getAttribute('data-line'), path.getAttribute('d')])));
  // …solid on the scheme's layers (owner, 04.10: one outline there), dashed in «Контур», where the legend reads them —
  // in both copies alike
  const approximate = stage.locator('svg.hv2-contour-lines .hv2-contour-ink path[data-approximate]');
  await expect(approximate).toHaveCount(2 * homeProofContour.lines.filter((line) => line.approximate).length);
  for (const path of await approximate.all()) {
    expect(await path.evaluate((element) => getComputedStyle(element).strokeDasharray)).toBe('none');
  }
  await layers.getByRole('button', { name: 'Контур' }).click();
  for (const path of await approximate.all()) {
    expect(await path.evaluate((element) => getComputedStyle(element).strokeDasharray)).toMatch(/^[\d.]+px,? [\d.]+px$/);
  }
  await layers.getByRole('button', { name: 'Каркас' }).click();
  for (const svg of ['svg.hv2-contour-lines', 'svg.hv2-proof-frame', 'svg.hv2-proof-marks']) {
    expect(new Set(await stage.locator(svg).evaluateAll((elements) => elements.map((element) => element.getAttribute('viewBox')))), svg)
      .toEqual(new Set([`0 0 ${homeProofContour.photo.width} ${homeProofContour.photo.height}`]));
  }
  // Under role="img" the lines' own titles reach no one: the accessible names say which lines are approximate, and
  // what the scheme is and is not
  await expect(stage.getByRole('img', { name: homeProofContour.label })).toBeVisible();
  await expect(stage.getByRole('img', { name: homeProofFrame.label, exact: true })).toBeVisible();
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
  expect(homeProofFrame.windLabel).not.toMatch(/\d/);
  await expect(stage.getByRole('slider', { name: SLIDER })).toHaveAttribute('aria-valuetext', 'Фото ліворуч, схема праворуч: більше фото');
  for (const words of [await sheet.innerText(), text, homeProofFrame.label, homeProofFrame.windLabel, await page.locator('#real-object').evaluate((element) => element.textContent ?? '')]) {
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
  expect(await stage.locator(`${PANE_LINES} .hv2-contour-ink path`).first().evaluate((path) => getComputedStyle(path).stroke)).toBe(COPPER);
  const hidden = scheme.locator('.hv2-proof-scheme [data-hidden]');
  await expect(hidden).toHaveCount(homeProofFrame.members.filter((member) => member.hidden).length);
  expect(new Set(await hidden.evaluateAll((paths) => paths.map((path) => getComputedStyle(path).stroke)))).toEqual(new Set([COPPER]));
  expect(new Set(await scheme.locator('.hv2-proof-scheme [data-group]').evaluateAll((paths) => paths.map((path) => getComputedStyle(path).strokeDasharray)))).not.toContainEqual(expect.stringMatching(/px,? [\d.]+px$/));
  expect(await hidden.evaluateAll((paths) => paths.every((path) => Number(path.getAttribute('data-depth')) > 0))).toBe(true);
  // Line weights on a drawing's scale (owner, 04.10): the measured outline heaviest; the gable's chords, its columns and
  // what the section cuts one step down; its webs another; the blockwork finest. Square ends and sharp joins, as a
  // plotter draws them (the outline's approximate pieces are the «Контур» layer's to tell apart)
  const weight = (selector: string) => stage.locator(selector).first().evaluate((element) => parseFloat(getComputedStyle(element).strokeWidth));
  const outline = await weight(`${PANE_LINES} .hv2-contour-ink path[data-kind="outline"]:not([data-approximate])`);
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
  // Every word on the frame stands on a dark backing that masks what runs under it, as a drawing's text does — not on a
  // text-shadow (owner, 04.10: «текст залазить на елемент»)
  for (const word of await stage.locator('.hv2-proof-labels > :is(.hv2-proof-tag, .hv2-proof-measure)').all()) {
    const look = await word.evaluate((element) => ({ background: getComputedStyle(element).backgroundColor, shadow: getComputedStyle(element).textShadow }));
    const [r, g, b, alpha = 1] = (look.background.match(/[\d.]+/g) ?? []).map(Number);
    expect(Math.max(r, g, b), look.background).toBeLessThan(40);
    expect(alpha, look.background).toBeGreaterThanOrEqual(0.85);
    expect(look.shadow).toBe('none');
  }

  // The stamp belongs to the right side and lies on it only — in its window, cut at the seam with it: in full while that
  // side has room for it, its first word where it has not, none at all where not even that fits (never a fragment —
  // review, 04.10: «ХЕМА»), never over the photo and never under «‹ Фото»
  await expect(stage.locator('.hv2-contour-pane .hv2-contour-corner .hv2-contour-stamp')).toHaveCount(1);
  await expect(stage.locator('.hv2-contour-stamp')).toHaveCount(1);
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
    await expectWindow(stage, value, `${value}`);
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

test('the snow is drawn in its own tint, as a drawing writes it, and lights the members it passes in the scheme’s paper on a casing — weight, no glow, nothing in the measured copper', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const { stage, layers } = await open(page);
  await layers.getByRole('button', { name: 'Сніг' }).click();
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
  // (the legend's tint: its words', the tint being the key)
  const load = await tintOf(page.locator('#real-object .hv2-contour'), 'load');
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
  const links = stage.locator('.hv2-proof-load .hv2-proof-link');
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
  // The drops are the legend's dotted line in the snow's tint; the legend writes the snow's way after it, word by word
  expect(await strokesOf('.hv2-proof-load .hv2-proof-flow')).toEqual(new Set([load]));
  await expectChain(page.locator('#real-object .hv2-contour'), 'load', load);
  // …and the scheme keeps its own name: the wind's way is not said on the snow's layer
  await expect(stage.getByRole('img', { name: homeProofFrame.label, exact: true })).toBeVisible();
});

test('the wind is its own layer in a cool tint of its own: gusts on the wall, lift off the roof, its links in the scheme’s paper on a casing, its drops to the footings and the ground’s answer — never the snow’s tint or the measured copper', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const { sheet, stage, slider, layers } = await open(page);
  const desktop = !phoneOf(page);
  const { wind } = homeProofFrame;
  await layers.getByRole('button', { name: 'Вітер' }).click();
  for (const button of await layers.getByRole('button').all()) {
    await expect(button).toHaveAttribute('aria-pressed', String((await button.textContent()) === 'Вітер'));
  }
  const group = stage.locator('.hv2-proof-wind');
  await expect(group).toBeVisible();
  await expect(stage.locator('.hv2-proof-load')).toBeHidden();
  // The scheme stepped back under it, still the scheme: its stamp, and its name for a screen reader — which now says the
  // wind's way too (review, 04.10)
  expect(Number(await stage.locator('.hv2-proof-scheme').evaluate((element) => getComputedStyle(element).opacity))).toBeLessThan(0.6);
  await expect(stage.locator('.hv2-contour-stamp')).toContainText('Схема · без розмірів');
  await expect(slider).toHaveAccessibleName('Порівняти фото й схему');
  await expect(stage.getByRole('img', { name: `${homeProofFrame.label} ${homeProofFrame.windLabel}`, exact: true })).toBeVisible();

  // Its tint: the legend's (its words' — the tint is the key), cool, and far from the snow's, the measured copper and the
  // scheme's paper — the two loads never read as one (owner, 04.10: «розумно кольорів»)
  await expect(sheet.locator('.hv2-contour-legend-set[data-on] > .hv2-contour-legend-chain[data-load="wind"]')).toBeVisible();
  const [tint, snow] = [await tintOf(sheet, 'wind'), await tintOf(sheet, 'load')];
  for (const other of [snow, COPPER, PAPER]) expect(apart(tint, other), `${tint} / ${other}`).toBeGreaterThan(60);
  expect(rgb(tint)[2]).toBeGreaterThan(rgb(tint)[0]);

  // Every part of it, each in that tint: the gusts and the lift headed with the wind's own arrowhead, the drops the
  // legend's dotted line headed with its foot, the ground's answer at each footing
  const parts = async (selector: string) => stage.locator(selector).evaluateAll((paths) => paths.map((path) => ({
    stroke: getComputedStyle(path).stroke, dash: getComputedStyle(path).strokeDasharray, head: path.getAttribute('marker-end'),
  })));
  // The gusts in two sizes, one shown at a time: the long ones where the frame has room, the short ones in a phone's
  // close-up, whose right edge is the photo's column 1504 (review, 04.10: they ran off it) — each on its data's points
  const gusts = stage.locator('.hv2-proof-wind > .hv2-proof-gusts');
  expect(await gusts.evaluateAll((groups) => groups.map((group) => ({
    size: group.getAttribute('data-size'), n: (group as SVGElement).style.getPropertyValue('--n'), shown: getComputedStyle(group).display !== 'none',
    paths: [...group.querySelectorAll('path')].map((path) => path.getAttribute('d')),
  })))).toEqual([
    { size: 'wide', n: '0', shown: desktop, paths: wind.gustsWide.map(([[x0, y0], [x1, y1]]) => `M${x0} ${y0}L${x1} ${y1}`) },
    { size: 'narrow', n: '0', shown: !desktop, paths: wind.gusts.map(([[x0, y0], [x1, y1]]) => `M${x0} ${y0}L${x1} ${y1}`) },
  ]);
  for (const [selector, count, head] of [
    ['.hv2-proof-gusts[data-size="wide"] path', wind.gustsWide.length, 'url(#hv2-proof-head-wind)'],
    ['.hv2-proof-gusts[data-size="narrow"] path', wind.gusts.length, 'url(#hv2-proof-head-wind)'],
    ['.hv2-proof-lift path', wind.lift.length, 'url(#hv2-proof-head-wind)'],
    ['.hv2-proof-wind > .hv2-proof-flow', wind.legs.length, 'url(#hv2-proof-foot-wind)'],
    ['.hv2-proof-reactions path', wind.reactions.length, 'url(#hv2-proof-head-wind)'],
  ] as const) {
    const found = await parts(selector);
    expect(found, selector).toHaveLength(count);
    for (const part of found) expect({ stroke: part.stroke, head: part.head }, selector).toEqual({ stroke: tint, head });
  }
  for (const part of await parts('.hv2-proof-wind > .hv2-proof-flow')) expect(part.dash).toMatch(/^[\d.]+px,? [\d.]+px$/);
  for (const id of ['hv2-proof-head-wind', 'hv2-proof-foot-wind']) {
    expect(await page.locator(`#real-object marker#${id} path`).evaluate((path) => getComputedStyle(path).fill), id).toBe(tint);
  }
  // Nothing of it in the snow's tint, or a solid line or a fill in the measured copper
  const all = await stage.locator('.hv2-proof-wind :is(path, rect, circle)').evaluateAll((elements) => elements.map((element) => {
    const style = getComputedStyle(element);
    return { kind: element.getAttribute('class') ?? element.parentElement?.getAttribute('class') ?? '', stroke: style.stroke, fill: style.fill, dash: style.strokeDasharray };
  }));
  for (const part of all) {
    expect(part.stroke === COPPER && part.dash === 'none', `${part.kind}: ${part.stroke}`).toBe(false);
    expect([part.stroke, part.fill], part.kind).not.toContain(snow);
    expect(part.fill, part.kind).not.toBe(COPPER);
  }

  // Its links — the wall, the truss, the other wall and the column, the footings — lit as the snow's are: a light paper
  // line over a dark, wider casing, no filter
  const links = stage.locator('.hv2-proof-wind .hv2-proof-link');
  await expect(links).toHaveCount(wind.links.length);
  expect(await links.evaluateAll((groups) => groups.map((group) => Number(group.getAttribute('data-link'))))).toEqual(wind.links.map((link) => link.link));
  for (const link of await links.all()) {
    const look = await link.evaluate((group) => {
      const casing = group.querySelector('.hv2-proof-link-casing')!;
      const light = group.querySelector('path:not(.hv2-proof-link-casing)')!;
      const [casingStyle, lightStyle] = [getComputedStyle(casing), getComputedStyle(light)];
      return {
        paths: group.querySelectorAll('path').length, casingFirst: group.firstElementChild === casing, light: lightStyle.stroke,
        casingDark: Math.max(...(casingStyle.stroke.match(/\d+/g) ?? ['255']).slice(0, 3).map(Number)) < 60,
        wider: parseFloat(casingStyle.strokeWidth) > parseFloat(lightStyle.strokeWidth),
        filters: [group, casing, light].map((element) => getComputedStyle(element).filter),
      };
    });
    expect(look).toEqual({ paths: 2, casingFirst: true, light: PAPER, casingDark: true, wider: true, filters: ['none', 'none', 'none'] });
  }

  // Its way in words, in its tint, in the legend under the layers — on a desktop and on a phone alike (the snow's set
  // hidden); a phone's facts stay the measured chips
  await expectChain(sheet, 'wind', tint);
  if (desktop) {
    // the seam's names give way to the frame's top, as for the snow
    await expect(stage.locator('.hv2-contour-seamtags')).toBeHidden();
  } else {
    await expect(sheet.locator('.hv2-contour-facts-slot > *')).toHaveCount(1);
    await expect(sheet.locator('.hv2-contour-facts-slot > .hv2-contour-chips')).toBeVisible();
  }
  // With reduced motion it stands whole, nothing running
  expect(await group.evaluate((element) => element.getAnimations({ subtree: true }).length)).toBe(0);
  // The gusts switch where the phone's close-up begins: the long ones above 760 px, the short ones at 760 and below
  for (const [width, size] of [[761, 'wide'], [760, 'narrow']] as const) {
    await page.setViewportSize({ width, height: 900 });
    await expect.poll(() => gusts.evaluateAll((groups) => groups.filter((each) => getComputedStyle(each).display !== 'none').map((each) => each.getAttribute('data-size'))), `${width}`).toEqual([size]);
  }
});

test('each load replays its way on every press of its button, its words in the legend lit with their parts of the drawing', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  const { sheet, stage, layers } = await open(page);
  // When each of a part's animations started, on the page's clock (one not yet started: now)
  const started = (part: Locator) => part.evaluate((element) => element.getAnimations({ subtree: true }).map((animation) => (animation.startTime === null ? Number(document.timeline.currentTime) : Number(animation.startTime))));
  /** A part's own animation of the given name: its delay, in ms to a thousandth (the calc's sum carries float noise) —
   *  of the first of the parts drawn at this width (the wind's gusts come in two sizes, one shown) */
  const delayOf = (parts: Locator, name: string) => parts.evaluateAll((elements, animationName) => elements
    .find((element) => getComputedStyle(element).display !== 'none')!
    .getAnimations()
    .filter((animation) => (animation as CSSAnimation).animationName === animationName)
    .map((animation) => Math.round(Number(animation.effect!.getTiming().delay) * 1000) / 1000), name);
  for (const load of ['load', 'wind'] as const) {
    const { button, group: selector, words } = CHAINS[load];
    const group = stage.locator(selector);
    const chain = sheet.locator(`.hv2-contour-legend-chain[data-load="${load}"]`);
    await layers.getByRole('button', { name: button }).click();
    await expect.poll(async () => (await started(group)).length, button).toBeGreaterThan(0);
    // Each word of the way lights as its part of the drawing comes in: the same delay, link by link (the key leads)
    const spans = chain.locator(':scope > span:not([data-key])');
    await expect(spans).toHaveText(words.map(([word]) => word));
    for (const [index, [word, n, part]] of words.entries()) {
      const delay = await delayOf(spans.nth(index), 'hv2-contour-link');
      expect(delay, `${button} ${word}`).toEqual([200 + n * 450]);
      expect(await delayOf(group.locator(`:scope > ${part}`), 'hv2-contour-fade'), `${button} ${word}: its part`).toEqual(delay);
    }
    // …well under way, then pressed again: its way and its words drawn anew, from the start
    await page.waitForTimeout(900);
    await group.evaluate((element) => { element.dataset.played = ''; });
    await chain.evaluate((element) => { (element as HTMLElement).dataset.played = ''; });
    const pressed = await page.evaluate(() => Number(document.timeline.currentTime));
    expect(Math.max(...await started(group)), button).toBeLessThan(pressed - 800);
    expect(Math.max(...await started(chain)), button).toBeLessThan(pressed - 800);
    await layers.getByRole('button', { name: button }).click();
    await expect(stage.locator(`${selector}[data-played]`), button).toHaveCount(0);
    await expect(sheet.locator(`.hv2-contour-legend-chain[data-load="${load}"][data-played]`), button).toHaveCount(0);
    for (const part of [group, chain]) {
      const again = await started(part);
      expect(again.length, button).toBeGreaterThan(0);
      expect(Math.min(...again), button).toBeGreaterThanOrEqual(pressed);
    }
  }
});

test('the seam rests between the gates, and nothing of the right side lies over the photo — the contour only when asked', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const { stage, slider } = await open(page);
  const phone = phoneOf(page);
  await expectSplit(slider, stage, DEFAULT_SPLIT);
  // The seam sits right of the left gate and left of the right one, on the photo's own pixels (on a phone, where the
  // close-up puts them)
  const [gateLeft, gateRight] = homeProofContour.lines.filter((line) => line.kind === 'gate');
  const rightmost = Math.max(...gateLeft.points.map(([x]) => x)) / homeProofContour.photo.width * 100;
  const leftmost = Math.min(...gateRight.points.map(([x]) => x)) / homeProofContour.photo.width * 100;
  expect(DEFAULT_SPLIT).toBeGreaterThan(onStage(rightmost, phone));
  expect(DEFAULT_SPLIT).toBeLessThan(onStage(leftmost, phone));

  // Every part of the right side — the tracing, the scheme, its copy of the lines, the figures' marks and words, the stamp
  // — lies in its window and nowhere else, and the window stands at the seam, cut there, the drawing in it on the photo's
  // own canvas (review, 05.10: a window moved by transforms, no clip-path)
  for (const part of ['.hv2-contour-trace', 'svg.hv2-proof-frame', PANE_LINES, 'svg.hv2-proof-marks', '.hv2-proof-labels', '.hv2-contour-corner']) {
    expect(await stage.locator(part).evaluateAll((elements) => elements.map((element) => element.closest('.hv2-contour-pane') !== null)), part).toEqual([true]);
  }
  await expectWindow(stage, DEFAULT_SPLIT);
  // …so pixels of the photo side (clear of the seam, its handle and the seam's names) are the same with and without
  // every layer of the right side: the scheme, the lines, the figures and the names…
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
  // — the photo's own copy of them, shown; the window stays where it was
  const toggle = page.locator('#real-object').getByRole('button', { name: 'Контур на фото', exact: true });
  const onPhoto = () => stage.locator(PHOTO_LINES).evaluate((element) => `${getComputedStyle(element).visibility} ${getComputedStyle(element).opacity}`);
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  expect(await onPhoto()).toMatch(/^hidden /);
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(onPhoto).toBe('visible 1');
  const linesOnPhoto = await steadyShot(page, photoSide);
  expect(await differing(page, linesOnPhoto, withoutLayers)).toBeGreaterThan(200);
  await stage.locator('svg.hv2-proof-frame').evaluate((element) => { (element as SVGElement).style.visibility = 'hidden'; });
  expect(await differing(page, await steadyShot(page, photoSide), linesOnPhoto)).toBeLessThan(SPECKS);
  await stage.locator('svg.hv2-proof-frame').evaluate((element) => { (element as SVGElement).style.visibility = ''; });
  await expectWindow(stage, DEFAULT_SPLIT);
  // Off again: the photo side is the photo alone once more
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  await expect.poll(onPhoto).toMatch(/^hidden /);
  expect(await differing(page, await steadyShot(page, photoSide), withLayers)).toBeLessThan(SPECKS);
  await expectWindow(stage, DEFAULT_SPLIT);
});

test('the title block switches the right side: the contour with its figures, the scheme with its names, each load link by link', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const { sheet, stage, slider, layers } = await open(page);
  const desktop = (await page.viewportSize())!.width > 760;
  const figure = (id: string) => stage.locator(`.hv2-proof-measure[data-measure="${id}"]`);
  const pressed = async (name: string) => {
    for (const button of await layers.getByRole('button').all()) {
      await expect(button).toHaveAttribute('aria-pressed', String((await button.textContent()) === name));
    }
  };
  // The legend's width is its cell's, never its own (contain: inline-size): a load's way in one line widened the cell and
  // squeezed the note (review, 04.10) — the note keeps one width whichever layer is on
  await expect(sheet.locator('.hv2-contour-legend')).toHaveCSS('contain', 'inline-size');
  const noteWidth = () => sheet.locator('.sheet-cell-note').evaluate((element) => element.getBoundingClientRect().width);
  const note = await noteWidth();

  // «Каркас»: the scheme, its names, the three figures' titles; the loads wait
  await expect(stage.locator('.hv2-proof-scheme')).toBeVisible();
  for (const load of ['.hv2-proof-load', '.hv2-proof-wind']) await expect(stage.locator(load)).toBeHidden();
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

  await expect(stage.getByRole('img', { name: homeProofFrame.label, exact: true })).toBeVisible();

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

  // «Сніг» and «Вітер»: the scheme stepped back, the load's way lit — the other load's not — and written in the legend,
  // word by word in its tint (on the frame there was no free room for it on a laptop's crop: review, 04.10)
  const loads = [
    { load: 'load', shown: '.hv2-proof-load', hidden: '.hv2-proof-wind', legs: homeProofFrame.load.legs.length, name: homeProofFrame.label },
    { load: 'wind', shown: '.hv2-proof-wind', hidden: '.hv2-proof-load', legs: homeProofFrame.wind.legs.length, name: `${homeProofFrame.label} ${homeProofFrame.windLabel}` },
  ] as const;
  for (const { load, shown, hidden, legs, name } of loads) {
    const { button } = CHAINS[load];
    await layers.getByRole('button', { name: button }).click();
    await pressed(button);
    await expect(stage.locator(shown)).toBeVisible();
    await expect(stage.locator(hidden)).toBeHidden();
    expect(Number(await stage.locator('.hv2-proof-scheme').evaluate((element) => getComputedStyle(element).opacity))).toBeLessThan(0.6);
    await expect(stage.locator(`${shown} .hv2-proof-flow`)).toHaveCount(legs);
    await expect(figure('slope')).toBeHidden();
    // the legend's words in the tint the drawing's load is drawn in
    const tint = await tintOf(sheet, load);
    expect(await stage.locator(`${shown} .hv2-proof-flow`).first().evaluate((path) => getComputedStyle(path).stroke), button).toBe(tint);
    await expectChain(sheet, load, tint);
    // the scheme's name for a screen reader: the wind's way said on «Вітер» only
    await expect(stage.getByRole('img', { name, exact: true })).toBeVisible();
    expect(await noteWidth(), button).toBe(note);
    if (!desktop) {
      // its way down the frame wants the wider right side
      await expectSplit(slider, stage, 40);
      // the phone's facts stay the measured chips
      await expect(sheet.locator('.hv2-contour-facts-slot > *')).toHaveCount(1);
      await expect(sheet.locator('.hv2-contour-chips > span')).toHaveText(['Схил ≈ 10,5° ± 0,6°', 'Ворота однакові']);
    }
    // With reduced motion the way stands lit, nothing running
    expect(await stage.locator(shown).evaluate((element) => element.getAnimations({ subtree: true }).length)).toBe(0);
  }
  // the snow as a drawing writes a spread load: its comb's line and the arrows down from it
  await expect(stage.locator('.hv2-proof-snow path')).toHaveCount(homeProofFrame.load.arrows.length + 1);

  // And back: the default layer, the seam where the visitor left it, the legend's keys again — no way written
  await layers.getByRole('button', { name: 'Каркас' }).click();
  await pressed('Каркас');
  for (const load of ['.hv2-proof-load', '.hv2-proof-wind']) await expect(stage.locator(load)).toBeHidden();
  for (const chain of await sheet.locator('.hv2-contour-legend-chain').all()) await expect(chain).toBeHidden();
  await expect(sheet.locator('.hv2-contour-legend-set[data-on]')).toHaveAttribute('data-layer', 'frame');
  await expect(sheet.locator('.hv2-contour-legend-set[data-on] > span')).toHaveText(['контур', 'схема', 'у глибині']);
  await expect(stage.getByRole('img', { name: homeProofFrame.label, exact: true })).toBeVisible();
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

test('passing a measured line the seam lights it over the photo and names it at its top, but never holds there: it stands exactly where the pointer puts it; past RELEASE the light goes; the keys never light one', async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const touch = testInfo.project.name !== 'desktop-chromium';
  // The phone's tick, recorded: one per line lit, and from a finger only
  await page.addInitScript(() => {
    const ticks: unknown[] = [];
    Object.assign(window, { ticks });
    Object.defineProperty(Navigator.prototype, 'vibrate', { configurable: true, value: (pattern: unknown) => ticks.push(pattern) > 0 });
  });
  const { stage, slider } = await open(page);
  const phone = phoneOf(page);
  const model = litModel(phone);
  const ticks = () => page.evaluate(() => (window as unknown as { ticks: unknown[] }).ticks);
  const caught = () => (touch ? Array.from({ length: model.caught }, () => 6) : []);
  // The left gate's right jamb, the measured line next to the resting seam — on a phone where the close-up puts it
  const jamb = SNAPS[2];
  const at = onStage(jamb.at, phone);
  expect(Math.abs(DEFAULT_SPLIT - at)).toBeGreaterThan(SNAP_RELEASE);
  const name = stage.locator('.hv2-contour-snap');
  const ink = stage.locator(`${PANE_LINES} .hv2-contour-ink path[data-line="${jamb.line}"]`);
  const look = () => ink.evaluate((path) => ({ stroke: getComputedStyle(path).stroke, width: parseFloat(getComputedStyle(path).strokeWidth) }));
  const plain = await look();
  expect(plain.stroke).toBe(COPPER);

  // The handle taken where it is drawn, in whole pixels: a mouse could take the frame anywhere, a finger takes only the
  // handle. A mouse over it leads the seam first (no press needed), so the handle is measured once the seam stands there
  const frame = (await stage.boundingBox())!;
  const handle = stage.locator('.hv2-contour-handle');
  let grip = (await handle.boundingBox())!;
  const y = Math.round(grip.y + grip.height / 2);
  let x = Math.round(grip.x + grip.width / 2);
  const cdp = touch ? await page.context().newCDPSession(page) : null;
  const finger = (type: 'touchStart' | 'touchMove' | 'touchEnd', to: number) => cdp!.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x: to, y }] });
  if (!touch) {
    // in from beside the frame: a page's very first mouse event has no movement to read
    await page.mouse.move(Math.round(frame.x - 30), y);
    await page.mouse.move(x, y);
    const value = await pointerAt(stage, x);
    model.move(value);
    await expect.poll(() => seamState(stage)).toEqual(model.state(value));
    grip = (await handle.boundingBox())!;
  }
  // Held off the seam by where the handle was taken (ProofContour's offset), read off the page as the press reads it
  const offset = await handle.evaluate((element, from) => { const box = element.getBoundingClientRect(); return from - (box.left + box.width / 2); }, x);
  if (touch) await finger('touchStart', x);
  else await page.mouse.down();
  // At every whole pixel of the way the seam stands where the pointer puts it, to the tenth — a magnet would hold it on
  // the line — and the line within GRAB of it, or still within RELEASE, is lit. The seam itself is there at once, on the
  // move itself (review, 05.10: drawn on every move, not when the rest of the sheet is told)
  const dragTo = async (value: number) => {
    const to = Math.round(frame.x + (frame.width * value) / 100);
    for (let step = 1; step <= 6; step += 1) {
      const point = Math.round(x + ((to - x) * step) / 6);
      if (touch) await finger('touchMove', point);
      else await page.mouse.move(point, y);
      // «at once» is by the next frame: Chrome hands a finger's moves to the page in step with its frames
      await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())));
      const seam = await pointerAt(stage, point, offset);
      model.move(seam);
      expect(await splitOf(stage), `${point} at once`).toBe(tenths(seam));
      await expect.poll(() => seamState(stage), `${point}`).toEqual(model.state(seam));
    }
    x = to;
    return pointerAt(stage, to, offset);
  };

  // Within GRAB of the jamb: lit, the seam not on it but where the pointer is
  let seam = await dragTo(at + SNAP_GRAB * 0.6);
  expect(model.lit).toBe(jamb);
  expect(tenths(seam)).not.toBe(tenths(at));
  // …the line heavier and out of the measured copper, and drawn once more over both sides, where the lines' own copy is
  // cut off at the seam with its window: in a canvas of its own over the window, on the photo's canvas exactly
  const lit = await look();
  expect(lit.stroke).not.toBe(COPPER);
  expect(lit.width).toBeGreaterThan(plain.width);
  const held = stage.locator('svg.hv2-contour-held');
  await expect(held.locator('path')).toHaveCount(2);
  expect(await held.evaluate((element) => {
    const canvas = element.parentElement!;
    const [over, photo] = [canvas, canvas.parentElement!.querySelector(':scope > .hv2-contour-canvas')!].map((part) => part.getBoundingClientRect());
    return {
      over: canvas.matches('.hv2-contour-stage > .hv2-contour-canvas[data-over]'), inWindow: element.closest('.hv2-contour-pane') !== null,
      above: Number(getComputedStyle(canvas).zIndex) > Number(getComputedStyle(canvas.parentElement!.querySelector('.hv2-contour-pane')!).zIndex),
      onPhoto: Math.max(...(['left', 'top', 'width', 'height'] as const).map((side) => Math.abs(over[side] - photo[side]))) < 0.05,
    };
  })).toEqual({ over: true, inWindow: false, above: true, onPhoto: true });
  expect(new Set(await held.locator('path').evaluateAll((paths) => paths.map((path) => path.getAttribute('d'))))).toEqual(new Set([await ink.getAttribute('d')]));
  // …its name and status at the top of the seam in place of the seam's names, beside it on the side with room, inside the
  // frame, for the eye only; and a finger feels it once
  await expect(name).toHaveCSS('opacity', '1');
  // (its hidden one-line copy, which it is measured by, is not read)
  await expect(name).toHaveText(new RegExp(`^${jamb.name}\\s*${jamb.status}$`), { useInnerText: true });
  await expect(name.locator(':scope > small')).toHaveText('виміряно');
  await expect(stage.locator('.hv2-contour-seamtags')).toBeHidden();
  await expect(name).toHaveAttribute('aria-hidden', 'true');
  const place = await stage.evaluate((element) => {
    const [box, seamBox, label] = [element, element.querySelector('.hv2-contour-seam')!, element.querySelector('.hv2-contour-snap')!].map((part) => part.getBoundingClientRect());
    return { top: label.top - box.top, left: label.left, right: label.right, seam: seamBox.left + seamBox.width / 2, side: element.dataset.snapSide, frameLeft: box.left, frameRight: box.right };
  });
  expect(place.top).toBeCloseTo(10, 0);
  if (place.side === 'left') expect(place.right).toBeCloseTo(place.seam - 10, 0);
  else expect(place.left).toBeCloseTo(place.seam + 10, 0);
  expect(place.left).toBeGreaterThanOrEqual(place.frameLeft);
  expect(place.right).toBeLessThanOrEqual(place.frameRight);
  expect(await ticks()).toEqual(caught());
  expect(caught()).toEqual(touch ? [6] : []);

  // Within RELEASE it stays lit, the seam still the pointer's, and a finger feels nothing more
  await dragTo(at + SNAP_RELEASE * 0.85);
  expect(model.lit).toBe(jamb);
  expect(await ticks()).toEqual(caught());
  // Past RELEASE the light goes: nothing lit, the name fades
  await dragTo(at + SNAP_RELEASE + 0.6);
  expect(model.lit).toBeNull();
  expect((await look()).stroke).toBe(COPPER);
  await expect(name).toHaveCSS('opacity', '0');
  // Back within GRAB from the other side it lights again, with one more tick
  await dragTo(at - SNAP_GRAB * 0.6);
  expect(model.lit).toBe(jamb);
  expect(await ticks()).toEqual(caught());
  // The ridge, which nobody measured, lights nothing
  await dragTo(onStage((lineOf('gable-rake-right').points[0][0] / homeProofContour.photo.width) * 100, phone));
  expect(model.lit).toBeNull();
  // Let go on the jamb: the seam stays where the pointer left it, and the light ends with the drag
  seam = await dragTo(at + SNAP_GRAB * 0.6);
  expect(model.lit).toBe(jamb);
  if (touch) await finger('touchEnd', x);
  else await page.mouse.up();
  model.reset();
  await expect.poll(() => seamState(stage)).toEqual(model.state(seam));
  await expect(name).toHaveCSS('opacity', '0');
  expect(await ticks()).toEqual(caught());

  // The keys step by whole per cent and never light a line, not even on the whole per cents within GRAB of the jamb
  await expect(slider).toBeFocused();
  const near = [Math.floor(at), Math.ceil(at)].filter((value) => Math.abs(value - at) < SNAP_GRAB);
  expect(near.length).toBeGreaterThan(0);
  for (const value of near) {
    await splitTo(page, slider, value);
    await expect.poll(() => seamState(stage), `${value}`).toEqual({ split: `${value}%`, snapped: null, lines: [], held: 0 });
  }
});

test('the lit line’s name stays whole inside the frame and over no other word, at every measured line it can light', async ({ page }, testInfo) => {
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
    const phone = phoneOf(page);
    const name = stage.locator('.hv2-contour-snap');
    for (const layer of desktop ? ['Каркас', 'Контур', 'Сніг', 'Вітер'] : ['Каркас']) {
      await layers.getByRole('button', { name: layer }).click();
      for (const snap of SNAPS) {
        await stage.evaluate((element) => element.scrollIntoView({ block: 'center' }));
        const frame = (await stage.boundingBox())!;
        const y = Math.round(frame.y + frame.height * 0.3);
        // a mouse takes the frame anywhere, so each line is reached from the middle (no line within GRAB there), the
        // seam standing where the mouse is
        await page.mouse.move(Math.round(frame.x + frame.width / 2), y);
        await page.mouse.down();
        const to = Math.round(frame.x + (frame.width * (onStage(snap.at, phone) + SNAP_GRAB * 0.4)) / 100);
        await page.mouse.move(to, y, { steps: 5 });
        await expect.poll(() => splitOf(stage)).toBe(tenths(await pointerAt(stage, to)));
        await expect(stage).toHaveAttribute('data-snapped', '');
        await expect(name).toHaveCSS('opacity', '1');
        // its words say «наближено» exactly where the line is approximate
        await expect(name).toHaveText(new RegExp(`^${snap.name}\\s*${snap.status}$`), { useInnerText: true });
        // …and the line, drawn once more over the photo, is dashed exactly where it is approximate, as everywhere else
        // (its casing never)
        const held = await stage.locator('svg.hv2-contour-held path').evaluateAll((paths) => paths.map((path) => ({
          casing: path.classList.contains('hv2-contour-held-casing'), approximate: path.hasAttribute('data-approximate'), dashed: getComputedStyle(path).strokeDasharray !== 'none',
        })));
        const approximate = snap.status === 'наближено';
        expect(held, snap.name).toEqual([{ casing: true, approximate: false, dashed: false }, { casing: false, approximate, dashed: approximate }]);
        // (once the rest of the sheet is told where the seam is — at most COMMIT_EVERY after the move — the name has its
        // place by the measured room)
        found.push(...(await settledClashes(stage)).map((clash) => `${width}×${height} ${layer} ${snap.name} (${snap.at.toFixed(1)} %): ${clash}`));
        await page.mouse.up();
        await expect(name).toHaveCSS('opacity', '0');
      }
    }
  }
  expect(found).toEqual([]);
});

test('a mouse over the frame leads the seam, no press needed: exactly where it points, eased, lighting the lines it passes; leaving keeps the seam; a key or a layer clears the light; no layout shifts; a finger never hovers', async ({ page }, testInfo) => {
  test.setTimeout(60_000);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  // Every layout shift from here on, by what shifted, and whether it came within half a second of a press or a key (the
  // visitor's own change, which CLS leaves out — a layer's new words)
  await page.addInitScript(() => {
    const shifts: { input: boolean; sources: string[] }[] = [];
    Object.assign(window, { shifts });
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as unknown as { hadRecentInput: boolean; sources: { node?: Node }[] }[]) {
        shifts.push({ input: entry.hadRecentInput, sources: entry.sources.map(({ node }) => (node instanceof Element ? node.getAttribute('class') ?? node.nodeName : String(node))) });
      }
    }).observe({ type: 'layout-shift' });
  });
  const { stage, slider } = await open(page);
  // (from the sheet at rest on: what the page's load did is not the seam's)
  await page.waitForTimeout(100);
  await page.evaluate(() => { (window as unknown as { shifts: unknown[] }).shifts.length = 0; });
  const frame = (await stage.boundingBox())!;
  const y = Math.round(frame.y + frame.height * 0.3);
  const xAt = (value: number) => Math.round(frame.x + (frame.width * value) / 100);
  if (testInfo.project.name !== 'desktop-chromium') {
    // A phone has no hover (hover: none, pointer: coarse): a mouse's moves over its frame lead nothing
    for (const value of [20, 50, 85]) await page.mouse.move(xAt(value), y, { steps: 4 });
    await expect(stage).not.toHaveAttribute('data-following', /.*/);
    await expectSplit(slider, stage, DEFAULT_SPLIT);
    return;
  }
  const model = litModel(false);
  const name = stage.locator('.hv2-contour-snap');
  // The seam's CSS glide, as each of its four carriers has it
  const glides = () => stage.evaluate((element, carriers) => carriers.map((selector) => {
    const style = getComputedStyle(element.querySelector(selector)!);
    return `${selector} ${style.transitionProperty} ${style.transitionDuration}`;
  }), CARRIERS);
  await expect(stage).not.toHaveAttribute('data-following', /.*/);
  // Every pixel of the way: the seam where the mouse is, to the tenth, the range on its whole per cent, the lines it
  // passes lit as a drag lights them
  // In from beside the frame: a page's very first mouse event has no movement to read
  await page.mouse.move(Math.round(frame.x - 30), y);
  let x = xAt(30);
  const check = async (point: number) => {
    const value = await pointerAt(stage, point);
    model.move(value);
    await expect.poll(() => seamState(stage), `${point}`).toEqual(model.state(value));
    await expect(stage).toHaveAttribute('data-following', '');
    // (soft: the rest of the test still runs, every miss named; told at most COMMIT_EVERY after the move, so a second is
    // ample)
    await expect.soft(slider, `${point}: the range catches up with the seam`).toHaveValue(String(Math.round(Math.round(value * 10) / 10)), { timeout: 1_000 });
  };
  const hoverTo = async (value: number) => {
    const to = xAt(value);
    for (let step = 1; step <= 6; step += 1) {
      const point = Math.round(x + ((to - x) * step) / 6);
      await page.mouse.move(point, y);
      await check(point);
    }
    x = to;
  };
  await page.mouse.move(x, y);
  await check(x);
  // It eases after the mouse, so it feels held, not dragged: the page itself closes FOLLOW_EASE of the way left on each
  // frame, the four carriers with no CSS glide meanwhile (a key or a button glides them). One jump of the mouse, every
  // frame after it: never past the mouse, never back, each frame the same share of what was left, then exactly there
  expect(await glides()).toEqual(CARRIERS.map((selector) => `${selector} all 0s`));
  const start = parseFloat(await splitOf(stage));
  await stage.evaluate((element) => {
    const pane = element.querySelector('.hv2-contour-pane')!;
    const eased: number[] = [];
    Object.assign(window, { eased });
    const tick = () => {
      eased.push(parseFloat(getComputedStyle(pane).getPropertyValue('--split')));
      if (eased.length < 40) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  x = xAt(47);
  await page.mouse.move(x, y);
  await page.waitForFunction(() => (window as unknown as { eased: number[] }).eased.length >= 40);
  const eased = await page.evaluate(() => (window as unknown as { eased: number[] }).eased);
  const goal = parseFloat(tenths(await pointerAt(stage, x)));
  const way = eased.slice(eased.findIndex((value) => value !== start));
  expect(way.every((value, index) => value <= goal && value >= (way[index - 1] ?? start)), `${start} → ${goal}: ${way.join(' ')}`).toBe(true);
  const gaps = [start, ...way].map((value) => goal - value);
  for (let index = 0; gaps[index] > 0.5; index += 1) expect(gaps[index + 1] / gaps[index], `${start} → ${goal}: ${way.join(' ')}`).toBeCloseTo(1 - FOLLOW_EASE, 2);
  expect(way.indexOf(goal), `${start} → ${goal}: ${way.join(' ')}`).toBeGreaterThan(5);
  expect(way.indexOf(goal), `${start} → ${goal}: ${way.join(' ')}`).toBeLessThanOrEqual(20);
  expect(eased.at(-1)).toBe(goal);
  await check(x);
  await hoverTo(80.5);
  // Passing the left gate's jamb it lights it and names it, then lets it go
  const jamb = SNAPS[2];
  await hoverTo(jamb.at + SNAP_GRAB * 0.5);
  expect(model.lit).toBe(jamb);
  await expect(name).toHaveCSS('opacity', '1');
  await expect(stage.locator('svg.hv2-contour-held path')).toHaveCount(2);
  await hoverTo(jamb.at - SNAP_RELEASE - 0.5);
  expect(model.lit).toBeNull();
  await expect(name).toHaveCSS('opacity', '0');
  // Leaving the frame — here straight up, off a lit line — keeps the seam where the mouse left it: nothing lit, no lead
  await hoverTo(jamb.at - SNAP_GRAB * 0.5);
  expect(model.lit).toBe(jamb);
  const left = await pointerAt(stage, x);
  await page.mouse.move(x, Math.round(frame.y - 40));
  model.reset();
  await expect.poll(() => seamState(stage)).toEqual(model.state(left));
  await expect(stage).not.toHaveAttribute('data-following', /.*/);
  await expect(name).toHaveCSS('opacity', '0');
  expect(await glides()).toEqual(CARRIERS.map((selector) => `${selector} --split 0.42s`));
  // A hover is no press: the range never took the focus, and no ring is drawn
  await expect(slider).not.toBeFocused();
  expect(await ringOf(stage)).toBe('none');
  // The move a browser makes up under a still mouse — after a scroll, a layout change — has no movement and leads
  // nothing; the mouse's own move does
  const nudge = (point: number, movementX: number) => stage.evaluate((element, [clientX, clientY, dx]) => {
    element.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, pointerId: 1, pointerType: 'mouse', isPrimary: true, clientX, clientY, movementX: dx, movementY: 0 }));
  }, [point, y, movementX] as const);
  await nudge(xAt(25), 0);
  await page.waitForTimeout(200);
  expect(await seamState(stage)).toEqual(model.state(left));
  await nudge(xAt(25), 3);
  await expect.poll(async () => (await seamState(stage)).split).toBe(tenths(await pointerAt(stage, xAt(25))));

  // A move that is not the pointer's leaves no line lit, the mouse still over the frame (review, 04.10): a key on the
  // range — its own step from the seam's whole per cent, within GRAB of the jamb still…
  await page.mouse.move(Math.round(frame.x - 30), y);
  model.reset();
  x = xAt(40);
  await page.mouse.move(x, y);
  await check(x);
  await hoverTo(jamb.at + SNAP_GRAB * 0.5);
  expect(model.lit).toBe(jamb);
  const lit = await pointerAt(stage, x);
  await slider.focus();
  await page.keyboard.press('ArrowLeft');
  model.reset();
  // (soft: the layer's part still runs)
  await expect.configure({ soft: true }).poll(() => seamState(stage), 'a key, the mouse resting over the frame').toEqual(model.state(Math.round(Math.round(lit * 10) / 10) - 1));
  await expect(name).toHaveCSS('opacity', '0');
  // …or a layer chosen from the keyboard
  await hoverTo(jamb.at - SNAP_GRAB * 0.5);
  expect(model.lit).toBe(jamb);
  const kept = (await seamState(stage)).split;
  const layer = page.locator('#real-object').getByRole('group', { name: 'Що показати праворуч' }).getByRole('button', { name: 'Контур' });
  await layer.focus();
  await page.keyboard.press('Enter');
  await expect(layer).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(() => seamState(stage)).toEqual({ split: kept, snapped: null, lines: [], held: 0 });
  await expect(name).toHaveCSS('opacity', '0');

  // All of it rode the rail's transform: the mouse leading the seam shifted no layout (review, 04.10: CLS)
  expect((await page.evaluate(() => (window as unknown as { shifts: { input: boolean }[] }).shifts)).filter((shift) => !shift.input)).toEqual([]);
});

test('during the first view’s sweep a mouse over the frame leads nothing — the sweep runs its course — and once the seam rests it does', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'a mouse that hovers');
  test.setTimeout(45_000);
  const { sheet, stage, range } = await arrive(page);
  await recordArrival(page);
  await sheet.scrollIntoViewIfNeeded();
  const frame = (await stage.boundingBox())!;
  const y = Math.round(frame.y + frame.height * 0.3);
  const xAt = (value: number) => Math.round(frame.x + (frame.width * value) / 100);
  // Over the frame while the seam waits at the edge, and again and again while it sweeps
  await page.mouse.move(Math.round(frame.x - 30), y);
  await page.mouse.move(xAt(40), y, { steps: 3 });
  await page.waitForFunction(() => document.querySelector<HTMLElement>('#real-object .hv2-contour-stage')!.dataset.sweep === 'run');
  for (const value of [20, 45, 70, 30]) {
    await page.mouse.move(xAt(value), y, { steps: 3 });
    await page.waitForTimeout(120);
  }
  const { frames, run, ended } = await arrivalOf(page);
  expect(run).not.toBeNull();
  expect(ended! - run!).toBeGreaterThanOrEqual(SWEEP_MS - 20);
  expect(frames.filter((frame) => frame.following)).toEqual([]);
  expect(new Set(frames.map((frame) => frame.range))).toEqual(new Set([String(DEFAULT_SPLIT)]));
  for (const frame of frames.filter((at) => at.t >= ended!)) expect(frame, `${frame.t}`).toMatchObject({ sweep: null, split: DEFAULT_SPLIT });
  // At rest, the same mouse leads it
  await page.mouse.move(xAt(25), y, { steps: 2 });
  await expect.poll(async () => (await seamState(stage)).split).toBe(tenths(await pointerAt(stage, xAt(25))));
  await expect(range).toHaveValue('25');
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
    // The gates' corners and jambs next to the seam, and where the base line crosses it, in the photo's own pixels —
    // the seam's per cent of the frame taken back to the zoomed canvas's
    const [gateLeft, gateRight] = homeProofContour.lines.filter((line) => line.kind === 'gate');
    const base = homeProofContour.lines.find((line) => line.id === 'gable-base')!.points;
    const seamX = (onCanvas(DEFAULT_SPLIT, true) / 100) * homeProofContour.photo.width;
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
    expect.soft(covered, `${width}`).toEqual([]);
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

test('on a phone the title block keeps its height whichever layer is on, and below 390 px a load’s frame has no stamp', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'desktop-chromium', 'a phone\'s title block');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const width of [412, 390, 360, 320]) {
    await page.setViewportSize({ width, height: 800 });
    const { sheet, stage, layers } = await open(page);
    const heights = new Set<number>();
    for (const layer of ['Каркас', 'Сніг', 'Вітер', 'Контур', 'Каркас']) {
      await layers.getByRole('button', { name: layer }).click();
      heights.add(Math.round((await sheet.locator('figcaption').boundingBox())!.height));
      // The narrowest phones give the frame's top corner to the loads' comb and gusts: their stamp goes, the legend
      // names the layer (review, 04.10). (A load widens the right side to 40 %, room enough for the stamp's word)
      if (layer === 'Сніг' || layer === 'Вітер') {
        const stamp = stage.locator('.hv2-contour-stamp');
        if (width < 390) await expect(stamp, `${width} ${layer}`).toBeHidden();
        else await expect(stamp, `${width} ${layer}`).toBeVisible();
      }
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
  // (the four carriers glide there once on hydration, unseen: the armed sheet's picture is clipped away)
  await expect.poll(() => splitOf(stage)).toBe('100%');
  await expect(range).toHaveValue(String(DEFAULT_SPLIT));
  await expectWindow(stage, 100);
  await recordArrival(page);
  await page.evaluate(() => Promise.all([...document.querySelectorAll<HTMLImageElement>('.hv2-contour img')].map((image) => { image.loading = 'eager'; return image.decode().catch(() => undefined); })));
  await sheet.scrollIntoViewIfNeeded();
  const { frames, on, run, ended, shifts } = await arrivalOf(page);
  expect([on, run, ended].every((at) => at !== null), 'the sheet arrived, the seam swept and stopped').toBe(true);
  // The seam, its handle and its names ride one rail moved by a transform: the sweep shifts no layout (review, 04.10:
  // moved by left, they shifted it on every frame)
  expect(shifts).toEqual([]);
  const plotting = frames.filter((frame) => frame.t >= on! && frame.t < run!);
  const sweep = frames.filter((frame) => frame.t >= run! && frame.t < ended!);
  const after = frames.filter((frame) => frame.t >= ended!);

  // While the picture plots in, the photo stands whole: the seam at the right edge, nothing of the right side uncovered,
  // nothing drawing in
  expect(plotting.length).toBeGreaterThan(10);
  for (const frame of plotting) {
    expect(frame, `${frame.t}`).toMatchObject({ sweep: 'wait', gliding: false, split: 100, spread: 0, sweeps: 0, others: [] });
    expect(frame.seam, `${frame.t}`).toBeCloseTo(100, 1);
    expect(frame.window, `${frame.t}`).toBeCloseTo(100, 2);
  }
  // The sweep starts SWEEP_AT after the sheet arrived, the picture plotted in by then (a few ms: two observers read the
  // clock a moment apart), and runs its time once — a shorter one on a phone
  expect(run! - on!).toBeGreaterThanOrEqual(SWEEP_AT - 5);
  const duration = phone ? SWEEP_MS_PHONE : SWEEP_MS;
  expect(ended! - run!).toBeGreaterThanOrEqual(duration - 20);
  expect(ended! - run!).toBeLessThan(duration + 400);
  expect(sweep.length).toBeGreaterThan(20);
  // …on the four carriers, one script animation of --split each, in step
  for (const frame of sweep) expect(frame, `${frame.t}`).toMatchObject({ sweep: 'run', gliding: true, plotting: false, sweeps: 4, spread: 0 });

  // From the edge across the gable — past its left corner, to the turn — and back to rest: one way out, one way back
  const splits = sweep.map((frame) => frame.split);
  const turn = splits.indexOf(Math.min(...splits));
  expect(splits[0]).toBeGreaterThan(99);
  expect(splits[turn]).toBeCloseTo(phone ? SWEEP_TURN_PHONE : SWEEP_TURN, 0);
  // (on a phone the corner stands where the close-up puts it)
  expect.soft(splits[turn], 'the turn is past the gable’s left corner').toBeLessThan(onStage(SNAPS[0].at, phone));
  expect(splits.slice(0, turn + 1)).toEqual(splits.slice(0, turn + 1).toSorted((a, b) => b - a));
  expect(splits.slice(turn)).toEqual(splits.slice(turn).toSorted((a, b) => a - b));
  // The seam is drawn where --split is, and the right side's window has its edge exactly there, its drawing standing on
  // the photo's canvas: what it has passed is the drawing, whole — no line draws in, nothing slides, nothing else moves on
  // the stage, and nothing leads the seam
  for (const frame of sweep) {
    expect(frame.following, `${frame.t}`).toBe(false);
    expect(frame.seam, `${frame.t}`).toBeCloseTo(frame.split, 1);
    expect(frame.window, `${frame.t}`).toBeCloseTo(frame.split, 2);
    expect(frame.drift, `${frame.t}`).toBeLessThan(0.05);
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
  expect(Math.min(...frames.filter((frame) => frame.t >= run! && frame.t < ended!).map((frame) => frame.split))).toBeCloseTo(testInfo.project.name === 'desktop-chromium' ? SWEEP_TURN : SWEEP_TURN_PHONE, 0);
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
  // The seam's parts — its names, the lit line's name, the seam, its handle — ride one rail as wide as the frame, moved to
  // the seam by a transform, so no move of it shifts the page's layout (review, 04.10: CLS)
  const rail = await stage.locator('.hv2-contour-rail').evaluate((element) => ({
    parts: [...element.children].map((child) => child.className),
    transform: getComputedStyle(element).transform,
    width: (element as HTMLElement).offsetWidth,
    frame: element.parentElement!.clientWidth,
  }));
  expect(rail.parts).toEqual(['hv2-contour-seamtags', 'hv2-contour-snap', 'hv2-contour-seam', 'hv2-contour-handle']);
  expect(rail.width).toBe(rail.frame);
  // …and so does the right side's window, as wide as the frame, its content moved back by as much (review, 05.10)
  for (const [part, sign] of [['.hv2-contour-rail', 1], ['.hv2-contour-pane', 1], ['.hv2-contour-pane-inner', -1]] as const) {
    const transform = await stage.locator(part).evaluate((element) => getComputedStyle(element).transform);
    const [a, b, c, d, tx, ty] = (/^matrix\((.+)\)$/.exec(transform)?.[1] ?? '').split(', ').map(Number);
    expect([a, b, c, d, ty], part).toEqual([1, 0, 0, 1, 0]);
    expect(tx, part).toBeCloseTo((sign * rail.frame * DEFAULT_SPLIT) / 100, 1);
  }
  // The seam and the layers do not slide (the site's reduced-motion rule leaves a hundredth of a millisecond at most)
  for (const part of [...CARRIERS, PANE_LINES, 'svg.hv2-proof-frame', '.hv2-contour-trace', '.hv2-contour-seam']) {
    expect(await stage.locator(part).evaluate((element) => Math.max(...getComputedStyle(element).transitionDuration.split(',').map(parseFloat))), part).toBeLessThanOrEqual(0.0001);
  }
  // No sweep — the seam never waits at the edge — and no rings, ever
  await page.waitForTimeout(6_000);
  for (const mark of ['data-sweep', 'data-gliding', 'data-pulse', 'data-following']) await expect(stage).not.toHaveAttribute(mark, /.*/);
  expect(await splitOf(stage)).toBe(`${DEFAULT_SPLIT}%`);
  await expectWindow(stage, DEFAULT_SPLIT);
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('the sheet is complete at its resting split: photo, tracing, scheme, lines, figures; the controls say they cannot move it', async ({ page }) => {
    await page.goto('/', { waitUntil: 'load' });
    const stage = page.locator('#real-object .hv2-contour-stage');
    await stage.scrollIntoViewIfNeeded();
    await expect(page.locator('#real-object .hv2-contour')).not.toHaveAttribute('data-sheet-state', /.+/);
    await expect.poll(() => seamAt(stage)).toBeCloseTo(DEFAULT_SPLIT, 0);
    await expect(stage.locator(`${PANE_LINES} .hv2-contour-ink path`)).toHaveCount(homeProofContour.lines.length);
    await expect(stage.locator('picture img')).toHaveCount(2);
    await expect(stage.locator('picture img').first()).toBeVisible();
    await expect(stage.locator('.hv2-proof-scheme')).toBeVisible();
    await expect(stage.locator('.hv2-contour-stamp')).toContainText('каркас такого типу, як на цьому об’єкті');
    // The right side's window at rest, the drawing on the photo's canvas: the four carriers' --split is CSS's initial value
    await expectWindow(stage, DEFAULT_SPLIT);
    // No sweep waits on a script that never runs: the seam at rest, the figures and the names in
    await expect(stage).not.toHaveAttribute('data-sweep', /.*/);
    expect(await splitOf(stage)).toBe(`${DEFAULT_SPLIT}%`);
    for (const part of ['.hv2-proof-labels', 'svg.hv2-proof-marks']) expect(await stage.locator(part).evaluate((element) => getComputedStyle(element).opacity), part).toBe('1');
    if ((page.viewportSize()?.width ?? 0) > 760) await expect(stage.locator('.hv2-proof-measure[data-measure="slope"]')).toBeVisible();
    // Nothing offers a move the static sheet cannot make: the slider and the buttons are disabled, out of the tab order
    await expect(stage.getByRole('slider', { name: SLIDER })).toBeDisabled();
    for (const button of await page.locator('#real-object .hv2-contour figcaption button').all()) await expect(button).toBeDisabled();
  });
});

test('on a laptop the sheet fits under the header where the window has the room, its title block is never under the picture, and the crop keeps the gable whole', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'laptop windows');
  test.setTimeout(90_000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  // The usual laptops fit, as before; on a short window (owner, 04.10: there the picture covered the note) the picture
  // keeps the photo's rows 84–644 and the sheet runs past the window instead
  const windows = [[1280, 720, true], [1366, 768, true], [1440, 900, true], [1536, 864, true], [1920, 1080, true], [1280, 600, false], [1100, 650, false], [1024, 600, false]] as const;
  for (const [width, height, fits] of windows) {
    const at = `${width}×${height}`;
    await page.setViewportSize({ width, height });
    const { sheet, stage } = await open(page);
    await sheet.evaluate((element) => window.scrollTo({ top: element.getBoundingClientRect().top + window.scrollY - 117, behavior: 'instant' }));
    const box = (await sheet.boundingBox())!;
    expect(Math.round(box.y), at).toBe(117);
    // The picture takes the height the window leaves once the sheet's other parts — measured on the page, however many
    // lines the note wraps to — are in: never less than the photo's rows 84–644, never more than the whole photo
    const rest = await sheet.evaluate((element) => ({
      variable: (element as HTMLElement).style.getPropertyValue('--hv2-sheet-rest'),
      measured: (element as HTMLElement).offsetHeight - element.querySelector<HTMLElement>('.sheet-image')!.offsetHeight,
    }));
    expect(rest.variable, at).toBe(`${rest.measured}px`);
    // (the sheet itself has no cap: its height is the picture's and its other parts')
    expect(await sheet.evaluate((element) => getComputedStyle(element).maxHeight), at).toBe('none');
    const image = (await sheet.locator('.sheet-image').boundingBox())!;
    const [least, most] = [(image.width * 560) / 1536, (image.width * 788) / 1536];
    const room = height - 117 - 12 - rest.measured;
    // (soft: every window's misses named in one run)
    expect.soft(room >= least, `${at}: the picture has its room`).toBe(fits);
    expect(image.height, at).toBeCloseTo(Math.min(most, Math.max(least, room)), 0);
    if (fits) expect.soft(box.y + box.height, `${at}: the sheet fits`).toBeLessThanOrEqual(height);
    // Without a script the usual rest by width stands in for the measured one — 169 px from 1400 px, 170 px from 1240,
    // 230 px from 1100, 260 px below (measured 05.10 on every layer) — and on the usual laptops it is the measured one,
    // so the server's picture is the hydrated one's (review, 04.10)
    const fallback = await sheet.evaluate((element) => getComputedStyle(element).getPropertyValue('--hv2-sheet-rest-0'));
    expect(fallback, at).toBe(`${width >= 1400 ? 169 : width >= 1240 ? 170 : width >= 1100 ? 230 : 260}px`);
    if (fits) expect.soft(fallback, `${at}: the server's picture is the hydrated one's`).toBe(`${rest.measured}px`);
    // The title block keeps its place under the picture, inside the sheet…
    const stamp = (await sheet.locator('figcaption').boundingBox())!;
    expect(stamp.y, at).toBeGreaterThanOrEqual(image.y + image.height - 0.5);
    expect(stamp.y + stamp.height, at).toBeLessThanOrEqual(box.y + box.height + 0.5);
    // …and nothing of the picture lies over it: in view, each of its cells is what the window shows at its middle
    await sheet.locator('figcaption').evaluate((element) => element.scrollIntoView({ block: 'end' }));
    const covered = await sheet.locator('figcaption .sheet-cell').evaluateAll((cells) => cells.filter((cell) => {
      const { left, top, width: w, height: h } = cell.getBoundingClientRect();
      if (w === 0 || h === 0) return false;
      const hit = document.elementFromPoint(left + w / 2, top + h / 2);
      return !hit || !cell.contains(hit);
    }).map((cell) => cell.textContent?.slice(0, 40)));
    expect(covered, at).toEqual([]);
    await sheet.evaluate((element) => window.scrollTo({ top: element.getBoundingClientRect().top + window.scrollY - 117, behavior: 'instant' }));
    // The photo is fetched for the frame's width (the srcset's sizes)
    const fetched = await stage.locator('.hv2-contour-canvas > picture img').evaluate((element) => [(element as HTMLImageElement).naturalWidth, element.getBoundingClientRect().width]);
    expect(Math.abs(fetched[0] - fetched[1]), at).toBeLessThanOrEqual(1);
    // The canvas keeps the sheet's width; the stage shows the photo's rows from above the apex to below the base
    const rows = await stage.evaluate((element) => {
      const frame = element.getBoundingClientRect();
      const canvas = element.querySelector('.hv2-contour-canvas')!.getBoundingClientRect();
      const scale = canvas.height / 788;
      return { width: canvas.width - frame.width, top: (frame.top - canvas.top) / scale, bottom: (frame.bottom - canvas.top) / scale };
    });
    expect(Math.abs(rows.width), at).toBeLessThanOrEqual(1);
    expect(rows.top, at).toBeLessThanOrEqual(100);
    expect(rows.bottom, at).toBeGreaterThanOrEqual(640);
    // …and the scheme's foot with it: the footings and both loads' arrowheads end inside the frame
    const foot = await stage.evaluate((element) => {
      const svg = element.querySelector<SVGSVGElement>('svg.hv2-proof-frame')!;
      const lowest = Math.max(...[...svg.querySelectorAll<SVGGraphicsElement>('.hv2-proof-footing, .hv2-proof-flow, .hv2-proof-reactions')].map((part) => {
        const box = part.getBBox();
        return box.y + box.height;
      }));
      const ctm = svg.getScreenCTM()!;
      return { lowest: ctm.d * lowest + ctm.f, bottom: element.getBoundingClientRect().bottom };
    });
    expect(foot.lowest, at).toBeLessThanOrEqual(foot.bottom - 2);
    // …and the loads at the top: the snow's comb and the wind's lift start inside the frame, and the wind's gusts end
    // inside its right edge
    const head = await stage.evaluate((element) => {
      const svg = element.querySelector<SVGSVGElement>('svg.hv2-proof-frame')!;
      const ctm = svg.getScreenCTM()!;
      const [snow, wind] = ['.hv2-proof-snow', '.hv2-proof-wind'].map((selector) => svg.querySelector<SVGGraphicsElement>(selector)!.getBBox());
      const frame = element.getBoundingClientRect();
      return { snow: ctm.d * snow.y + ctm.f, wind: ctm.d * wind.y + ctm.f, right: ctm.a * (wind.x + wind.width) + ctm.e, top: frame.top, frameRight: frame.right };
    });
    expect(head.snow, at).toBeGreaterThanOrEqual(head.top);
    expect(head.wind, at).toBeGreaterThanOrEqual(head.top);
    expect(head.right, at).toBeLessThanOrEqual(head.frameRight);
  }
});

test('from tablet to wide screen, no word on the frame covers another or runs off it, and at rest the scheme keeps the slope’s figure', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'desktop windows');
  test.setTimeout(150_000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  // At rest in every layer from 761 px up; the seam dragged right over the figures on short laptops (where the seam's
  // name used to land on them) and to the far right (where «‹ Фото» met the stamp). Every miss is collected
  const plan: [number, number, number[]][] = [
    [761, 900, [DEFAULT_SPLIT]], [768, 1024, [DEFAULT_SPLIT]], [1024, 768, [DEFAULT_SPLIT, 70]], [1180, 820, [DEFAULT_SPLIT]],
    [1280, 720, [DEFAULT_SPLIT, 64, 68, 72]], [1366, 768, [DEFAULT_SPLIT, 64, 68, 72]], [1440, 780, [DEFAULT_SPLIT, 64, 68, 72, 85, 88, 92, 95, 99]],
    [1440, 900, [DEFAULT_SPLIT]], [1920, 1080, [DEFAULT_SPLIT]],
  ];
  const found: string[] = [];
  for (const [width, height, splits] of plan) {
    await page.setViewportSize({ width, height });
    const { sheet, stage, slider, layers } = await open(page);
    await sheet.evaluate((element) => window.scrollTo({ top: element.getBoundingClientRect().top + window.scrollY - 117, behavior: 'instant' }));
    for (const layer of ['Каркас', 'Контур', 'Сніг', 'Вітер']) {
      await layers.getByRole('button', { name: layer }).click();
      for (const value of splits) {
        await splitTo(page, slider, value);
        found.push(...(await settledClashes(stage, value === DEFAULT_SPLIT)).map((clash) => `${width}×${height} ${layer} ${value}: ${clash}`));
        // A word that would meet the seam's names or the stamp is hidden whole, as one the seam cuts — but at rest the
        // scheme's one measured figure, the slope's, is never the one to go: it stands in the free sky over the rake
        if (layer === 'Каркас' && value === DEFAULT_SPLIT) {
          const slope = await stage.locator('.hv2-proof-measure[data-measure="slope"]').evaluate((element) => ({ cut: 'cut' in (element as HTMLElement).dataset, visibility: getComputedStyle(element).visibility }));
          if (slope.cut || slope.visibility !== 'visible') found.push(`${width}×${height} Каркас ${value}: the slope's figure hidden at rest (${slope.cut ? 'data-cut' : slope.visibility})`);
        }
      }
    }
  }
  expect(found).toEqual([]);
});

test('a word the seam cuts, or one that meets «‹ Фото» or the stamp, is hidden whole with what points at it, and comes back once clear; the seam’s «Схема ›» gives way to a word of the drawing instead', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'a phone has no words in its frame');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  // A short laptop, where the seam's right-hand name meets the slope's figure as the seam moves right (review, 05.10: the
  // name gives way, not the figure)
  await page.setViewportSize({ width: 1280, height: 720 });
  const { stage, slider } = await open(page);
  /** Every word on the frame: whether the page marks it cut, whether it is drawn, what points at it (a name's leader, a
   *  figure's marks) — and whether it should be cut: the seam (where its carriers put it) left of its box, or its box
   *  meeting a shown «‹ Фото» or the stamp (ProofContour's covers). And the seam's right-hand name: shown or not, the
   *  drawn words its box would meet, and whether it would run into the full stamp (ProofContour's fit: AIR 8 px) */
  const sheetState = () => stage.evaluate((element) => {
    const frame = element.getBoundingClientRect();
    const seam = frame.left + (frame.width * parseFloat(getComputedStyle(element.querySelector('.hv2-contour-pane')!).getPropertyValue('--split'))) / 100;
    const visible = (node: Element) => getComputedStyle(node).visibility === 'visible';
    const meet = (a: DOMRect, b: DOMRect) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
    const [left, right] = element.querySelectorAll<HTMLElement>('.hv2-contour-seamtags > span');
    const stamp = element.querySelector<HTMLElement>('.hv2-contour-stamp')!;
    const covers = [left, stamp].filter(visible).map((node) => ({ name: node.textContent!.trim().slice(0, 12), box: node.getBoundingClientRect() }));
    // (a name that gives way keeps its box)
    const would = right.getBoundingClientRect();
    const words = [...element.querySelectorAll<HTMLElement>('.hv2-proof-labels > span')].map((word) => {
      const box = word.getBoundingClientRect();
      const { tag, measure } = word.dataset;
      const pointer = element.querySelector<SVGElement>(tag ? `.hv2-proof-tag-leaders [data-tag="${tag}"]` : `.hv2-proof-marks [data-mark="${measure}"]`)!;
      return {
        id: tag ?? measure!, cut: 'cut' in word.dataset, hidden: !visible(word), pointer: { cut: 'cut' in pointer.dataset, hidden: !visible(pointer) },
        bySeam: box.left < seam + 1, met: covers.filter((cover) => meet(box, cover.box)).map(({ name }) => name), meetsRight: meet(box, would),
      };
    });
    return {
      words,
      right: {
        shown: visible(right), narrow: element.dataset.narrowRight !== undefined,
        yields: words.filter((word) => !word.hidden && word.meetsRight).map(({ id }) => id),
        crowded: visible(stamp) && element.dataset.stamp === undefined && would.right + 8 > stamp.getBoundingClientRect().left,
      },
    };
  });
  /** What the page got wrong of it: a word cut or not as it should be, one hidden in part (without what points at it),
   *  «Схема ›» shown over a word or into the stamp, or given way with nothing to give way to */
  const misses = async () => {
    const { words, right } = await sheetState();
    const yields = right.yields.length > 0 || right.crowded;
    return [
      ...words.filter((word) => word.cut !== (word.bySeam || word.met.length > 0)).map((word) => `${word.id} cut: ${JSON.stringify(word)}`),
      ...words.filter((word) => word.pointer.cut !== word.cut || (word.cut && !(word.hidden && word.pointer.hidden))).map((word) => `${word.id} not hidden whole: ${JSON.stringify(word)}`),
      ...(right.shown === yields || right.narrow !== yields ? [`«Схема ›»: ${JSON.stringify(right)}`] : []),
    ];
  };
  const yielded = new Set<string>();
  for (const value of [DEFAULT_SPLIT, 64, 66, 68, 70, 72, 74, 76, 62]) {
    await splitTo(page, slider, value);
    await expect.poll(misses, `${value}`).toEqual([]);
    for (const id of (await sheetState()).right.yields) yielded.add(id);
  }
  // …so «Схема ›» gave way to the slope's figure while the seam was still left of it, and came back at rest
  expect([...yielded]).toContain('slope');
  expect((await sheetState()).right).toMatchObject({ shown: true, narrow: false, yields: [] });
  // …and so it is again when only the frame's height changes, the seam where it was — a window's height, or the title
  // block's rest measured on hydration: the crop moves every word up or down, so one now clear comes back and one now
  // met goes
  for (const height of [900, 720]) {
    await page.setViewportSize({ width: 1280, height });
    await expect.poll(misses, `1280×${height}`).toEqual([]);
  }

  // While a pointer drags the seam across a word, the seam is drawn on every move and the rest of the sheet is told at
  // most every COMMIT_EVERY (review, 05.10): so the word the seam cuts goes within that, the pointer still moving, and
  // the range catches up as the seam goes — not only once the pointer stops. A drag at a mouse's pace, a move every
  // 16 ms, over the slope's figure, every frame recorded
  await page.setViewportSize({ width: 1280, height: 720 });
  await splitTo(page, slider, DEFAULT_SPLIT);
  await expect.poll(misses).toEqual([]);
  await stage.evaluate((element) => element.scrollIntoView({ block: 'center' }));
  const frame = (await stage.boundingBox())!;
  const y = Math.round(frame.y + frame.height * 0.6);
  const xAt = (value: number) => Math.round(frame.x + (frame.width * value) / 100);
  await page.mouse.move(Math.round(frame.x - 30), y);
  await page.mouse.move(xAt(DEFAULT_SPLIT), y);
  await expect.poll(() => splitOf(stage)).toBe(tenths(await pointerAt(stage, xAt(DEFAULT_SPLIT))));
  await stage.evaluate((element) => {
    const pane = element.querySelector('.hv2-contour-pane')!;
    const slope = element.querySelector<HTMLElement>('.hv2-proof-measure[data-measure="slope"]')!;
    const range = element.querySelector<HTMLInputElement>('.hv2-contour-range')!;
    const drag = { frames: [] as { t: number; cutBySeam: boolean; cut: boolean; range: string }[], released: 0, done: false };
    Object.assign(window, { drag });
    addEventListener('pointerup', () => { drag.released = performance.now(); }, { capture: true, once: true });
    const tick = () => {
      const box = element.getBoundingClientRect();
      const seam = box.left + (box.width * parseFloat(getComputedStyle(pane).getPropertyValue('--split'))) / 100;
      drag.frames.push({ t: performance.now(), cutBySeam: slope.getBoundingClientRect().left < seam - 1, cut: 'cut' in slope.dataset, range: range.value });
      if (drag.released && performance.now() - drag.released > 300) drag.done = true;
      else requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  await page.mouse.down();
  for (let step = 1; step <= 60; step += 1) {
    await page.mouse.move(xAt(DEFAULT_SPLIT + (18 * step) / 60), y);
    await page.waitForTimeout(16);
  }
  await page.mouse.up();
  await page.waitForFunction(() => (window as unknown as { drag: { done: boolean } }).drag.done);
  const drag = await page.evaluate(() => (window as unknown as { drag: { frames: { t: number; cutBySeam: boolean; cut: boolean; range: string }[]; released: number } }).drag);
  const moving = drag.frames.filter((at) => at.t < drag.released);
  const reached = moving.find((at) => at.cutBySeam);
  expect(reached, 'the seam reached the slope’s figure while it moved').toBeDefined();
  const gone = moving.find((at) => at.t >= reached!.t && at.cut);
  // (soft: each of these named in one run; a frame's slack on top of COMMIT_EVERY)
  expect.soft(gone, `the figure the seam cuts goes while the pointer still moves (it moved ${Math.round(drag.released - reached!.t)} ms more)`).toBeDefined();
  if (gone) expect.soft(gone.t - reached!.t, 'the figure the seam cuts goes within COMMIT_EVERY').toBeLessThanOrEqual(COMMIT_EVERY + 40);
  // …the range told as the seam goes, never more often than COMMIT_EVERY
  const told = moving.filter((at, index) => index > 0 && at.range !== moving[index - 1].range);
  expect.soft(told.length, `the range caught up while the seam moved (${Math.round(moving.at(-1)!.t - moving[0].t)} ms of moves)`).toBeGreaterThan(2);
  for (const [index, at] of told.slice(1).entries()) expect.soft(at.t - told[index].t, 'the range told at most every COMMIT_EVERY').toBeGreaterThanOrEqual(COMMIT_EVERY - 20);
  // …and at once when the pointer lets go: the range on the seam's whole per cent, the figure gone
  await expect(slider).toHaveValue(String(Math.round(parseFloat(await splitOf(stage)))));
  await expect.poll(misses).toEqual([]);
});

test('a narrower frame drops the figures’ second lines: from 1023 px down «Контур» writes each figure’s title only, the whole words staying for a screen reader', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'a phone has no figures in its frame');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  // (review, 04.10: three of them crossed each other at 768 px)
  for (const [width, lines] of [[1024, true], [1023, false], [768, false]] as const) {
    await page.setViewportSize({ width, height: 900 });
    const { stage, layers } = await open(page);
    await layers.getByRole('button', { name: 'Контур' }).click();
    const looks = await stage.locator('.hv2-proof-measure').evaluateAll((figures) => figures.map((figure) => ({
      id: (figure as HTMLElement).dataset.measure, title: figure.firstChild!.textContent, line: getComputedStyle(figure.querySelector('small')!).display !== 'none',
    })));
    expect(looks, `${width}`).toEqual(homeProofMeasures.map((measure) => ({ id: measure.id, title: measure.title, line: lines })));
    await expect(stage.getByRole('list', { name: 'Виміряно за фото, без масштабу' }).getByRole('listitem')).toHaveText(homeProofMeasures.map((measure) => measure.spoken));
  }
});

test('the scheme’s names stand in free room: the truss’s over the rake, the purlins’ and the walls’ on the right wall’s face, the column’s in the right gate’s opening, the footings’ under the base, none over another or off the frame, at every width', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'a phone has no names in its frame');
  test.setTimeout(60_000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  // The lowest any member behind the gable crosses the right wall's face, right of the right gate (the depth bays' chords
  // and wall tops): the names on that face stand under it
  const [, , headFar] = homeProofFrame.walls.holes[1];
  const deepest = Math.max(...homeProofFrame.members.filter((member) => member.depth > 0 && member.group !== 'footing' && member.group !== 'column')
    .flatMap((member) => member.points.filter(([x]) => x > headFar[0]).map(([, y]) => y)));
  for (const [width, height] of [[1920, 1080], [1440, 900], [1280, 720], [1200, 800], [1199, 800], [1024, 768], [768, 1024]]) {
    await page.setViewportSize({ width, height });
    const { stage, slider } = await open(page);
    const at = `${width}×${height}`;
    // At rest, put there by the keys: which words meet the stamp is read again on a move of the seam (a frame whose
    // height changed after load keeps its first reading — the test of that is the hidden words' own)
    await splitTo(page, slider, DEFAULT_SPLIT);
    // Each name's box against the drawn right rake and the gable's base where it stands (their screen y at its ends:
    // both are straight); against the right gate's opening — its left jamb at the name's middle, its head and its foot —
    // and its right jamb; against the right wall's section (its inner edge at the name's middle) and the lowest member
    // behind the face — in the photo's own pixels mapped to the screen
    const boxes = await stage.evaluate((element, [rake, base, opening, section, low]) => {
      const ctm = element.querySelector<SVGSVGElement>(`.hv2-contour-pane svg.hv2-contour-lines`)!.getScreenCTM()!;
      const screen = ([x, y]: readonly number[]) => [ctm.a * x + ctm.e, ctm.d * y + ctm.f];
      const yAt = (line: readonly (readonly number[])[], x: number) => { const [[x0, y0], [x1, y1]] = line.map(screen); return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0); };
      const xAt = (from: readonly number[], to: readonly number[], y: number) => { const [[x0, y0], [x1, y1]] = [screen(from), screen(to)]; return x0 + ((x1 - x0) * (y - y0)) / (y1 - y0); };
      const [footNear, footFar, headFar, headNear] = opening;
      return [...element.querySelectorAll<HTMLElement>('.hv2-proof-tag')].map((tag) => {
        const box = tag.getBoundingClientRect();
        const leader = element.querySelector(`.hv2-proof-tag-leaders [data-tag="${tag.dataset.tag}"]`)!;
        const middle = (box.top + box.bottom) / 2;
        return {
          id: tag.dataset.tag!,
          drawn: getComputedStyle(tag).display !== 'none' && getComputedStyle(tag).visibility === 'visible',
          leader: getComputedStyle(leader).display !== 'none' && getComputedStyle(leader).visibility === 'visible',
          left: box.left, right: box.right, top: box.top, bottom: box.bottom,
          rake: Math.min(yAt(rake, box.left), yAt(rake, box.right)),
          base: Math.max(yAt(base, box.left), yAt(base, box.right)),
          baseUnder: Math.min(yAt(base, box.left), yAt(base, box.right)),
          jamb: xAt(footNear, headNear, middle), farJamb: xAt(footFar, headFar, middle), section: xAt(section[0], section[1], middle),
          head: Math.max(screen(headNear)[1], screen(headFar)[1]), foot: Math.min(screen(footNear)[1], screen(footFar)[1]), low: screen([0, low])[1], scale: ctm.a,
        };
      });
    }, [
      lineOf('gable-rake-right').points, lineOf('gable-base').points.slice(0, 2), homeProofFrame.walls.holes[1],
      [homeProofFrame.walls.cuts[1][2], homeProofFrame.walls.cuts[1][3]], deepest,
    ] as const);
    expect(boxes.map((box) => box.id), at).toEqual(homeProofFrame.tags.map((tag) => tag.id));
    const byId = Object.fromEntries(boxes.map((box) => [box.id, box]));
    // (soft: every window's misses named in one run)
    for (const box of boxes) {
      // Every name with its leader — but on a narrow frame (≤ 900 px) the purlins' is not drawn: three two-line names do
      // not fit the wall's face (homeProofFrame's wideOnly)
      const drawn = !(width <= 900 && homeProofFrame.tags.find((tag) => tag.id === box.id)!.wideOnly);
      expect.soft({ drawn: box.drawn, leader: box.leader }, `${at} ${box.id} drawn`).toEqual({ drawn, leader: drawn });
      if (!drawn) continue;
      if (box.id === 'truss') expect.soft(box.bottom, `${at} ${box.id} over the rake`).toBeLessThanOrEqual(box.rake);
      if (box.id === 'footing') expect.soft(box.top, `${at} ${box.id} under the base`).toBeGreaterThanOrEqual(box.base);
      if (box.id === 'bracing' || box.id === 'wall') {
        // on the face that holds only blockwork: right of the right gate, short of the right wall's section, under every
        // member behind it, over the base
        expect.soft(box.left, `${at} ${box.id} right of the right gate`).toBeGreaterThanOrEqual(box.farJamb);
        expect.soft(box.right, `${at} ${box.id} short of the right wall's section`).toBeLessThanOrEqual(box.section);
        expect.soft(box.top, `${at} ${box.id} under the members behind the face`).toBeGreaterThanOrEqual(box.low);
        expect.soft(box.bottom, `${at} ${box.id} over the base`).toBeLessThanOrEqual(box.baseUnder);
      }
      if (box.id === 'column') {
        // in the opening, which holds no member of the gable's plane: from its left jamb (within the 15 photo pixels the
        // data allows), between its head and its foot
        expect.soft(Math.abs(box.left - box.jamb), `${at} column at the gate's left jamb`).toBeLessThanOrEqual(15 * box.scale);
        expect.soft(box.top, `${at} column under the gate's head`).toBeGreaterThanOrEqual(box.head);
        expect.soft(box.bottom, `${at} column over the gate's foot`).toBeLessThanOrEqual(box.foot);
      }
    }
    // …the purlins' over the walls', where both are drawn
    if (width > 900) expect.soft(byId.bracing.bottom, `${at} the purlins' name over the walls'`).toBeLessThanOrEqual(byId.wall.top);
    // and on a narrow frame each leader runs to where its name stands there
    if (width <= 900) {
      const narrow = await stage.evaluate((element) => [...element.querySelectorAll('.hv2-proof-tag-leaders path')].map((path) => ({
        tag: path.parentElement!.getAttribute('data-tag'), narrow: path.hasAttribute('data-narrow'), wide: path.hasAttribute('data-wide'), shown: getComputedStyle(path).display !== 'none',
      })));
      for (const leader of narrow) {
        if (leader.narrow) expect.soft(leader.shown, `${at} ${leader.tag} narrow leader`).toBe(true);
        if (leader.wide) expect.soft(leader.shown, `${at} ${leader.tag} wide leader`).toBe(false);
      }
    }
    expect.soft(await settledClashes(stage, true), at).toEqual([]);
  }
});

test('the tracing is quiet: the photo only inside the building, the sheet’s paper and grid round it, the building free of the grid, the ground drawn under it', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const { stage } = await open(page);
  const { silhouette } = homeProofFrame;
  const { width: W, height: H } = homeProofContour.photo;
  const trace = stage.locator('.hv2-contour-trace');
  // Round the building, the sheet's flat paper
  await expect(trace).toHaveCSS('background-color', 'rgb(22, 24, 23)');
  // One mask, the building's silhouette as drawn, in the photo's own pixels over the whole canvas: the photo inside it,
  // the grid everywhere but inside it
  const masks = await trace.evaluate((element) => {
    const [picture, grid] = [getComputedStyle(element.querySelector('picture')!), getComputedStyle(element, '::after')];
    return { picture: picture.maskImage, pictureSize: picture.maskSize, grid: grid.maskImage, gridSize: grid.maskSize, composite: grid.maskComposite };
  });
  const building = /^url\("data:image\/svg\+xml,([^"]+)"\)$/.exec(masks.picture)?.[1];
  expect(building, masks.picture).toBeDefined();
  const svg = decodeURIComponent(building!);
  expect(svg).toContain(`viewBox='0 0 ${W} ${H}'`);
  for (const outline of silhouette) expect(svg).toContain(`M${outline.map(([x, y]) => `${x} ${y}`).join('L')}Z`);
  expect(masks.pictureSize).toBe('100% 100%');
  expect(masks.grid).toBe(`linear-gradient(rgb(0, 0, 0), rgb(0, 0, 0)), ${masks.picture}`);
  expect(masks.gridSize.split(', ').at(-1)).toBe('100% 100%');
  expect(masks.composite.split(', ')[0]).toBe('exclude');
  // …sized to the picture's own box, the canvas's whole: inline and empty (its img is positioned), it had none and
  // masked the photo away (review, 04.10)
  const boxes = await trace.evaluate((element) => [element, element.querySelector('picture')!].map((part) => {
    const { left, top, width, height } = part.getBoundingClientRect();
    return [left, top, width, height].map((value) => Math.round(value * 10) / 10);
  }));
  expect(boxes[1]).toEqual(boxes[0]);
  expect(boxes[1][2]).toBeGreaterThan(0);
  // The ground, as a drawing marks it: a line just under the cladding's foot along the long wall and the gable, from
  // edge to edge of the photo, hatched under it
  const ground = trace.locator('svg.hv2-contour-ground');
  await expect(ground).toHaveAttribute('viewBox', `0 0 ${W} ${H}`);
  await expect(ground.locator('path')).toHaveCount(2);
  const points = [...((await ground.locator('path').first().getAttribute('d')) ?? '').matchAll(/[ML]([\d.]+) ([\d.]+)/g)].map(([, x, y]) => [Number(x), Number(y)]);
  expect(points[0][0]).toBe(0);
  expect(points.at(-1)![0]).toBe(W);
  const [far, corner, near] = [silhouette[1][3], silhouette[0][5], silhouette[0][4]];
  const baseY = (x: number) => { const [a, b] = x < corner[0] ? [far, corner] : [corner, near]; return a[1] + ((b[1] - a[1]) * (x - a[0])) / (b[0] - a[0]); };
  for (const [x, y] of points) expect(y - baseY(x), `${x}`).toBeGreaterThan(0);
  for (const [x, y] of points) expect(y - baseY(x), `${x}`).toBeLessThan(20);
  expect(((await ground.locator('.hv2-contour-ground-hatch').getAttribute('d')) ?? '').match(/M/g)?.length).toBeGreaterThan(W / 18 - 2);

  // And so it paints, right of the resting seam, every layer over the tracing put away: on the gable's wall between the
  // right gate and the corner the photo shows; in the sky over the right rake it does not, the grid does
  await stage.locator('.hv2-contour-canvas > :is(svg, .hv2-proof-labels), .hv2-contour-corner, .hv2-contour-rail').evaluateAll((elements) => {
    for (const element of elements) (element as HTMLElement).style.display = 'none';
  });
  const region = async ([x0, y0, x1, y1]: readonly number[]) => {
    const ctm = await ground.evaluate((element) => { const { a, d, e, f } = (element as SVGSVGElement).getScreenCTM()!; return { a, d, e, f }; });
    return { x: ctm.a * x0 + ctm.e, y: ctm.d * y0 + ctm.f, width: ctm.a * (x1 - x0), height: ctm.d * (y1 - y0) };
  };
  const wall = await region([1260, 380, 1440, 520]);
  // (a phone's close-up starts at the photo's row 92 and ends at its column 1504)
  const sky = await region(phoneOf(page) ? [1200, 94, 1490, 180] : [1030, 65, 1480, 125]);
  const frame = (await stage.boundingBox())!;
  for (const part of [wall, sky]) {
    expect(part.x).toBeGreaterThan(frame.x + (frame.width * DEFAULT_SPLIT) / 100);
    expect(part.x + part.width).toBeLessThan(frame.x + frame.width);
    expect(part.y).toBeGreaterThan(frame.y);
  }
  const photo = trace.locator('picture');
  const without = async (hide: () => Promise<unknown>, show: () => Promise<unknown>) => {
    const shots = [await steadyShot(page, wall), await steadyShot(page, sky)];
    await hide();
    const bare = [await steadyShot(page, wall), await steadyShot(page, sky)];
    await show();
    return { wall: [shots[0], bare[0]] as const, sky: [shots[1], bare[1]] as const };
  };
  await expect.poll(() => trace.locator('picture img').evaluate((image) => (image as HTMLImageElement).complete && (image as HTMLImageElement).naturalWidth > 0), { message: 'the tracing’s photo has loaded' }).toBe(true);
  const ofPhoto = await without(
    () => photo.evaluate((element) => { (element as HTMLElement).style.visibility = 'hidden'; }),
    () => photo.evaluate((element) => { (element as HTMLElement).style.visibility = ''; }),
  );
  expect(await differing(page, ...ofPhoto.wall), 'the photo inside the building').toBeGreaterThan(200);
  expect(await differing(page, ...ofPhoto.sky), 'no photo in the sky').toBeLessThan(SPECKS);
  // The grid is faint (a tenth of the paper's ink): compared finely
  const ofGrid = await without(
    () => page.evaluate(() => {
      const style = document.createElement('style');
      style.id = 'grid-off';
      style.textContent = 'main[data-home="v2"] .hv2-contour-trace::after { visibility: hidden !important; }';
      document.head.appendChild(style);
    }),
    () => page.evaluate(() => document.getElementById('grid-off')?.remove()),
  );
  expect(await differing(page, ...ofGrid.sky, 10), 'the grid in the sky').toBeGreaterThan(100);
  expect(await differing(page, ...ofGrid.wall, 10), 'no grid on the building').toBeLessThan(SPECKS);
});

test('on a phone the frame is a close-up of the gable: the canvas zoomed in, the right side’s window at the seam with its drawing on that canvas, the photo fetched for it, the lines at their set weight', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'desktop-chromium', 'a phone\'s frame');
  test.setTimeout(90_000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const width of [412, 390, 360, 320]) {
    await page.setViewportSize({ width, height: 800 });
    const { sheet, stage, slider } = await open(page);
    const geometry = () => stage.evaluate((element) => {
      const [frame, canvas] = [element, element.querySelector('.hv2-contour-canvas')!].map((part) => part.getBoundingClientRect());
      return { frame: { left: frame.left, top: frame.top, right: frame.right, bottom: frame.bottom, width: frame.width }, canvas: { left: canvas.left, top: canvas.top, width: canvas.width } };
    });
    const { frame, canvas } = await geometry();
    // The canvas 1.22 × the frame's width, 19.46 % of it off to the left, the photo's row 92 at the frame's top (review,
    // 04.10: from row 59 the base and the gates' feet sat under the handle at 320–360 px)…
    expect(canvas.width, `${width}`).toBeCloseTo(frame.width * PHONE_ZOOM, 0);
    expect(canvas.left - frame.left, `${width}`).toBeCloseTo((-frame.width * PHONE_LEFT) / 100, 0);
    expect(canvas.top - frame.top, `${width}`).toBeCloseTo((-canvas.width * PHONE_TOP_ROW) / 1536, 0);
    // …so the frame shows the photo's columns 245–1504 and rows 92–738
    const scale = canvas.width / 1536;
    expect(Math.abs((frame.left - canvas.left) / scale - 245), `${width}`).toBeLessThanOrEqual(1);
    expect(Math.abs((frame.right - canvas.left) / scale - 1504), `${width}`).toBeLessThanOrEqual(1);
    expect(Math.abs((frame.top - canvas.top) / scale - PHONE_TOP_ROW), `${width}`).toBeLessThanOrEqual(1);
    expect(Math.abs((frame.bottom - canvas.top) / scale - 738), `${width}`).toBeLessThanOrEqual(1);
    // …the gable whole in it: its outline, its footings, the snow's comb and every part of the wind — its short gusts'
    // tails, its lift, its links, its legs and the ground's answer
    const { wind } = homeProofFrame;
    const outside = await stage.evaluate((element, points) => {
      const ctm = element.querySelector<SVGSVGElement>('svg.hv2-proof-frame')!.getScreenCTM()!;
      const box = element.getBoundingClientRect();
      return points.filter(([x, y]) => {
        const [sx, sy] = [ctm.a * x + ctm.e, ctm.d * y + ctm.f];
        return sx < box.left || sx > box.right || sy < box.top || sy > box.bottom;
      });
    }, [
      ...homeProofFrame.silhouette[0],
      ...homeProofFrame.members.filter((member) => member.group === 'footing' && member.closed).flatMap((member) => member.points),
      ...homeProofFrame.load.comb, ...homeProofFrame.load.arrows.flat(),
      ...wind.gusts.flat(), ...wind.lift.flat(), ...wind.links.flatMap((link) => link.points), ...wind.legs.flat(), ...wind.reactions.flat(),
    ].map(([x, y]) => [x, y]));
    // (soft: every width's misses named in one run, and the rest of the close-up still checked)
    expect.soft(outside, `${width}`).toEqual([]);

    // The right side's window has its edge on screen exactly at the seam, a per cent of the frame, and the drawing in it
    // stands on the same zoomed canvas as the photo (review, 05.10: every canvas placed alike, so the window lines up) —
    // its tracing, its layers and its words, the stamp too
    for (const value of [0, 30, DEFAULT_SPLIT, 100]) {
      await splitTo(page, slider, value);
      await expectWindow(stage, value, `${width} ${value}`);
      expect(await seamAt(stage), `${width} ${value}`).toBeCloseTo(value, 1);
    }
    await splitTo(page, slider, DEFAULT_SPLIT);
    // «Контур на фото» lays the lines over the photo, on its canvas
    const toggle = sheet.getByRole('button', { name: 'Контур на фото', exact: true });
    await toggle.click();
    await expect(stage.locator(PHOTO_LINES)).toHaveCSS('visibility', 'visible');
    await toggle.click();
    await expect(stage.locator(PHOTO_LINES)).toHaveCSS('visibility', 'hidden');

    // The photo is fetched for the canvas's width, not the frame's (the srcset's sizes × 1.22)
    const fetched = await stage.locator('.hv2-contour-canvas > picture img').evaluate((element) => [(element as HTMLImageElement).naturalWidth, element.getBoundingClientRect().width]);
    expect(Math.abs(fetched[0] - fetched[1]), `${width}`).toBeLessThanOrEqual(1);
    // The lines keep their set weight on the screen, within a fifth (home-v2.css: --u stepped by width and divided by the
    // zoom): the measured outline is --lw-1 × --k CSS pixels
    const outline = await stage.locator(`${PANE_LINES} .hv2-contour-ink path[data-kind="outline"]`).first().evaluate((path) => {
      const style = getComputedStyle(path);
      const sheetStyle = getComputedStyle(path.closest('.hv2-contour')!);
      return { width: parseFloat(style.strokeWidth), set: parseFloat(sheetStyle.getPropertyValue('--lw-1')) * parseFloat(sheetStyle.getPropertyValue('--k')) };
    });
    const onScreen = outline.width * scale;
    expect(onScreen / outline.set, `${width}: ${onScreen.toFixed(2)} px`).toBeGreaterThan(0.8);
    expect(onScreen / outline.set, `${width}: ${onScreen.toFixed(2)} px`).toBeLessThan(1.2);
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
  // «Контур на фото» lays the measured lines over the photo only: the sketch has its own composition. The photo's copy
  // shows, the right side's stays hidden, and the window — the sketch's own dark ground — covers the photo's copy right
  // of the seam: there the pixels are the same with the lines and without, left of it they are not
  const toggle = sketch.sheet.getByRole('button', { name: 'Контур на фото', exact: true });
  const frame = (await sketch.stage.boundingBox())!;
  const seam = frame.x + (frame.width * DEFAULT_SPLIT) / 100;
  const photoSide = { x: frame.x + 1, y: frame.y + 40, width: seam - 30 - frame.x, height: frame.height - 41 };
  const rightSide = { x: seam + 30, y: frame.y + 80, width: frame.x + frame.width - seam - 31, height: frame.height - 81 };
  await expect(sketch.stage.locator('.hv2-contour-pane .hv2-contour-sketch')).toHaveCSS('background-color', 'rgb(22, 24, 23)');
  const before = [await steadyShot(page, photoSide), await steadyShot(page, rightSide)];
  await toggle.click();
  await expect(sketch.stage.locator(PHOTO_LINES)).toBeVisible();
  await expect(sketch.stage.locator(PANE_LINES)).toBeHidden();
  await expectWindow(sketch.stage, DEFAULT_SPLIT);
  expect(await differing(page, before[0], await steadyShot(page, photoSide)), 'the lines over the photo').toBeGreaterThan(200);
  expect(await differing(page, before[1], await steadyShot(page, rightSide)), 'none over the sketch').toBeLessThan(SPECKS);
  await toggle.click();
  // The scheme is one press away, for the comparison — with its own note, not the sketch's
  await sketch.layers.getByRole('button', { name: 'Каркас' }).click();
  await expect(sketch.stage.locator('.hv2-proof-scheme')).toBeVisible();
  await expect(sketch.stage.locator('.hv2-contour-sketch')).toBeHidden();
  const note = sketch.sheet.locator('.sheet-cell-note');
  await expect(note).not.toContainText('згенероване');
  await expect(note).toContainText('Креслень саме цього ангара в нас немає, тож каркас показано схемою');
  await expect(sketch.stage.getByRole('img', { name: homeProofFrame.label, exact: true })).toBeVisible();
  // No visible word names the old idea
  expect(await sketch.sheet.innerText()).not.toMatch(/x-?ray|рентген/i);
});
