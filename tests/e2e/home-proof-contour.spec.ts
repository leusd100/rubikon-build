import { expect, test, type BrowserContext, type Locator, type Page } from '@playwright/test';
import { homeProofContour } from '../../app/data/homeProofContour';
import { homeProofDetailSpots, homeProofFrame } from '../../app/data/homeProofFrame';

// The sheet plots in and sweeps before most tests start, and a machine running other suites stretches that: a minute a
// test unless a test sets its own
test.describe.configure({ timeout: 60_000 });

// HOME's proof (owner, 04.10): one «Креслення» sheet, the photo left of a seam and right of it its tracing with a layer
// chosen in the title block — «Каркас» (the default: a SCHEME of a frame of this object's type in its silhouette,
// labelled so), «Сніг» and «Вітер» (each load's way through that scheme, each in its own tint). The seam is a real range
// input (keys, screen readers); a mouse drags anywhere in the frame, a finger only the handle, and on a phone «Фото» /
// «Схема» show one side whole. Arriving with motion, the sheet plots in as a whole photo and the seam sweeps once from
// the right edge across the gable and back to rest («шов-плотер»); without motion or JavaScript the sheet stands
// complete. On a laptop the sheet fits under the header where the window has the room, and its title block is never
// under the picture.
// The review of 04.10 added: the sweep still plays when the visitor arrives by the wheel or a swipe; the right side's
// words (the stamp) lie on it only; no name on the frame covers another or runs off it; the loads are never drawn in the
// measured copper. The owner's reviews of 04.10 added: a load is a drawing's comb of arrows and lines on a casing, weight
// rather than a glow; passing a line of the outline the seam lights it and names it, but never holds there; the tracing
// is quiet — the photo inside the building only, the paper and its grid round it; a phone's frame is a close-up of the
// gable. The fourth round's review (04.10) added: each load's way is written in the title block's legend, not on the
// frame; a name that meets the seam's names or the stamp is hidden whole, as one the seam cuts; the purlins' name is not
// drawn on a narrow frame; a key, the range, a button or a layer leaves no line lit; the scheme's name says the wind's
// way; the wind's gusts are long where the frame has room and short in a phone's close-up; a phone's close-up keeps the
// base clear of the handle; the seam's parts ride one rail moved by a transform, so moving it shifts no layout.
// The review of 05.10 rebuilt the seam for speed: the right side is a window moved to the seam by a transform, its
// content moved back by as much (no clip-path anywhere); --split lives on the four that carry it only, not on the stage;
// the rest of the sheet — the range, the names that give way, the stamp — is told at most every COMMIT_EVERY while a
// pointer moves it, at once when it stops. The seam's right-hand name gives way to a word of the drawing it would cover;
// the purlins' name stands on the right wall's face at every width; a load's legend is compact, its tint its key.
// The owner's review of 05.10 (approved): «Контур» is gone, and with it the contour's figures and every «виміряно /
// наближено» — the outline is one solid line, the held line's name is its name only — and so is «Контур на фото»: the
// action cell holds «Тур за 20 секунд» over the way on to a brief for a hangar like this one. A mouse over the frame no
// longer leads the seam: it moves only while a button is held, or a finger is on the handle; on «Каркас» a mouse names
// the member it is over instead («жива схема»), a finger's tap for a moment. The snow is blue, the wind turquoise, their
// ways lit in that colour on a dark casing, light drops looping down them for as long as the layer is on; each word of a
// way in the legend is a button that lights its link alone. Five nodes are drawn as details in a colour of their own
// (А–Д, magenta): opened, the
// panel grows out of its ring and the seam steps clear of the ring; «Навантаження», «Розібрати», «На фото», ‹ › and Esc.
// The tour shows the block in about twenty seconds and hands it back at the visitor's first press or key.

const DEFAULT_SPLIT = 62;
// The first view's sweep (ProofContour): SWEEP_AT after the sheet arrives, once the page has been quiet SWEEP_QUIET, from
// the right edge to SWEEP_TURN and back to rest over SWEEP_MS — on a phone too (audit 08.10: turning at 38 %, the photo is
// never gone, and 1.8 s, not 3)
const SWEEP_AT = 1050;
const SWEEP_QUIET = 250;
const SWEEP_TURN = 38;
const SWEEP_MS = 1800;
const SWEEP_MS_PHONE = 1800;
// Passing a line of the outline, in per cent of the frame: it is lit within GRAB of the seam, until the seam is past
// RELEASE
const SNAP_GRAB = 0.8;
const SNAP_RELEASE = 1.4;
// While a pointer moves the seam, the rest of the sheet is told at most this often, ms (ProofContour's COMMIT_EVERY)
const COMMIT_EVERY = 100;
// The four that carry the seam's place (ProofContour; home-v2.css registers --split not inherited, so the stage keeps
// its initial 62 %): the right side's window and its counter-moved content, the rail, the handle
const CARRIERS = ['.hv2-contour-pane', '.hv2-contour-pane-inner', '.hv2-contour-rail', '.hv2-contour-handle'];
// The right side's copy of the outline (role="img") — the only one: the photo's own copy went with «Контур на фото»
const PANE_LINES = '.hv2-contour-pane svg.hv2-contour-lines';
// A phone's close-up of the gable (≤ 760 px): the canvas 1.22 × the frame's width, 19.46 % of it off to the left, so a
// per cent of the canvas stands at (per cent × ZOOM − LEFT) of the frame — the photo's columns 245–1504 and, since 09.10,
// all its rows (0–788: the frame the photo's full height, the sheet edge to edge); the sweep turns at 38 % there too
const PHONE_ZOOM = 1.22;
const PHONE_LEFT = 19.46;
const PHONE_TOP_ROW = 0;
const SWEEP_TURN_PHONE = 38;
const onStage = (canvas: number, phone: boolean) => (phone ? canvas * PHONE_ZOOM - PHONE_LEFT : canvas);
const onCanvas = (stage: number, phone: boolean) => (phone ? (stage + PHONE_LEFT) / PHONE_ZOOM : stage);
const phoneOf = (page: Page) => page.viewportSize()!.width <= 760;
// Three layers (owner, 05.10: «Контур» is gone)
const LAYERS = ['Каркас', 'Сніг', 'Вітер'];
// Each load's way as the legend writes it (ProofContour's CHAINS): word by word, each word a button lighting its part of
// the drawing — the part that carries the same --n and data-step in ProofFrame (the wind skips 1: its lift has no word
// of its own)
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
/** A vertical of the outline's mean x, in per cent of the canvas: where the seam lights it */
const meanX = (id: string, from: number, to?: number) => {
  const part = lineOf(id).points.slice(from, to);
  return (part.reduce((sum, [x]) => sum + x, 0) / part.length / homeProofContour.photo.width) * 100;
};
// What the seam lights: the gates' jambs and the gable's corners — never the ridge, which nobody measured. Named by its
// name only (owner, 05.10: no «виміряно» / «наближено»)
const SNAPS = [
  { line: 'gable-base', at: meanX('gable-base', 1), name: 'Лівий кут фронтона' },
  { line: 'gate-left', at: meanX('gate-left', 0, 2), name: 'Ліві ворота, одвірок' },
  { line: 'gate-left', at: meanX('gate-left', 2), name: 'Ліві ворота, одвірок' },
  { line: 'gate-right', at: meanX('gate-right', 0, 2), name: 'Праві ворота, одвірок' },
  { line: 'gate-right', at: meanX('gate-right', 2), name: 'Праві ворота, одвірок' },
  { line: 'gable-corner-right', at: meanX('gable-corner-right', 2), name: 'Правий кут фронтона' },
];
type Snap = (typeof SNAPS)[number];
/** The seam's place in tenths of a per cent, as its four carriers' --split has it */
const tenths = (value: number) => `${Math.round(value * 10) / 10}%`;
const rgb = (color: string) => (color.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number);
/** How far apart two colours are: the largest difference in a channel */
const apart = (a: string, b: string) => Math.max(...rgb(a).map((value, index) => Math.abs(value - rgb(b)[index])));
/** A colour's hue, in degrees */
const hueOf = (color: string) => {
  const [r, g, b] = rgb(color).map((value) => value / 255);
  const [max, min] = [Math.max(r, g, b), Math.min(r, g, b)];
  if (max === min) return 0;
  let sector = (r - g) / (max - min) + 4;
  if (max === r) sector = ((g - b) / (max - min)) % 6;
  else if (max === g) sector = (b - r) / (max - min) + 2;
  return (sector * 60 + 360) % 360;
};
/** The contrast ratio of two colours (WCAG) */
const contrast = (a: string, b: string) => {
  const luminance = (color: string) => {
    const [r, g, b] = rgb(color).map((value) => {
      const channel = value / 255;
      return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const [lighter, darker] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (lighter + 0.05) / (darker + 0.05);
};
/** A colour token of HOME's (main's custom property), resolved to the rgb() a computed colour is compared with */
const tokenColour = (page: Page, token: string) => page.evaluate((name) => {
  const probe = document.createElement('i');
  probe.style.color = `var(${name})`;
  document.querySelector('main[data-home="v2"]')!.appendChild(probe);
  const colour = getComputedStyle(probe).color;
  probe.remove();
  return colour;
}, token);
const SLIDER = /^Порівняти фото й (?:схему|ескіз)$/;
// Words that claim more than a photo and a scheme can give. «Не креслення цього ангара» — the scheme saying what it is
// not — stays allowed by the look-behind.
const FORBIDDEN = /digital\s*twin|двійник|3\s*d\b|тривимір|модел|точн|обмір|x-?ray|рентген|(?<!не\s)креслення\s+(?:цього|ангара)|конструкція цього ангара|паспорт|load\s*path|explorer|наш каркас/i;
// No length, area, mass or level anywhere on the sheet: the photos give no scale
const UNITS = /\d\s*(?:мм|см|м|км|м²|кг|т)(?![а-яіїєґʼ’])|метр|відмітк|[+−]\d|\d\.\d/iu;
const COPPER = 'rgb(204, 132, 85)';
const PAPER = 'rgb(237, 232, 222)';
// The loads' tints (owner, 05.10: «сніг синім», the wind turquoise), each with the light tone of the drops that run down
// its way
const SNOW = 'rgb(90, 168, 255)';
const SNOW_LIGHT = 'rgb(227, 240, 255)';
const WIND = 'rgb(79, 216, 200)';
const WIND_LIGHT = 'rgb(220, 251, 246)';
// The nodes drawn as details are in a colour of their own, main's --hv2-node (owner, 05.10: a copper ring read as one of
// the copper lines behind the gable; gold, then magenta — no other hue on the sheet or in the photo), their letters in
// --hv2-node-ink: read off the page (tokenColour), never pinned here
// The five nodes (ProofDetails' PROOF_DETAILS), in their letters' order
const NODES = [
  { id: 'bearing', letter: 'А', title: 'Опора ферми на стіну' },
  { id: 'purlin', letter: 'Б', title: 'Прогін на вузлі ферми' },
  { id: 'base', letter: 'В', title: 'База колони' },
  { id: 'ridge', letter: 'Г', title: 'Коньковий вузол' },
  { id: 'chord', letter: 'Д', title: 'Вузол нижнього поясу' },
] as const;
type ProofNode = (typeof NODES)[number];
// The note under the picture, word for word (owner, 05.10: shorter — the drawing's stamp says «Схема · без розмірів»;
// pr-critical holds the server's to the same)
// The title block's one line (audit 08.10); the provenance and the retouch are said under the sheet
const LINE = 'Реальний ангар, який вів Сергій Іванович, і схема каркаса такого типу, без розмірів.';
const PROVENANCE = 'Сергій Іванович працював над цим об’єктом до створення RUBIKON BUILD. Фото з ретушшю переднього плану.';
// A phone's names of the scheme, keyed under the frame to its numbers (ProofContour's PHONE_KEY)
const PHONE_KEY = ['Ферма', 'Прогони й в’язі', 'Центральний ряд колон', 'Стіни — газобетон', 'Фундаменти — умовно'];
// «Тур за 20 секунд» (ProofContour's TOUR): each step's name and how long it holds, ms
const TOUR = [
  ['Каркас збирається', 4800], ['Сніг: куди йде вага', 3600], ['Вага на даху', 3000], ['Вітер: куди тисне', 3600], ['Вузол крупно', 4200], ['Такий, але ваш', 2600],
] as const;
const BRIEF_HREF = '/angary#configurator';

async function open(page: Page, path = '/') {
  await page.route(/\.mp4(?:\?|$)/, (route) => route.abort());
  await page.addInitScript(() => {
    try {
      localStorage.setItem('rubikon-consent-state', JSON.stringify({ analytics: 'denied', advertising: 'denied' }));
    } catch { /* storage unavailable */ }
  });
  await page.goto(path, { waitUntil: 'load' });
  const sheet = page.locator('#real-object .hv2-contour');
  const stage = sheet.locator('.hv2-contour-stage');
  // The stage itself in the middle of the window (review, 05.10): a phone's sheet is taller than the window, and bringing
  // the SHEET into view left a 320 px phone's stage above it, under the header — and the first view's sweep, which waits
  // for the stage to be 35 % in view, never started
  await centre(stage);
  // The photo, loaded (it may still be painting after that: steadyShot). The tracing's copy of it is the quiet tracing's
  // own test, so a tracing that never loads fails there, not in every test
  await page.waitForFunction(() => {
    const image = document.querySelector<HTMLImageElement>('#real-object .hv2-contour-canvas > picture img');
    return Boolean(image?.complete && image.naturalWidth > 0);
  });
  // With motion the picture is still being plotted in for a second, under the sheet's cover, which takes the pointer; then
  // the seam sweeps for three more. The tests here start from the sheet at rest (the arrival has tests of its own)
  await page.waitForFunction(() => {
    const figure = document.querySelector<HTMLElement>('.hv2-contour');
    const cover = figure?.querySelector('.sheet-cover');
    if (!figure || !cover || figure.dataset.sheetState === 'armed' || figure.querySelector('.hv2-contour-stage[data-sweep]')) return false;
    return cover.getAnimations().every((animation) => animation.playState === 'finished');
  });
  const slider = sheet.getByRole('slider', { name: SLIDER });
  // The controls come alive with hydration
  await expect(slider).toBeEnabled();
  // A key on the sheet (Shift: it does nothing) counts as the visitor's own: the arrival's afterbeats — the handle's
  // ring, the names, and on a laptop node Г opened by itself two seconds on — stand down, so no test meets them midway
  // (the arrival's tests, which do, go through arrivalOf / settleArrival)
  await sheet.dispatchEvent('keydown', { key: 'Shift' });
  return { sheet, stage, slider, layers: sheet.getByRole('group', { name: 'Що показати праворуч' }) };
}

/** The stage in the middle of the window, at once (the page scrolls smoothly otherwise) */
const centre = (stage: Locator) => stage.evaluate((element) => element.scrollIntoView({ block: 'center', behavior: 'instant' }));

/** The keyboard's focus ring, drawn on the handle's disc */
const ringOf = (stage: Locator) => stage.locator('.hv2-contour-handle').evaluate((element) => getComputedStyle(element, '::before').outlineStyle);

/** `count` of the page's own frames: a wait on its rendering, never a fixed sleep */
const nextFrames = (page: Page, count = 2) => page.evaluate((frames) => new Promise<void>((resolve) => {
  let left = frames;
  const tick = () => {
    left -= 1;
    if (left <= 0) resolve();
    else requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}), count);

/** Until the page's own clock has run `span` ms past `from`: to show that nothing happens meanwhile, what does happen
 *  being recorded in the page */
const pageClockPast = (page: Page, from: number, span: number) =>
  page.waitForFunction(([start, length]) => performance.now() >= start + length, [from, span] as const, { timeout: span + 15_000 });

/** Until the document's timeline — the clock its animations' start times are read on — has reached `time` */
const timelinePast = (page: Page, time: number) =>
  page.waitForFunction((at) => Number(document.timeline.currentTime) >= at, time, { timeout: 15_000 });

/** Every finite animation in it run to its end — a node's growth, its parts coming in, its parts drawn apart — the
 *  infinite ones (a load's drops) left running */
const finishAnimations = (target: Locator) => target.evaluate((element) => {
  for (const animation of element.getAnimations({ subtree: true })) {
    if (animation.effect?.getComputedTiming().endTime !== Infinity) animation.finish();
  }
});

/** Where a point of the photo (its own pixels) stands on the screen, read off the right side's canvas */
function photoPoint(stage: Locator, [x, y]: readonly [number, number]) {
  return stage.evaluate((element, [px, py, width, height]) => {
    const canvas = element.querySelector('.hv2-contour-pane .hv2-contour-canvas')!.getBoundingClientRect();
    return { x: canvas.left + (px / width) * canvas.width, y: canvas.top + (py / height) * canvas.height };
  }, [x, y, homeProofContour.photo.width, homeProofContour.photo.height] as const);
}

/** Opens a node as a visitor does — on a laptop by its letter on the scheme, on a phone from «Вузли крупно» in the title
 *  block (there its letter on the scheme may stand left of the resting seam, under the photo) — and lets the panel finish
 *  growing out of its ring (a press inside it mid-way lands where the panel is not yet) */
/** «Детальніше»: the legend, photo/scheme, the nodes named and a phone's figures are one press away (audit 08.10) */
async function openMore(page: Page) {
  const more = page.locator('#real-object .hv2-contour-more-btn');
  if ((await more.getAttribute('aria-expanded')) !== 'true') await more.click();
  await expect(more).toHaveAttribute('aria-expanded', 'true');
}

async function openNode(page: Page, node: ProofNode) {
  if (phoneOf(page)) await openMore(page);
  const letter = phoneOf(page)
    ? page.locator('#real-object figcaption .hv2-contour-nodes').getByRole('button', { name: `Вузол ${node.letter}: ${node.title}` })
    : page.locator(`#real-object .hv2-proof-detail-pin[data-detail="${node.id}"]`);
  await letter.click();
  const panel = page.locator('.hv2-detail');
  await expect(panel).toBeVisible();
  await panel.evaluate((element) => Promise.all(element.getAnimations().map((animation) => animation.finished.catch(() => undefined))));
  return panel;
}

/** `rest`: how long (ms) the finger stays put before it lifts. The moves land a few ms apart, a flick of thousands of
 *  px/s, so a swipe that scrolls the page lifts into a fling. With a rest the touch and its moves are stamped that much
 *  earlier than the lift, so the browser reads the finger as stopped by then, and nothing waits on the clock. */
async function touchDrag(page: Page, from: { x: number; y: number }, to: { x: number; y: number }, steps = 10, rest = 0) {
  const cdp = await page.context().newCDPSession(page);
  // CDP takes seconds since the epoch; without a rest the browser stamps each event as it arrives
  const at = (back: number) => (rest ? { timestamp: (Date.now() - back) / 1000 } : {});
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [from], ...at(rest) });
  for (let step = 1; step <= steps; step += 1) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: from.x + ((to.x - from.x) * step) / steps, y: from.y + ((to.y - from.y) * step) / steps }], ...at(rest) });
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [], ...at(0) });
}

/** A screenshot of the region once two in a row agree (the photo may still be painting after it has loaded) */
async function steadyShot(page: Page, clip: { x: number; y: number; width: number; height: number }) {
  let shot = await page.screenshot({ clip });
  await expect.poll(async () => {
    const next = await page.screenshot({ clip });
    const same = next.equals(shot);
    shot = next;
    return same;
  }, { intervals: [150], timeout: 1_500 }).toBe(true).catch(() => undefined);
  return shot;
}

/** How many pixels of two shots of one region differ by more than `threshold` in a channel. Re-compositing the stage (a
 *  layer shown or hidden) re-rasters the photo on a phone's fractional pixel ratio with ±1 noise across it and, rarely,
 *  a speck or two more; a line of the scheme or the outline on it is hundreds of pixels (review, 04.10: the exact
 *  comparison failed 1 run in 8 already before) */
const SPECKS = 20;
// Decoded on a blank page of its own — the site's CSP keeps data: URLs out of fetch — one per test (opening a page per
// comparison took seconds on a busy machine)
const scratchPages = new WeakMap<BrowserContext, Promise<Page>>();
async function differing(page: Page, a: Buffer, b: Buffer, threshold = 40) {
  const context = page.context();
  if (!scratchPages.has(context)) scratchPages.set(context, context.newPage());
  const scratch = await scratchPages.get(context)!;
  return scratch.evaluate(async ([first, second, limit]) => {
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
const tintOf = (sheet: Locator, load: Load) => sheet.locator(`.hv2-contour-legend-chain[data-load="${load}"] > .hv2-chain-step`).first().evaluate((word) => getComputedStyle(word).color);

/** A load's way as the legend writes it, read with reduced motion: the active layer's set — the only one shown — holds
 *  one chain: its key first, not drawn (compact, so the title block keeps its height on a laptop — review, 05.10: the
 *  tint is the key), then each link's word in that tint, in the way's order — a button (owner, 05.10: pointed at or
 *  pressed, it lights its link alone), not pressed yet — each with the --n and the data-step of its part of the drawing.
 *  Nothing of it is on the frame or in a phone's facts (review, 04.10: no free room there on a laptop) */
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
    word: child.matches('button.hv2-chain-step') ? `${child.getAttribute('type')} ${child.getAttribute('aria-pressed')}` : null,
  })));
  const [lead] = parts;
  expect({ key: lead.key, text: lead.text, n: lead.n, drawn: lead.drawn, word: lead.word }, load).toEqual({ key: load, text: '', n: '', drawn: false, word: null });
  expect(parts.slice(1).map(({ key, text, n, drawn, word }) => [key, text, Number(n), drawn, word]), load)
    .toEqual(CHAINS[load].words.map(([word, n]) => [null, word, n, true, 'button false']));
  for (const part of parts.slice(1)) expect(part.color, `${load} ${part.text}`).toBe(tint);
  const stage = sheet.locator('.hv2-contour-stage');
  for (const [word, n, part] of CHAINS[load].words) {
    const steps = await stage.locator(`${CHAINS[load].group} > ${part}`).evaluateAll((elements) => elements.map((element) => `${(element as SVGElement).style.getPropertyValue('--n')} ${element.getAttribute('data-step')}`));
    expect(steps.length, `${load} ${word}`).toBeGreaterThan(0);
    expect(new Set(steps), `${load} ${word}`).toEqual(new Set([`${n} ${n}`]));
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

/** The seam as drawn and what it lights: --split, data-snapped, the outline's lines marked lit (casing and ink), and the
 *  paths of the lit line drawn once more over both sides */
function seamState(stage: Locator) {
  return stage.evaluate((element, carriers) => {
    const splits = carriers.map((selector) => getComputedStyle(element.querySelector(selector)!).getPropertyValue('--split'));
    return {
      // the four carriers as one, or each named
      split: new Set(splits).size === 1 ? splits[0] : carriers.map((selector, index) => `${selector} ${splits[index]}`).join(', '),
      snapped: element.dataset.snapped ?? null,
      // every copy of the lines (the right side's is the only one: a copy over the photo shows up here as «photo»)
      lines: [...element.querySelectorAll<SVGPathElement>('.hv2-contour-lines path[data-snapped]')]
        .map((path) => `${path.closest('.hv2-contour-pane') ? 'pane' : 'photo'} ${path.parentElement!.getAttribute('class')} ${path.dataset.line}`),
      held: element.querySelectorAll('svg.hv2-contour-held path').length,
    };
  }, CARRIERS);
}

/** Which line of the outline a seam moved by a pointer lights (ProofContour's splitAt): the first within GRAB of it,
 *  kept until the seam is past RELEASE; `caught` counts the lines it has lit (a finger feels each) */
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
        ? { split: tenths(value), snapped: '', lines: [`pane hv2-contour-casing ${lit.line}`, `pane hv2-contour-ink ${lit.line}`], held: 2 }
        : { split: tenths(value), snapped: null, lines: [], held: 0 };
    },
  };
}

/** clashes() once the frame has settled (the handle reaches a new split on the next frame): none, or what stays */
async function settledClashes(stage: Locator, atRest = false) {
  let found = await clashes(stage, atRest);
  if (found.length === 0) return found;
  await expect.poll(async () => {
    found = await clashes(stage, atRest);
    return found;
  }, { intervals: [150], timeout: 1_500 }).toEqual([]).catch(() => undefined);
  return found;
}

/** The words on the stage that cover one another or run off the frame: the figure, the scheme's names, the stamp, the
 *  seam's names, «Вузли крупно» over the picture and, while the seam lights a line of the outline, that line's name. What
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
    add(element.querySelector('.hv2-contour-nodes[data-place="stage"]'), '«Вузли крупно»', false);
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

/** One frame of the first view as the page drew it: the stage's data-sweep, data-gliding and data-pulse; the seam's
 *  --split (its four carriers', and how far apart they are) and where the seam is drawn; where the right side's window
 *  has its edge (per cent of the frame) and how far its drawing stands off the photo's canvas (px); the script animations
 *  of --split on the carriers (the sweep's); the range's value; the figures' and the names' opacity; whether the picture
 *  is still plotting in; the handle's rings; whatever else animates on the stage */
type Frame = {
  t: number; sweep: string | null; gliding: boolean; pulse: boolean; split: number; spread: number; seam: number; window: number; drift: number;
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
    const cover = sheet.querySelector('.sheet-cover')!;
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
      // (not past the node the arrival opens by itself: it moves the seam clear of its ring, which is its own test)
      if (arrival.ended !== null && stage.dataset.detail !== undefined) {
        arrival.done = true;
        return;
      }
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
        split: splits[0],
        spread: Math.max(...splits) - Math.min(...splits),
        seam: ((seam.left + seam.width / 2 - frame.left) / frame.width) * 100,
        window: ((box.left - frame.left) / frame.width) * 100,
        drift: Math.max(Math.abs(inside.left - under.left), Math.abs(inside.top - under.top), Math.abs(inside.width - under.width)),
        sweeps: animations.filter(sweeping).length,
        range: stage.querySelector<HTMLInputElement>('.hv2-contour-range')!.value,
        words: [opacity('.hv2-proof-labels'), opacity('svg.hv2-proof-marks')],
        plotting: cover.getAnimations().some((animation) => animation.playState === 'running'),
        rings: `${rings.animationName} ${rings.animationIterationCount}`,
        others: animations.filter((animation) => !sweeping(animation))
          .map((animation) => (animation as CSSAnimation).animationName ?? (animation as CSSTransition).transitionProperty ?? 'script'),
      });
      // (to 2.5 s after the sweep — or until the node the arrival opens by itself, AUTO_NODE: it moves the seam clear of its
      // ring, which is its own test)
      if ((arrival.ended !== null && (performance.now() - arrival.ended > 2500 || stage.dataset.detail !== undefined)) || arrival.frames.length > 3000) arrival.done = true;
      else requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, CARRIERS);
}

/** After an arrival with motion a node opens by itself on a laptop or a tablet (ProofContour's AUTO_NODE, owner 09.10),
 *  its seam clear of its ring: closed again, the seam back at rest, for what a test checks after */
async function settleArrival(page: Page) {
  if (phoneOf(page)) return;
  const stage = page.locator('#real-object .hv2-contour-stage');
  await expect(stage).toHaveAttribute('data-detail', 'ridge', { timeout: 6_000 });
  await page.keyboard.press('Escape');
  await expect(page.locator('.hv2-detail')).toHaveCount(0);
  // Closing it, the seam glides back to its rest
  await expect.poll(() => splitOf(stage)).toBe(`${DEFAULT_SPLIT}%`);
}

async function arrivalOf(page: Page) {
  await page.waitForFunction(() => (window as unknown as { arrival: Arrival }).arrival.done, undefined, { timeout: 20_000 });
  return page.evaluate(() => (window as unknown as { arrival: Arrival }).arrival);
}

test('the sheet says in one line what the two halves are, the retouch and the provenance under it, and carries the outline — one solid line, no «виміряно» or «наближено»', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const { sheet, stage, layers } = await open(page);
  const stamp = sheet.locator('figcaption');
  // One line says what this is, word for word — the hydrated sheet's as the server's (pr-critical): a real hangar, who led
  // it, a scheme of the type, no sizes (audit 08.10: no kickers «Ліворуч / Об’єкт / Праворуч», no four-sentence note)
  await expect(stamp.locator('.hv2-contour-line')).toHaveText(LINE);
  for (const words of ['Ліворуч', 'Праворуч', 'Об’єкт']) await expect(stamp.getByText(words, { exact: true })).toBeHidden();
  // …and right under the sheet, where the facts begin: before RUBIKON BUILD, the photo's foreground retouched
  await expect(page.locator('#real-object .hv2-evidence-lead > p:not(.hv2-kicker)')).toHaveText(PROVENANCE);
  // Three layers: «Каркас» (the default), «Сніг», «Вітер». «Контур» is gone (owner, 05.10: «клієнту точно цього не
  // треба знати») and with it every word of the outline's measured / approximate split, on the page and for a screen
  // reader alike
  await expect(layers.getByRole('button')).toHaveText(LAYERS);
  await expect(layers.getByRole('button', { name: 'Каркас' })).toHaveAttribute('aria-pressed', 'true');
  expect(await page.locator('#real-object').evaluate((element) => [element.textContent, ...[...element.querySelectorAll('[aria-label]')].map((node) => node.getAttribute('aria-label'))].join(' ')))
    .not.toMatch(/виміряно|наближено/i);
  await expect(stage.locator('.hv2-contour-stamp')).toHaveText(/Схема · без розмірів\s*каркас такого типу, як на цьому об’єкті/);
  await expect(stage.locator('.hv2-contour-canvas > picture img')).toHaveAttribute('src', homeProofContour.photo.src);

  // The outline: one path per record in the right side's copy, in the photo's own pixels — the photo carries no copy of
  // it any more («Контур на фото» is gone) — and every one of them solid, the approximate ones too (owner, 05.10)
  const lines = stage.locator(`${PANE_LINES} .hv2-contour-ink path`);
  await expect(lines).toHaveCount(homeProofContour.lines.length);
  expect(await lines.evaluateAll((paths) => paths.map((path) => path.getAttribute('data-line')))).toEqual(homeProofContour.lines.map((line) => line.id));
  await expect(stage.locator('svg.hv2-contour-lines')).toHaveCount(1);
  await expect(sheet.getByRole('button', { name: 'Контур на фото' })).toHaveCount(0);
  expect(new Set(await stage.locator(`${PANE_LINES} path`).evaluateAll((paths) => paths.map((path) => getComputedStyle(path).strokeDasharray)))).toEqual(new Set(['none']));
  for (const svg of ['svg.hv2-contour-lines', 'svg.hv2-proof-frame', 'svg.hv2-proof-marks']) {
    expect(new Set(await stage.locator(svg).evaluateAll((elements) => elements.map((element) => element.getAttribute('viewBox')))), svg)
      .toEqual(new Set([`0 0 ${homeProofContour.photo.width} ${homeProofContour.photo.height}`]));
  }
  // Under role="img" the lines' own titles reach no one: the accessible names say what is drawn, and what the scheme is
  // and is not
  await expect(stage.getByRole('img', { name: homeProofContour.label })).toBeVisible();
  await expect(stage.getByRole('img', { name: homeProofFrame.label, exact: true })).toBeVisible();
  // No figure on the scheme any more (owner, 09.10: «Схил даху можна взагалі прибрати» — the last one; the gates' and the
  // proportion's had left with «Контур»): no measure, no mark, no chip, no list of figures for a screen reader
  await expect(stage.locator('.hv2-proof-measure, .hv2-proof-marks > [data-mark]')).toHaveCount(0);
  await expect(sheet.locator('.hv2-contour-chips')).toHaveCount(0);
  await expect(stage.getByRole('list', { name: 'За фото цього ангара, без масштабу' })).toHaveCount(0);
  const visible = await sheet.innerText();
  for (const words of ['Ширина торця', 'Ворота однакові']) expect(visible, words).not.toContain(words);

  // Figures only where something was measured, each with its sign; never a size; none of the words that claim more. The
  // sheet's other digits are the tour's length and a phone's numbers for the scheme's names, each checked as such
  const text = await sheet.evaluate((element) => element.textContent ?? '');
  const outsideMeasures = await sheet.evaluate((element) => {
    const copy = element.cloneNode(true) as HTMLElement;
    for (const node of copy.querySelectorAll('[data-measure], .hv2-contour-tour-btn, .hv2-contour-tour, .hv2-proof-keypins, .hv2-contour-key i')) node.remove();
    return copy.textContent ?? '';
  });
  expect(outsideMeasures).not.toMatch(/\d/);
  await expect(sheet.locator('.hv2-contour-tour-btn')).toHaveText('Тур за 20 секунд');
  expect(await stage.locator('.hv2-proof-keypins > span').allTextContents()).toEqual(['1', '2', '3', '4', '5']);
  expect(await sheet.locator('.hv2-contour-key i').allTextContents()).toEqual(['1', '2', '3', '4', '5']);
  for (const figure of await sheet.locator('[data-measure]').allTextContents()) {
    // (the signs' space is a no-break one)
    for (const match of figure.matchAll(/\d+(?:,\d+)?/g)) expect(figure.slice(0, match.index), figure).toMatch(/(?:[≈±]\s|приблизно |похибка )$/);
  }
  expect(text).not.toMatch(UNITS);
  expect(homeProofContour.label).not.toMatch(/\d/);
  expect(homeProofFrame.label).not.toMatch(/\d/);
  expect(homeProofFrame.windLabel).not.toMatch(/\d/);
  await expect(stage.getByRole('slider', { name: SLIDER })).toHaveAttribute('aria-valuetext', 'Фото ліворуч, схема праворуч: більше фото');
  for (const words of [visible, text, homeProofFrame.label, homeProofFrame.windLabel, await page.locator('#real-object').evaluate((element) => element.textContent ?? '')]) {
    expect(words).not.toMatch(FORBIDDEN);
  }
});

test('the scheme is its own layer: its gable plane paper-white, what stands behind it copper, never dashed, and always under its stamp', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const { stage, slider } = await open(page);
  const scheme = stage.locator('svg.hv2-proof-frame[data-layer="scheme"]');
  await expect(scheme).toBeVisible();
  // Every member of the scheme is in it and none carries the outline's «approximate» mark. The gable's own plane is
  // paper-white; what stands behind it is copper, solid (owner, 04.10), and only behind it
  await expect(scheme.locator('[data-group]:not(.hv2-proof-core)')).toHaveCount(homeProofFrame.members.filter((member) => member.group !== 'footing').length);
  await expect(scheme.locator('[data-approximate]')).toHaveCount(0);
  await expect(stage.locator('.hv2-contour-lines [data-group]')).toHaveCount(0);
  const strokes = new Set(await scheme.locator('.hv2-proof-scheme [data-group]:not([data-hidden], .hv2-proof-core)').evaluateAll((paths) => paths.map((path) => getComputedStyle(path).stroke)));
  expect([...strokes]).toEqual([PAPER]);
  // Of what stands behind, the first truss only, faint (owner, 09.10: «досить багато шуму»): the second one back, every
  // purlin's run into depth and the far bracing are not drawn
  for (const hiddenPart of await scheme.locator('.hv2-proof-scheme [data-hidden]:is([data-depth="2"], [data-group="purlin"])').all()) await expect(hiddenPart).toBeHidden();
  // The gable's chords are profiles: the member's line wide, its dark core over it — one core per chord
  const cores = scheme.locator('.hv2-proof-scheme .hv2-proof-core');
  await expect(cores).toHaveCount(homeProofFrame.members.filter((member) => member.group === 'truss' && member.depth === 0 && !member.hidden && !member.closed).length);
  expect(await cores.first().evaluate((path) => parseFloat(getComputedStyle(path).strokeWidth))).toBeLessThan(await scheme.locator('.hv2-proof-scheme [data-group="truss"][data-depth="0"]:not(.hv2-proof-core)').first().evaluate((path) => parseFloat(getComputedStyle(path).strokeWidth)) / 1.5);
  expect(await stage.locator(`${PANE_LINES} .hv2-contour-ink path`).first().evaluate((path) => getComputedStyle(path).stroke)).toBe(COPPER);
  const hidden = scheme.locator('.hv2-proof-scheme [data-hidden]');
  await expect(hidden).toHaveCount(homeProofFrame.members.filter((member) => member.hidden).length);
  expect(new Set(await hidden.evaluateAll((paths) => paths.map((path) => getComputedStyle(path).stroke)))).toEqual(new Set([COPPER]));
  expect(new Set(await scheme.locator('.hv2-proof-scheme [data-group]').evaluateAll((paths) => paths.map((path) => getComputedStyle(path).strokeDasharray)))).not.toContainEqual(expect.stringMatching(/px,? [\d.]+px$/));
  expect(await hidden.evaluateAll((paths) => paths.every((path) => Number(path.getAttribute('data-depth')) > 0))).toBe(true);
  // Line weights on a drawing's scale (owner, 04.10): the outline heaviest; the gable's chords, its columns and what the
  // section cuts one step down; its webs another; the blockwork finest. Square ends and sharp joins, as a plotter draws
  // them (the outline is one solid line — owner, 05.10)
  const weight = (selector: string) => stage.locator(selector).first().evaluate((element) => parseFloat(getComputedStyle(element).strokeWidth));
  const outline = await weight(`${PANE_LINES} .hv2-contour-ink path[data-kind="outline"]:not([data-approximate])`);
  // (since 09.10 the chords are profiles, drawn wider than the outline: their dark core makes the two edges; the columns
  // and what the section cuts keep the chords' old weight)
  const chord = await weight('.hv2-proof-scheme [data-group="truss"][data-depth="0"]:not(.hv2-proof-core)');
  const column = await weight('.hv2-proof-scheme [data-group="column"][data-depth="0"]');
  const web = await weight('.hv2-proof-scheme [data-group="web"][data-depth="0"]');
  expect(outline).toBeGreaterThan(column);
  expect(chord).toBeGreaterThan(outline);
  expect(await weight('.hv2-proof-cut'), 'cut').toBe(column);
  expect(column).toBeGreaterThan(web);
  expect(web).toBeGreaterThan(await weight('.hv2-proof-blocks'));
  const ends = await stage.locator('.hv2-proof-scheme [data-group]:not(.hv2-proof-core, [data-group="truss"][data-depth="0"]:not([data-hidden])), .hv2-contour-ink path:not([data-approximate], [data-kind="outline"])').evaluateAll((paths) => paths.map((path) => `${getComputedStyle(path).strokeLinecap} ${getComputedStyle(path).strokeLinejoin}`));
  expect(new Set(ends)).toEqual(new Set(['butt miter']));
  // (a profile's ends square, so its two edges close at the corners)
  expect(new Set(await stage.locator('.hv2-proof-scheme :is(.hv2-proof-core, [data-group="truss"][data-depth="0"]:not([data-hidden]))').evaluateAll((paths) => paths.map((path) => getComputedStyle(path).strokeLinecap)))).toEqual(new Set(['square']));
  // …but the outline, drawn in parts, closes its corners with square ends (butt ends notched them)
  const outlineEnds = await stage.locator('.hv2-contour-ink path[data-kind="outline"]').evaluateAll((paths) => paths.map((path) => `${getComputedStyle(path).strokeLinecap} ${getComputedStyle(path).strokeLinejoin}`));
  expect(new Set(outlineEnds)).toEqual(new Set(['square miter']));
  // The truss's panel points are open nodes: a ring in the scheme's paper, the sheet's dark inside it
  const nodes = stage.locator('.hv2-proof-nodes circle');
  await expect(nodes).toHaveCount(homeProofFrame.nodes.length);
  expect(new Set(await nodes.evaluateAll((circles) => circles.map((circle) => `${getComputedStyle(circle).stroke} ${getComputedStyle(circle).fill === getComputedStyle(circle).stroke}`)))).toEqual(new Set([`${PAPER} false`]));
  // Its names are words on the scheme, its legend says «схема» in the scheme's own colour — one press away, «Детальніше»
  // (audit 08.10: «контур / схема / у глибині» is a draughtsman's key)
  for (const tag of homeProofFrame.tags) await expect(stage.locator(`.hv2-proof-tag[data-tag="${tag.id}"]`)).toHaveText(tag.text);
  await expect(page.locator('#real-object .hv2-contour-legend [data-on] [data-key="scheme"]')).toBeHidden();
  await openMore(page);
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

test('the snow is drawn in its own blue, as a drawing writes it: its way lit in that blue on a dark casing, light round drops down the legs — weight, no glow, nothing in the measured copper', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const { sheet, stage, layers } = await open(page);
  await layers.getByRole('button', { name: 'Сніг' }).click();
  await expect(stage.locator('.hv2-proof-load')).toBeVisible();
  // The snow's blue (owner, 05.10: «сніг синім»), the legend's words in it — the tint is the key
  const load = await tintOf(sheet, 'load');
  expect(load).toBe(SNOW);
  const strokes = await stage.locator('.hv2-proof-load :is(path, rect, circle)').evaluateAll((parts) => parts.map((part) => {
    const style = getComputedStyle(part);
    return { kind: part.getAttribute('class') ?? part.parentElement?.getAttribute('class') ?? '', stroke: style.stroke, fill: style.fill, dash: style.strokeDasharray };
  }));
  expect(strokes.length).toBeGreaterThan(10);
  // The outline is a solid copper line: no part of the load may be one
  for (const part of strokes) {
    expect(part.stroke === COPPER && part.dash === 'none', `${part.kind}: ${part.stroke} ${part.dash}`).toBe(false);
    expect(part.fill, part.kind).not.toBe(COPPER);
  }
  const strokesOf = async (selector: string) => new Set(await stage.locator(selector).evaluateAll((parts) => parts.map((part) => getComputedStyle(part).stroke)));

  // The snow spread over the roof: one line and a comb of arrows down from it, in the snow's blue, the arrows headed and
  // the line not (where they stand: the next test)
  await expect(stage.locator('.hv2-proof-snow path')).toHaveCount(homeProofFrame.load.arrows.length + 1);
  await expect(stage.locator('.hv2-proof-snow .hv2-proof-comb')).toHaveCount(1);
  expect(await strokesOf('.hv2-proof-snow path')).toEqual(new Set([load]));
  expect(await stage.locator('.hv2-proof-snow path:not(.hv2-proof-comb)').evaluateAll((paths) => paths.map((path) => path.getAttribute('marker-end')))).toEqual(homeProofFrame.load.arrows.map(() => 'url(#hv2-proof-head)'));
  await expect(stage.locator('.hv2-proof-comb')).not.toHaveAttribute('marker-end', /.*/);
  expect(await page.locator('#real-object marker#hv2-proof-head path').evaluate((path) => getComputedStyle(path).fill)).toBe(load);
  // The strip one truss carries with the edge the snow settles on, and the nodes the purlins bear on, in the same blue
  await expect(stage.locator('g.hv2-proof-roof > path')).toHaveCount(2);
  expect(await strokesOf('.hv2-proof-roof-edge')).toEqual(new Set([load]));
  const bearings = stage.locator('.hv2-proof-bearing circle');
  await expect(bearings).toHaveCount(homeProofFrame.nodes.length);
  expect(new Set(await bearings.evaluateAll((circles) => circles.map((circle) => getComputedStyle(circle).fill)))).toEqual(new Set([load]));

  // The gable's truss lit in the snow's blue, and each lit link a line in that blue over a dark, wider casing, with no
  // filter anywhere in it (owner, 04.10: «вага, а не неон»; 05.10: the way in the load's own colour, not the scheme's
  // paper)
  expect(await strokesOf('.hv2-proof-lit-truss path')).toEqual(new Set([load]));
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
    expect(parts).toEqual({ tag: 'g', paths: 2, casingFirst: true, light: load, casingDark: true, wider: true, filters: ['none', 'none', 'none'] });
  }
  // The drops: the blue's light tone, round dots down each leg (a dash far shorter than the line is wide, round-capped,
  // far apart), headed with their own foot in that tone
  const drops = await stage.locator('.hv2-proof-load > .hv2-proof-flow').evaluateAll((paths) => paths.map((path) => {
    const style = getComputedStyle(path);
    const [dash, gap] = style.strokeDasharray.split(/,?\s+/).map(parseFloat);
    return { stroke: style.stroke, cap: style.strokeLinecap, dot: dash < parseFloat(style.strokeWidth) / 4 && gap > 10 * dash, head: path.getAttribute('marker-end') };
  }));
  expect(drops).toEqual(homeProofFrame.load.legs.map(() => ({ stroke: SNOW_LIGHT, cap: 'round', dot: true, head: 'url(#hv2-proof-foot)' })));
  expect(await page.locator('#real-object marker#hv2-proof-foot path').evaluate((path) => getComputedStyle(path).fill)).toBe(SNOW_LIGHT);
  // The legend writes the snow's way, word by word
  await expectChain(sheet, 'load', load);
  // …and the scheme keeps its own name: the wind's way is not said on the snow's layer
  await expect(stage.getByRole('img', { name: homeProofFrame.label, exact: true })).toBeVisible();
});

test('the snow’s arrows stand over the top chord’s nodes inside the eaves — fifteen, one on the ridge — each straight down onto the roof', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const { stage, layers } = await open(page);
  await layers.getByRole('button', { name: 'Сніг' }).click();
  // Owner, 05.10: «навантаження до кожного вузла, одне в коник» — the load reaches the frame at its nodes, through the
  // purlins
  const inner = homeProofFrame.nodes.slice(1, -1);
  const arrows = stage.locator('.hv2-proof-snow path:not(.hv2-proof-comb)');
  await expect(arrows).toHaveCount(15);
  expect(inner).toHaveLength(15);
  const drawn = await arrows.evaluateAll((paths) => paths.map((path) => [...(path.getAttribute('d') ?? '').matchAll(/[ML]([\d.]+) ([\d.]+)/g)].map(([, x, y]) => [Number(x), Number(y)])));
  expect(drawn.map(([[x]]) => x)).toEqual(inner.map(([x]) => x));
  // one of them on the ridge — the top chord's highest node, x 1005
  const ridge = homeProofFrame.nodes.reduce((top, node) => (node[1] < top[1] ? node : top));
  expect(ridge[0]).toBe(1005);
  expect(drawn.filter(([[x]]) => x === ridge[0])).toHaveLength(1);
  // each straight down, its head over its node
  for (const [index, [[x0, y0], [x1, y1]]] of drawn.entries()) {
    expect(x1, `${x0}`).toBe(x0);
    expect(y1, `${x0}`).toBeGreaterThan(y0);
    expect(y1, `${x0}`).toBeLessThan(inner[index][1]);
  }
  // …and on the screen too: each head over its node's column, through the drawing's own transform
  const off = await stage.evaluate((element, nodes) => {
    const svg = element.querySelector<SVGSVGElement>('svg.hv2-proof-frame')!;
    const ctm = svg.getScreenCTM()!;
    return [...svg.querySelectorAll<SVGPathElement>('.hv2-proof-snow path:not(.hv2-proof-comb)')].map((path, index) => {
      const end = path.getPointAtLength(path.getTotalLength());
      return Math.abs(ctm.a * end.x + ctm.e - (ctm.a * nodes[index][0] + ctm.e));
    });
  }, inner.map(([x, y]) => [x, y]));
  expect(Math.max(...off)).toBeLessThan(0.5);
});

test('the wind is its own layer in turquoise: gusts on the wall, lift off every other node of the roof, its way lit in turquoise on a casing, light drops to the footings and the ground’s answer — never the snow’s blue or the measured copper', async ({ page }) => {
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

  // Its tint: the legend's (its words' — the tint is the key), turquoise (owner, 05.10), cool, far from the measured
  // copper and the scheme's paper, and never the snow's blue — the two loads never read as one (owner, 04.10: «розумно
  // кольорів»): their hues well apart
  await expect(sheet.locator('.hv2-contour-legend-set[data-on] > .hv2-contour-legend-chain[data-load="wind"]')).toBeVisible();
  const [tint, snow] = [await tintOf(sheet, 'wind'), await tintOf(sheet, 'load')];
  expect([tint, snow]).toEqual([WIND, SNOW]);
  for (const other of [COPPER, PAPER]) expect(apart(tint, other), `${tint} / ${other}`).toBeGreaterThan(60);
  expect(rgb(tint)[2]).toBeGreaterThan(rgb(tint)[0]);
  expect(Math.abs(hueOf(tint) - hueOf(snow)), `${tint} / ${snow}`).toBeGreaterThan(30);

  // Every part of it: the gusts and the lift headed with the wind's own arrowhead, in its tint; the drops in its light
  // tone headed with their own foot; the ground's answer at each footing
  const parts = async (selector: string) => stage.locator(selector).evaluateAll((paths) => paths.map((path) => ({
    stroke: getComputedStyle(path).stroke, head: path.getAttribute('marker-end'),
  })));
  // The gusts in two sizes, one shown at a time: the long ones where the frame has room, the short ones in a phone's
  // close-up, whose right edge is the photo's column 1504 (review, 04.10: they ran off it) — each on its data's points
  const gusts = stage.locator('.hv2-proof-wind > .hv2-proof-gusts');
  expect(await gusts.evaluateAll((groups) => groups.map((each) => ({
    size: each.getAttribute('data-size'), n: (each as SVGElement).style.getPropertyValue('--n'), shown: getComputedStyle(each).display !== 'none',
    paths: [...each.querySelectorAll('path')].map((path) => path.getAttribute('d')),
  })))).toEqual([
    { size: 'wide', n: '0', shown: desktop, paths: wind.gustsWide.map(([[x0, y0], [x1, y1]]) => `M${x0} ${y0}L${x1} ${y1}`) },
    { size: 'narrow', n: '0', shown: !desktop, paths: wind.gusts.map(([[x0, y0], [x1, y1]]) => `M${x0} ${y0}L${x1} ${y1}`) },
  ]);
  for (const [selector, count, stroke, head] of [
    ['.hv2-proof-gusts[data-size="wide"] path', wind.gustsWide.length, tint, 'url(#hv2-proof-head-wind)'],
    ['.hv2-proof-gusts[data-size="narrow"] path', wind.gusts.length, tint, 'url(#hv2-proof-head-wind)'],
    ['.hv2-proof-lift path', wind.lift.length, tint, 'url(#hv2-proof-head-wind)'],
    ['.hv2-proof-wind > .hv2-proof-flow', wind.legs.length, WIND_LIGHT, 'url(#hv2-proof-foot-wind)'],
    ['.hv2-proof-reactions path', wind.reactions.length, tint, 'url(#hv2-proof-head-wind)'],
  ] as const) {
    const found = await parts(selector);
    expect(found, selector).toHaveLength(count);
    for (const part of found) expect(part, selector).toEqual({ stroke, head });
  }
  // The lift rises off every other node inside the eaves (owner, 05.10), straight up
  const inner = homeProofFrame.nodes.slice(1, -1);
  const lift = await stage.locator('.hv2-proof-lift path').evaluateAll((paths) => paths.map((path) => [...(path.getAttribute('d') ?? '').matchAll(/[ML]([\d.]+) ([\d.]+)/g)].map(([, x, y]) => [Number(x), Number(y)])));
  expect(lift.map(([[x]]) => x)).toEqual(inner.filter((_, index) => index % 2 === 0).map(([x]) => x));
  for (const [[x0, y0], [x1, y1]] of lift) expect([x1, y1 < y0], `${x0}`).toEqual([x0, true]);
  // the drops round dots, as the snow's
  for (const drop of await stage.locator('.hv2-proof-wind > .hv2-proof-flow').evaluateAll((paths) => paths.map((path) => {
    const style = getComputedStyle(path);
    const [dash, gap] = style.strokeDasharray.split(/,?\s+/).map(parseFloat);
    return { cap: style.strokeLinecap, dot: dash < parseFloat(style.strokeWidth) / 4 && gap > 10 * dash };
  }))) expect(drop).toEqual({ cap: 'round', dot: true });
  for (const [id, fill] of [['hv2-proof-head-wind', tint], ['hv2-proof-foot-wind', WIND_LIGHT]] as const) {
    expect(await page.locator(`#real-object marker#${id} path`).evaluate((path) => getComputedStyle(path).fill), id).toBe(fill);
  }
  // Nothing of it in the snow's blue or its light tone, or a solid line or a fill in the measured copper
  const all = await stage.locator('.hv2-proof-wind :is(path, rect, circle)').evaluateAll((elements) => elements.map((element) => {
    const style = getComputedStyle(element);
    return { kind: element.getAttribute('class') ?? element.parentElement?.getAttribute('class') ?? '', stroke: style.stroke, fill: style.fill, dash: style.strokeDasharray };
  }));
  for (const part of all) {
    expect(part.stroke === COPPER && part.dash === 'none', `${part.kind}: ${part.stroke}`).toBe(false);
    for (const blue of [snow, SNOW_LIGHT]) expect([part.stroke, part.fill], part.kind).not.toContain(blue);
    expect(part.fill, part.kind).not.toBe(COPPER);
  }

  // Its links — the wall, the truss, the other wall and the column, the footings — lit as the snow's are: a line in its
  // tint over a dark, wider casing, no filter
  const links = stage.locator('.hv2-proof-wind .hv2-proof-link');
  await expect(links).toHaveCount(wind.links.length);
  expect(await links.evaluateAll((groups) => groups.map((each) => Number(each.getAttribute('data-link'))))).toEqual(wind.links.map((link) => link.link));
  for (const link of await links.all()) {
    const look = await link.evaluate((each) => {
      const casing = each.querySelector('.hv2-proof-link-casing')!;
      const light = each.querySelector('path:not(.hv2-proof-link-casing)')!;
      const [casingStyle, lightStyle] = [getComputedStyle(casing), getComputedStyle(light)];
      return {
        paths: each.querySelectorAll('path').length, casingFirst: each.firstElementChild === casing, light: lightStyle.stroke,
        casingDark: Math.max(...(casingStyle.stroke.match(/\d+/g) ?? ['255']).slice(0, 3).map(Number)) < 60,
        wider: parseFloat(casingStyle.strokeWidth) > parseFloat(lightStyle.strokeWidth),
        filters: [each, casing, light].map((element) => getComputedStyle(element).filter),
      };
    });
    expect(look).toEqual({ paths: 2, casingFirst: true, light: tint, casingDark: true, wider: true, filters: ['none', 'none', 'none'] });
  }

  // Its way in words, in its tint, in the legend under the layers — on a desktop and on a phone alike (the snow's set
  // hidden); a phone's facts stay the slope's chip
  await expectChain(sheet, 'wind', tint);
  if (desktop) {
    // the seam's names give way to the frame's top, as for the snow
    await expect(stage.locator('.hv2-contour-seamtags')).toBeHidden();
  } else {
    // (no figure left for a phone's facts: the slope went, 09.10)
    await expect(sheet.locator('.hv2-contour-chips')).toHaveCount(0);
  }
  // With reduced motion it stands whole, nothing running
  expect(await group.evaluate((element) => element.getAnimations({ subtree: true }).length)).toBe(0);
  // The gusts switch where the phone's close-up begins: the long ones above 760 px, the short ones at 760 and below
  for (const [width, size] of [[761, 'wide'], [760, 'narrow']] as const) {
    await page.setViewportSize({ width, height: 900 });
    await expect.poll(() => gusts.evaluateAll((groups) => groups.filter((each) => getComputedStyle(each).display !== 'none').map((each) => each.getAttribute('data-size'))), `${width}`).toEqual([size]);
  }
});

test('each load replays its way on every press of its button, link by link, and while it is on its drops and its arrows never stop', async ({ page }) => {
  test.setTimeout(45_000);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  const { stage, layers } = await open(page);
  // When each of a part's animations started, on the page's clock (one not yet started: now)
  const started = (part: Locator) => part.evaluate((element) => element.getAnimations({ subtree: true }).map((animation) => (animation.startTime === null ? Number(document.timeline.currentTime) : Number(animation.startTime))));
  /** A part's own animation of the given name: its delay, in ms to a thousandth (the calc's sum carries float noise) —
   *  of the first of the parts drawn at this width (the wind's gusts come in two sizes, one shown) */
  const delayOf = (parts: Locator, name: string) => parts.evaluateAll((elements, animationName) => elements
    .filter((element) => getComputedStyle(element).display !== 'none')
    .slice(0, 1)
    .flatMap((element) => {
      // read off the computed style: a finished animation leaves getAnimations() (on a loaded machine before this asks)
      const style = getComputedStyle(element);
      const delays = style.animationDelay.split(',').map((delay) => delay.trim());
      return style.animationName.split(',').flatMap((each, index) => (each.trim() === animationName
        ? [Math.round((delays[index].endsWith('ms') ? parseFloat(delays[index]) : parseFloat(delays[index]) * 1000) * 1000) / 1000]
        : []));
    }), name);
  /** The named animation of every part drawn at this width: how often it repeats and whether it runs */
  const loops = (selector: string, name: string) => stage.locator(selector).evaluateAll((elements, animationName) => elements
    .filter((element) => element.closest('[data-size]') === null || getComputedStyle(element.closest('[data-size]')!).display !== 'none')
    .map((element) => element.getAnimations().filter((animation) => (animation as CSSAnimation).animationName === animationName)
      .map((animation) => `${animation.effect!.getComputedTiming().iterations} ${animation.playState}`).join()), name);
  const arrowsOf = { load: ['.hv2-proof-snow path:not(.hv2-proof-comb)', 15], wind: ['.hv2-proof-gusts path, .hv2-proof-lift path', 5 + homeProofFrame.wind.lift.length] } as const;
  for (const load of ['load', 'wind'] as const) {
    const { button, group: selector, words } = CHAINS[load];
    const group = stage.locator(selector);
    await layers.getByRole('button', { name: button }).click();
    await expect.poll(async () => (await started(group)).length, button).toBeGreaterThan(0);
    // Each link comes in as its word in the legend names it: 450 ms apart, in the way's order (the gusts lead)
    for (const [word, n, part] of words) {
      expect(await delayOf(group.locator(`:scope > ${part}`), 'hv2-contour-fade'), `${button} ${word}`).toEqual([200 + n * 450]);
    }
    // The drops run down the legs for as long as the layer is on, and the arrows' shafts stream (owner, 05.10: «динаміку
    // навантаження більш видною» — always moving)
    expect(await loops(`${selector} > .hv2-proof-flow`, 'hv2-proof-drops'), button).toEqual(CHAINS[load] === CHAINS.load
      ? homeProofFrame.load.legs.map(() => 'Infinity running') : homeProofFrame.wind.legs.map(() => 'Infinity running'));
    const [arrows, count] = arrowsOf[load];
    expect(await loops(arrows, 'hv2-proof-stream'), button).toEqual(Array.from({ length: count }, () => 'Infinity running'));
    // …well under way (900 ms on the page's own clock from its last start), then pressed again: its way drawn anew, from
    // the start
    await timelinePast(page, Math.max(...await started(group)) + 900);
    await group.evaluate((element) => { (element as HTMLElement).dataset.played = ''; });
    const pressed = await page.evaluate(() => Number(document.timeline.currentTime));
    expect(Math.max(...await started(group)), button).toBeLessThan(pressed - 800);
    await layers.getByRole('button', { name: button }).click();
    await expect(stage.locator(`${selector}[data-played]`), button).toHaveCount(0);
    const again = await started(group);
    expect(again.length, button).toBeGreaterThan(0);
    expect(Math.min(...again), button).toBeGreaterThanOrEqual(pressed);
  }
  // Another layer: the drops stop with it — nothing runs down a way that is not shown
  await layers.getByRole('button', { name: 'Каркас' }).click();
  await expect.poll(() => stage.locator('.hv2-proof-flow').evaluateAll((flows) => flows.reduce((count, flow) => count + flow.getAnimations().length, 0))).toBe(0);
});

// Each word of a load's way in the legend lights as its part of the drawing comes in (the words are buttons since
// 42d21fe — pointed at or pressed, each lights its link alone — and light step by step all the same)
test('each word of a load’s way in the legend lights as its part of the drawing comes in, again on every press', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  const { sheet, stage, layers } = await open(page);
  const started = (part: Locator) => part.evaluate((element) => element.getAnimations({ subtree: true }).map((animation) => (animation.startTime === null ? Number(document.timeline.currentTime) : Number(animation.startTime))));
  const delayOf = (parts: Locator, name: string) => parts.evaluateAll((elements, animationName) => elements
    .filter((element) => getComputedStyle(element).display !== 'none')
    .slice(0, 1)
    .flatMap((element) => {
      // read off the computed style: a finished animation leaves getAnimations() (on a loaded machine before this asks)
      const style = getComputedStyle(element);
      const delays = style.animationDelay.split(',').map((delay) => delay.trim());
      return style.animationName.split(',').flatMap((each, index) => (each.trim() === animationName
        ? [Math.round((delays[index].endsWith('ms') ? parseFloat(delays[index]) : parseFloat(delays[index]) * 1000) * 1000) / 1000]
        : []));
    }), name);
  for (const load of ['load', 'wind'] as const) {
    const { button, group: selector, words } = CHAINS[load];
    const chain = sheet.locator(`.hv2-contour-legend-chain[data-load="${load}"]`);
    await layers.getByRole('button', { name: button }).click();
    const steps = chain.locator(':scope > .hv2-chain-step');
    await expect(steps).toHaveText(words.map(([word]) => word));
    for (const [index, [word, n, part]] of words.entries()) {
      const delay = await delayOf(steps.nth(index), 'hv2-contour-link');
      expect(delay, `${button} ${word}`).toEqual([200 + n * 450]);
      expect(await delayOf(stage.locator(`${selector} > ${part}`), 'hv2-contour-fade'), `${button} ${word}: its part`).toEqual(delay);
    }
    await timelinePast(page, Math.max(...await started(chain)) + 900);
    await chain.evaluate((element) => { (element as HTMLElement).dataset.played = ''; });
    const pressed = await page.evaluate(() => Number(document.timeline.currentTime));
    await layers.getByRole('button', { name: button }).click();
    await expect(sheet.locator(`.hv2-contour-legend-chain[data-load="${load}"][data-played]`), button).toHaveCount(0);
    const again = await started(chain);
    expect(again.length, button).toBeGreaterThan(0);
    expect(Math.min(...again), button).toBeGreaterThanOrEqual(pressed);
  }
});

test('a word of a load’s way in the legend lights its link alone — pointed at, focused or pressed — the rest of the way stepping back, the drops dimmed', async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const { sheet, stage, layers } = await open(page);
  /** Each step of the way's drawing (ProofFrame's data-step) with its opacity */
  const steps = (load: Load) => stage.locator(`${CHAINS[load].group} [data-step]`).evaluateAll((elements) => elements.map((element) => [element.getAttribute('data-step')!, getComputedStyle(element).opacity]));
  /** What the steps look like with step `on` lit alone: its own whole, the drops at .3, every other at .14 */
  const litAlone = async (load: Load, on: number) => (await steps(load)).map(([step]) => {
    if (step === String(on)) return [step, '1'];
    return [step, step === 'flow' ? '0.3' : '0.14'];
  });
  const away = () => page.mouse.move(1, 1);
  for (const load of ['load', 'wind'] as const) {
    await layers.getByRole('button', { name: CHAINS[load].button }).click();
    const words = sheet.locator(`.hv2-contour-legend-set[data-layer="${load}"] .hv2-chain-step`);
    await expect(words).toHaveText(CHAINS[load].words.map(([word]) => word));
    // Nothing steps back while no word is chosen
    await expect(stage).not.toHaveAttribute('data-step-on', /.*/);
    expect(new Set((await steps(load)).map(([, opacity]) => opacity)), load).toEqual(new Set(['1']));
    // Pressed, each word lights its link alone and says so; the next word pressed takes over
    for (const [index, [word, n]] of CHAINS[load].words.entries()) {
      await words.nth(index).click();
      await away();
      await expect(words.nth(index), word).toHaveAttribute('aria-pressed', 'true');
      await expect(stage, word).toHaveAttribute('data-step-on', String(n));
      expect(await steps(load), word).toEqual(await litAlone(load, n));
      expect(await words.evaluateAll((buttons) => buttons.filter((button) => button.getAttribute('aria-pressed') === 'true').length), word).toBe(1);
    }
    // …and pressed again it lets go: the whole way back
    await words.last().click();
    await away();
    await words.last().blur();
    await expect(words.last()).toHaveAttribute('aria-pressed', 'false');
    await expect(stage).not.toHaveAttribute('data-step-on', /.*/);
    await expect.poll(async () => [...new Set((await steps(load)).map(([, opacity]) => opacity))], load).toEqual(['1']);
    // Focused from the keyboard it lights its link while it has the focus, Enter presses it
    const [, focusN] = CHAINS[load].words[2];
    await words.nth(2).focus();
    await expect(stage).toHaveAttribute('data-step-on', String(focusN));
    await expect(words.nth(2)).toHaveAttribute('aria-pressed', 'false');
    await page.keyboard.press('Enter');
    await expect(words.nth(2)).toHaveAttribute('aria-pressed', 'true');
    await page.keyboard.press('Enter');
    await expect(words.nth(2)).toHaveAttribute('aria-pressed', 'false');
    await words.nth(2).blur();
    await expect(stage).not.toHaveAttribute('data-step-on', /.*/);
    // Pointed at (a mouse), it lights its link while the pointer is on it, pressing nothing
    if (testInfo.project.name === 'desktop-chromium') {
      const [, hoverN] = CHAINS[load].words[1];
      await words.nth(1).hover();
      await expect(stage).toHaveAttribute('data-step-on', String(hoverN));
      await expect(words.nth(1)).toHaveAttribute('aria-pressed', 'false');
      await away();
      await expect(stage).not.toHaveAttribute('data-step-on', /.*/);
    }
    // A word pressed, then another layer: nothing of it carries over
    await words.nth(3).click();
    await away();
    await expect(stage).toHaveAttribute('data-step-on', String(CHAINS[load].words[3][1]));
  }
  await layers.getByRole('button', { name: 'Каркас' }).click();
  await expect(stage).not.toHaveAttribute('data-step-on', /.*/);
  expect(await sheet.locator('.hv2-chain-step[aria-pressed="true"]').count()).toBe(0);
});

test('the seam rests between the gates, and nothing of the right side lies over the photo', async ({ page }) => {
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

  // Every part of the right side — the tracing, the scheme, its copy of the outline, the figure's marks and words, the
  // stamp — lies in its window and nowhere else, and the window stands at the seam, cut there, the drawing in it on the
  // photo's own canvas (review, 05.10: a window moved by transforms, no clip-path). The outline has no copy over the
  // photo any more («Контур на фото» is gone, owner 05.10), and no node is open to ring its place on the photo
  for (const part of ['.hv2-contour-trace', 'svg.hv2-proof-frame', PANE_LINES, 'svg.hv2-proof-marks', '.hv2-proof-labels', '.hv2-contour-corner', '.hv2-proof-detail-pins']) {
    expect(await stage.locator(part).evaluateAll((elements) => elements.map((element) => element.closest('.hv2-contour-pane') !== null)), part).toEqual([true]);
  }
  await expect(stage.locator('svg.hv2-contour-lines')).toHaveCount(1);
  await expect(stage.locator('svg.hv2-detail-onphoto')).toHaveCount(0);
  await expectWindow(stage, DEFAULT_SPLIT);
  // …so pixels of the photo side (clear of the seam, its handle and the seam's names) are the same with and without
  // every layer of the right side: the scheme, the lines, the figure, the names and the letters
  const frame = (await stage.boundingBox())!;
  const photoSide = { x: frame.x + 1, y: frame.y + 40, width: frame.width * (DEFAULT_SPLIT / 100) - 30, height: frame.height - 41 };
  const layers = stage.locator('.hv2-contour-pane .hv2-contour-canvas > :is(svg, .hv2-proof-labels, .hv2-proof-detail-pins, .hv2-proof-keypins)');
  const hide = (hidden: boolean) => layers.evaluateAll((elements, value) => { for (const element of elements) (element as HTMLElement).style.visibility = value ? 'hidden' : ''; }, hidden);
  const withLayers = await steadyShot(page, photoSide);
  await hide(true);
  const withoutLayers = await steadyShot(page, photoSide);
  expect(await differing(page, withLayers, withoutLayers)).toBeLessThan(SPECKS);
  await hide(false);
  // …and a layer of the right side does show where the window uncovers it (so the comparison can see a line)
  const schemeSide = { x: frame.x + (frame.width * DEFAULT_SPLIT) / 100 + 30, y: frame.y + 80, width: frame.width * (1 - DEFAULT_SPLIT / 100) - 31, height: frame.height - 81 };
  const withScheme = await steadyShot(page, schemeSide);
  await hide(true);
  expect(await differing(page, withScheme, await steadyShot(page, schemeSide))).toBeGreaterThan(200);
  await hide(false);
  await expectWindow(stage, DEFAULT_SPLIT);
});

test('the title block switches the right side: the scheme with its names, each load link by link; its action cell holds the tour over the way on to a brief', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const { sheet, stage, slider, layers } = await open(page);
  const desktop = page.viewportSize()!.width > 760;
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

  // «Каркас»: the scheme, its names, the slope's title; the loads wait. «Контур» is gone
  await expect(layers.getByRole('button', { name: 'Контур' })).toHaveCount(0);
  await expect(stage.locator('.hv2-proof-scheme')).toBeVisible();
  for (const load of ['.hv2-proof-load', '.hv2-proof-wind']) await expect(stage.locator(load)).toBeHidden();
  if (desktop) {
    // At rest a quiet frame: two names, the truss and the central row of columns (audit 08.10); the others and the slope
    // under the cursor
    const quiet = (element: Locator) => element.evaluate((node) => getComputedStyle(node).opacity);
    await page.mouse.move(2, 2);
    await expect(stage.locator('.hv2-proof-tag')).toHaveCount(homeProofFrame.tags.length);
    for (const tag of homeProofFrame.tags) {
      await expect.poll(() => quiet(stage.locator(`.hv2-proof-tag[data-tag="${tag.id}"]`)), tag.id).toBe(['truss', 'column'].includes(tag.id) ? '1' : '0');
    }
    await stage.hover({ position: { x: 20, y: 20 } });
    for (const tag of await stage.locator('.hv2-proof-tag').all()) await expect.poll(() => quiet(tag)).toBe('1');
    // no figure on the scheme (owner, 09.10: the slope gone too)
    await expect(stage.locator('.hv2-proof-measure')).toHaveCount(0);
    await page.mouse.move(2, 2);
    await expect(stage.locator('.hv2-contour-seamtags > span').nth(1)).toHaveText('Схема ›');
    // the names in words: a phone's numbers and their key are not drawn
    await expect(stage.locator('.hv2-proof-keypins')).toBeHidden();
    await expect(sheet.locator('.hv2-contour-key')).toBeHidden();
  } else {
    // A phone: no words inside the frame and, at rest, only the nodes' letters on it (audit 08.10: two systems of marks on
    // a 123 px strip); «Детальніше» puts back the scheme's names as numbers on it, keyed under the frame (the slope's chip
    // went with the slope, 09.10)
    await expect(stage.locator('.hv2-proof-labels')).toBeHidden();
    await expect(stage.locator('.hv2-proof-keypins')).toBeHidden();
    await openMore(page);
    await expect(stage.locator('.hv2-proof-keypins > span')).toHaveText(['1', '2', '3', '4', '5']);
    for (const number of await stage.locator('.hv2-proof-keypins > span').all()) await expect(number).toBeVisible();
    await expect(sheet.locator('.hv2-contour-key > span')).toHaveText(PHONE_KEY.map((word, index) => `${index + 1}${word}`));
    await expect(sheet.locator('.hv2-contour-key')).toBeVisible();
  }
  await expect(stage.getByRole('img', { name: homeProofFrame.label, exact: true })).toBeVisible();

  // «Сніг» and «Вітер»: the scheme stepped back, the load's way lit — the other load's not — and written in the legend,
  // word by word in its tint (on the frame there was no free room for it on a laptop's crop: review, 04.10)
  const loads = [
    { load: 'load', shown: '.hv2-proof-load', hidden: '.hv2-proof-wind', legs: homeProofFrame.load.legs.length, name: homeProofFrame.label, light: SNOW_LIGHT },
    { load: 'wind', shown: '.hv2-proof-wind', hidden: '.hv2-proof-load', legs: homeProofFrame.wind.legs.length, name: `${homeProofFrame.label} ${homeProofFrame.windLabel}`, light: WIND_LIGHT },
  ] as const;
  for (const { load, shown, hidden, legs, name, light } of loads) {
    const { button } = CHAINS[load];
    await layers.getByRole('button', { name: button }).click();
    await pressed(button);
    await expect(stage.locator(shown)).toBeVisible();
    await expect(stage.locator(hidden)).toBeHidden();
    expect(Number(await stage.locator('.hv2-proof-scheme').evaluate((element) => getComputedStyle(element).opacity))).toBeLessThan(0.6);
    await expect(stage.locator(`${shown} .hv2-proof-flow`)).toHaveCount(legs);
    // the way's links in the tint the legend's words are written in, the drops in its light tone
    const tint = await tintOf(sheet, load);
    expect(await stage.locator(`${shown} .hv2-proof-link path:not(.hv2-proof-link-casing)`).first().evaluate((path) => getComputedStyle(path).stroke), button).toBe(tint);
    expect(await stage.locator(`${shown} .hv2-proof-flow`).first().evaluate((path) => getComputedStyle(path).stroke), button).toBe(light);
    await expectChain(sheet, load, tint);
    // the scheme's name for a screen reader: the wind's way said on «Вітер» only
    await expect(stage.getByRole('img', { name, exact: true })).toBeVisible();
    expect(await noteWidth(), button).toBe(note);
    if (!desktop) {
      // its way down the frame wants the wider right side
      await expectSplit(slider, stage, 40);
      // the scheme's numbers wait on «Каркас»
      await expect(stage.locator('.hv2-proof-keypins')).toBeHidden();
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

  // The action cell (owner, 05.10: in place of «Контур на фото»): «Тур за 20 секунд» over the way on to the visitor's own
  // hangar — «Такий ангар, але ваш · Сформувати бриф →», the configurator's brief; a phone puts «Фото» / «Схема» first
  const action = sheet.locator('figcaption .sheet-action');
  const tour = action.locator('.hv2-contour-tour-btn');
  const brief = action.locator('a.hv2-contour-brief');
  await expect(tour).toHaveText('Тур за 20 секунд');
  await expect(tour).toHaveAttribute('aria-pressed', 'false');
  await expect(brief).toHaveAttribute('href', BRIEF_HREF);
  await expect(brief).toHaveText(/^Такий ангар, але ваш\s*Сформувати бриф\s*→$/);
  const [tourBox, briefBox] = [(await tour.boundingBox())!, (await brief.boundingBox())!];
  expect(tourBox.y + tourBox.height).toBeLessThanOrEqual(briefBox.y + 0.5);
  const sides = action.locator('.hv2-contour-sides');
  if (desktop) {
    await expect(sides).toBeHidden();
  } else {
    await expect(sides.getByRole('button')).toHaveText(['Фото', 'Схема']);
    const sidesBox = (await sides.boundingBox())!;
    expect(sidesBox.y + sidesBox.height).toBeLessThanOrEqual(tourBox.y + 0.5);
  }
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

test('a mouse over the frame moves no seam — only a held button does, the light going with the press — and none of it shifts the layout; a phone never hovers', async ({ page }, testInfo) => {
  test.setTimeout(60_000);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  // Every layout shift from here on, by what shifted, and whether it came within half a second of a press or a key (the
  // visitor's own change, which CLS leaves out)
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
  const phone = phoneOf(page);
  // (from the sheet at rest on: what the page's load did is not the seam's)
  await nextFrames(page);
  await page.evaluate(() => { (window as unknown as { shifts: unknown[] }).shifts.length = 0; });
  const frame = (await stage.boundingBox())!;
  const y = Math.round(frame.y + frame.height * 0.3);
  const xAt = (value: number) => Math.round(frame.x + (frame.width * value) / 100);
  const atRest = { split: `${DEFAULT_SPLIT}%`, snapped: null, lines: [], held: 0 };
  // In from beside the frame and across it, over the jambs a drag would light (owner, 05.10: a mouse leading the seam on
  // its own is gone): the seam, the range and the lines stay as they are, a few frames after every move
  await page.mouse.move(Math.round(frame.x - 30), y);
  for (const value of [20, onStage(SNAPS[2].at, phone), 50, onStage(SNAPS[3].at, phone), 85, 35]) {
    await page.mouse.move(xAt(value), y, { steps: 4 });
    await nextFrames(page, 3);
    expect(await seamState(stage), `${value}`).toEqual(atRest);
    await expect(slider, `${value}`).toHaveValue(String(DEFAULT_SPLIT));
  }
  // A hover is no press: the range never took the focus, and no ring is drawn
  await expect(slider).not.toBeFocused();
  expect(await ringOf(stage)).toBe('none');
  // (a phone's seam is a finger's: the handle's own test)
  if (testInfo.project.name !== 'desktop-chromium') return;

  // Pressed, the seam goes to the pointer and follows it to the tenth, lighting the jamb it passes
  const model = litModel(false);
  const jamb = SNAPS[2];
  const from = xAt(40);
  await page.mouse.move(from, y);
  await page.mouse.down();
  model.move(await pointerAt(stage, from));
  await expect.poll(async () => seamState(stage)).toEqual(model.state(await pointerAt(stage, from)));
  const to = xAt(jamb.at + SNAP_GRAB * 0.5);
  await page.mouse.move(to, y, { steps: 6 });
  const held = await pointerAt(stage, to);
  model.move(held);
  expect(model.lit).toBe(jamb);
  await expect.poll(() => seamState(stage)).toEqual(model.state(held));
  await expect(stage.locator('.hv2-contour-snap')).toHaveCSS('opacity', '1');
  // Let go: the seam stays where it was let go, the light goes with the press, and the mouse moving on moves nothing
  await page.mouse.up();
  model.reset();
  await expect.poll(() => seamState(stage)).toEqual(model.state(held));
  await expect(stage.locator('.hv2-contour-snap')).toHaveCSS('opacity', '0');
  await page.mouse.move(xAt(75), y, { steps: 4 });
  await nextFrames(page, 3);
  expect(await seamState(stage)).toEqual(model.state(held));
  await expect(slider).toHaveValue(String(Math.round(Math.round(held * 10) / 10)));
  // The press put the focus on the range, but the keyboard's ring waits for a key
  await expect(slider).toBeFocused();
  expect(await ringOf(stage)).toBe('none');
  // Leaving the frame keeps it there
  await page.mouse.move(xAt(75), Math.round(frame.y - 40));
  await nextFrames(page, 3);
  expect(await seamState(stage)).toEqual(model.state(held));

  // All of it rode the rail's transform: no layout shifted (review, 04.10: CLS)
  expect((await page.evaluate(() => (window as unknown as { shifts: { input: boolean }[] }).shifts)).filter((shift) => !shift.input)).toEqual([]);
});

test('on «Каркас» the scheme is live: a mouse over it lights the member it is over and names it — a node near by its letter — nothing off the building or on the photo; a finger’s tap names it a moment', async ({ page }, testInfo) => {
  test.setTimeout(45_000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const { sheet, stage, slider, layers } = await open(page);
  const tip = stage.locator('.hv2-proof-hover-tip');
  const lit = stage.locator('svg.hv2-proof-hover');
  const inside = async (name: string) => {
    const [box, frame] = [(await tip.boundingBox())!, (await stage.boundingBox())!];
    expect.soft([box.x >= frame.x - 0.5, box.x + box.width <= frame.x + frame.width + 0.5, box.y >= frame.y - 0.5, box.y + box.height <= frame.y + frame.height + 0.5], `${name}: the name inside the frame`)
      .toEqual([true, true, true, true]);
  };
  await expect(tip).not.toHaveAttribute('data-on', /.*/);
  if (testInfo.project.name === 'desktop-chromium') {
    // Photo pixels right of the resting seam, clear of the letters' own buttons (memberAt's names, tests/unit)
    const points = [
      { at: [1006, 450], name: 'Колона центрального ряду', node: null },
      { at: [1180, 400], name: 'Ворота', node: null },
      { at: [1007, 590], name: 'Фундамент — умовно', node: NODES[2] },
      // (on the top chord inside Г's ring, left of its letter — over a letter the live scheme says nothing)
      { at: [1028, 158], name: 'Верхній пояс ферми', node: NODES[3] },
      { at: [1300, 450], name: 'Стіна з газобетонних блоків', node: null },
    ] as const;
    for (const { at, name, node } of points) {
      const { x, y } = await photoPoint(stage, at);
      await page.mouse.move(x, y, { steps: 2 });
      await expect(tip, name).toHaveAttribute('data-on', '');
      await expect(tip.locator('b'), name).toHaveText(name);
      // a node drawn as a detail near: said by its letter, and its letter on the scheme rings
      if (node) {
        await expect(tip.locator('small'), name).toHaveText(`Вузол ${node.letter} — натисніть літеру`);
        await expect(stage, name).toHaveAttribute('data-hit-node', node.id);
      } else {
        await expect(tip.locator('small'), name).toHaveCount(0);
        await expect(stage, name).not.toHaveAttribute('data-hit-node', /.*/);
      }
      // the member itself lit on the scheme — a line on its casing, a part tinted — and its name by the pointer, inside
      // the frame
      await expect(lit, name).toHaveAttribute('data-on', '');
      await expect(lit.locator('path'), name).toHaveCount(2);
      await inside(name);
      const box = (await tip.boundingBox())!;
      expect(Math.min(Math.abs(box.x - x), Math.abs(box.x + box.width - x)), `${name}: by the pointer`).toBeLessThan(40);
    }
    // Off the building, and on the photo's side of the seam (the photo is the photo): nothing named, nothing lit
    for (const at of [[1400, 100], [600, 400]] as const) {
      const { x, y } = await photoPoint(stage, at);
      await page.mouse.move(x, y, { steps: 2 });
      await expect(tip, `${at}`).not.toHaveAttribute('data-on', /.*/);
      await expect(lit, `${at}`).not.toHaveAttribute('data-on', /.*/);
    }
    // Leaving the frame clears it
    const gate = await photoPoint(stage, [1180, 400]);
    await page.mouse.move(gate.x, gate.y, { steps: 2 });
    await expect(tip).toHaveAttribute('data-on', '');
    await page.mouse.move(gate.x, (await stage.boundingBox())!.y - 30);
    await expect(tip).not.toHaveAttribute('data-on', /.*/);
    // On «Сніг» the scheme names nothing: over the roof the mouse puts a weight on it instead
    await layers.getByRole('button', { name: 'Сніг' }).click();
    const roof = await photoPoint(stage, [1200, 230]);
    await page.mouse.move(roof.x, roof.y, { steps: 3 });
    await expect(stage).toHaveAttribute('data-point', '');
    await expect(tip).not.toHaveAttribute('data-on', /.*/);
    // …and none of it moved the seam
    await expectSplit(slider, stage, DEFAULT_SPLIT);
    return;
  }
  // A phone: a finger's tap names what it touched for a moment, then the name goes by itself (ProofContour: 2.6 s).
  // Points far from the letters' own buttons — Chrome draws a finger's tap to a button near it
  for (const { at, name } of [
    { at: [1180, 400], name: 'Ворота' },
    { at: [1250, 520], name: 'Стіна з газобетонних блоків' },
    { at: [1465, 450], name: 'Стіна в розрізі — газобетон' },
  ] as const) {
    await centre(stage);
    const { x, y } = await photoPoint(stage, at);
    // when the tip comes and goes, on the page's own clock (read here, a loaded machine would eat the moment)
    await tip.evaluate((element) => {
      const times: [number, boolean][] = [];
      const observer = new MutationObserver(() => times.push([performance.now(), element.hasAttribute('data-on')]));
      observer.observe(element, { attributes: true, attributeFilter: ['data-on'] });
      Object.assign(window, { __tipTimes: times, __tipObserver: observer });
    });
    await page.touchscreen.tap(x, y);
    await expect(tip, name).toHaveAttribute('data-on', '');
    await expect(tip.locator('b'), name).toHaveText(name);
    await expect(lit, name).toHaveAttribute('data-on', '');
    await inside(name);
    await expect(tip, name).not.toHaveAttribute('data-on', /.*/, { timeout: 6_000 });
    const times = await page.evaluate(() => {
      const record = window as unknown as { __tipTimes: [number, boolean][]; __tipObserver: MutationObserver };
      record.__tipObserver.disconnect();
      return record.__tipTimes;
    });
    const shownAt = times.find(([, on]) => on)![0];
    const gone = times.findLast(([, on]) => !on)![0];
    expect(gone - shownAt, `${name}: shown a moment`).toBeGreaterThan(2_000);
    expect(gone - shownAt, `${name}: shown a moment`).toBeLessThan(3_400);
  }
  // A tap moved no seam, opened no node
  await expectSplit(slider, stage, DEFAULT_SPLIT);
  await expect(sheet.page().locator('.hv2-detail')).toHaveCount(0);
});

// The live scheme names the node near the pointer as it moves along one member: from Г's ring to Б's along the top
// chord the tip says «Вузол Б», and Б's letter rings, not Г's
test('the live scheme names the node near the pointer also when the pointer moves along one member from node to node', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'a mouse that hovers');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const { stage } = await open(page);
  const tip = stage.locator('.hv2-proof-hover-tip');
  const ridge = await photoPoint(stage, [1028, 158]);
  await page.mouse.move(ridge.x, ridge.y, { steps: 2 });
  await expect(tip.locator('small')).toHaveText('Вузол Г — натисніть літеру');
  const purlin = await photoPoint(stage, [1200, 216.3]);
  await page.mouse.move(purlin.x, purlin.y, { steps: 8 });
  await expect(tip.locator('b')).toHaveText('Верхній пояс ферми');
  await expect(tip.locator('small')).toHaveText('Вузол Б — натисніть літеру');
  await expect(stage).toHaveAttribute('data-hit-node', 'purlin');
});

test('passing a line of the outline the seam lights it over the photo and names it at its top — its name only — but never holds there: it stands exactly where the pointer puts it; past RELEASE the light goes; the keys never light one', async ({ page }, testInfo) => {
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
  // The left gate's right jamb, the line next to the resting seam — on a phone where the close-up puts it
  const jamb = SNAPS[2];
  const at = onStage(jamb.at, phone);
  expect(Math.abs(DEFAULT_SPLIT - at)).toBeGreaterThan(SNAP_RELEASE);
  const name = stage.locator('.hv2-contour-snap');
  const ink = stage.locator(`${PANE_LINES} .hv2-contour-ink path[data-line="${jamb.line}"]`);
  const look = () => ink.evaluate((path) => ({ stroke: getComputedStyle(path).stroke, width: parseFloat(getComputedStyle(path).strokeWidth) }));
  const plain = await look();
  expect(plain.stroke).toBe(COPPER);

  // The handle taken where it is drawn, in whole pixels: a mouse could take the frame anywhere, a finger takes only the
  // handle. Over the handle, before a press, the seam still rests (owner, 05.10: no mouse leads it on its own)
  const frame = (await stage.boundingBox())!;
  const handle = stage.locator('.hv2-contour-handle');
  const grip = (await handle.boundingBox())!;
  const y = Math.round(grip.y + grip.height / 2);
  let x = Math.round(grip.x + grip.width / 2);
  const cdp = touch ? await page.context().newCDPSession(page) : null;
  const finger = (type: 'touchStart' | 'touchMove' | 'touchEnd', to: number) => cdp!.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x: to, y }] });
  if (!touch) {
    await page.mouse.move(Math.round(frame.x - 30), y);
    await page.mouse.move(x, y);
    await nextFrames(page);
    expect(await seamState(stage)).toEqual(model.state(DEFAULT_SPLIT));
  }
  // Held off the seam by where the handle was taken (ProofContour's offset), read off the page as the press reads it
  const offset = await handle.evaluate((element, from) => { const box = element.getBoundingClientRect(); return from - (box.left + box.width / 2); }, x);
  if (touch) {
    // Under a finger nothing lights: the seam just follows it, past the jamb (owner, 06.10: on a phone the lit jamb, its
    // name and a buzz read as the seam sticking to the gates — it never moved off the finger)
    await finger('touchStart', x);
    const to = Math.round(frame.x + (frame.width * (at + SNAP_GRAB * 0.6)) / 100);
    for (let step = 1; step <= 6; step += 1) {
      const point = Math.round(x + ((to - x) * step) / 6);
      await finger('touchMove', point);
      await nextFrames(page, 1);
      expect(await splitOf(stage), `${point} at once`).toBe(tenths(await pointerAt(stage, point, offset)));
      await expect(stage, `${point}`).not.toHaveAttribute('data-snapped', /.*/);
      await expect(stage.locator('svg.hv2-contour-held'), `${point}`).toHaveCount(0);
    }
    await finger('touchEnd', to);
    expect(await ticks()).toEqual([]);
    return;
  }
  await page.mouse.down();
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
      await nextFrames(page, 1);
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
  // …the line heavier and out of the outline's copper, and drawn once more over both sides, where the lines' own copy is
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
  // …its name at the top of the seam in place of the seam's names — the name only (owner, 05.10: no «виміряно» /
  // «наближено») — beside it on the side with room, inside the frame, for the eye only; and a finger feels it once
  await expect(name).toHaveCSS('opacity', '1');
  // (its hidden one-line copy, which it is measured by, is not read)
  await expect(name).toHaveText(jamb.name, { useInnerText: true });
  await expect(name.locator('small')).toHaveCount(0);
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

test('the lit line’s name stays whole inside the frame and over no other word, at every line of the outline it can light', async ({ page }, testInfo) => {
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
    for (const layer of desktop ? LAYERS : ['Каркас']) {
      await layers.getByRole('button', { name: layer }).click();
      for (const snap of SNAPS) {
        await stage.evaluate((element) => element.scrollIntoView({ block: 'center' }));
        const frame = (await stage.boundingBox())!;
        // on the walls, under the roof: on «Сніг» the roof takes a weight, not the seam
        const y = Math.round(frame.y + frame.height * 0.62);
        // a mouse takes the frame anywhere, so each line is reached from the middle (no line within GRAB there), the
        // seam standing where the mouse is
        await page.mouse.move(Math.round(frame.x + frame.width / 2), y);
        await page.mouse.down();
        const to = Math.round(frame.x + (frame.width * (onStage(snap.at, phone) + SNAP_GRAB * 0.4)) / 100);
        await page.mouse.move(to, y, { steps: 5 });
        await expect.poll(() => splitOf(stage)).toBe(tenths(await pointerAt(stage, to)));
        await expect(stage).toHaveAttribute('data-snapped', '');
        await expect(name).toHaveCSS('opacity', '1');
        // its words are its name only (owner, 05.10)
        await expect(name).toHaveText(snap.name, { useInnerText: true });
        // …and the line, drawn once more over the photo, is solid as the whole outline is, its casing too
        const held = await stage.locator('svg.hv2-contour-held path').evaluateAll((paths) => paths.map((path) => ({
          casing: path.classList.contains('hv2-contour-held-casing'), dashed: getComputedStyle(path).strokeDasharray !== 'none',
        })));
        expect(held, snap.name).toEqual([{ casing: true, dashed: false }, { casing: false, dashed: false }]);
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

test('during the first view’s sweep a mouse over the frame leads nothing — the sweep runs its course — and at rest it still moves nothing: only a press does', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'a mouse that hovers');
  test.setTimeout(45_000);
  const { stage, range } = await arrive(page);
  await recordArrival(page);
  await centre(stage);
  const frame = (await stage.boundingBox())!;
  const y = Math.round(frame.y + frame.height * 0.3);
  const xAt = (value: number) => Math.round(frame.x + (frame.width * value) / 100);
  const recorded = () => page.evaluate(() => (window as unknown as { arrival: Arrival }).arrival.frames.length);
  // Over the frame while the seam waits at the edge, and again and again while it sweeps, a few of its frames each time
  await page.mouse.move(Math.round(frame.x - 30), y);
  await page.mouse.move(xAt(40), y, { steps: 3 });
  await page.waitForFunction(() => document.querySelector<HTMLElement>('#real-object .hv2-contour-stage')!.dataset.sweep === 'run');
  for (const value of [20, 45, 70, 30]) {
    await page.mouse.move(xAt(value), y, { steps: 3 });
    const seen = await recorded();
    await page.waitForFunction((count) => (window as unknown as { arrival: Arrival }).arrival.frames.length >= count + 6, seen);
  }
  const { frames, run, ended } = await arrivalOf(page);
  expect(run).not.toBeNull();
  expect(ended! - run!).toBeGreaterThanOrEqual(SWEEP_MS - 20);
  expect(new Set(frames.map((frame) => frame.range))).toEqual(new Set([String(DEFAULT_SPLIT)]));
  for (const frame of frames.filter((at) => at.t >= ended!)) expect(frame, `${frame.t}`).toMatchObject({ sweep: null, split: DEFAULT_SPLIT });
  await settleArrival(page);
  // At rest the same mouse moving over the frame still leaves the seam where it rests (owner, 05.10)…
  await page.mouse.move(xAt(25), y, { steps: 2 });
  await nextFrames(page, 3);
  expect((await seamState(stage)).split).toBe(`${DEFAULT_SPLIT}%`);
  await expect(range).toHaveValue(String(DEFAULT_SPLIT));
  // …and a press puts it there
  await page.mouse.down();
  await page.mouse.up();
  await expect.poll(async () => (await seamState(stage)).split).toBe(tenths(await pointerAt(stage, xAt(25))));
  await expect(range).toHaveValue('25');
});

test('grabbed at either end of the frame, the handle stays under the finger', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'desktop-chromium', '«Фото», «Схема» and the finger are the phone\'s');
  // Without the sweep, so the handle is measured where it rests
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const { sheet, stage, slider } = await open(page);
  // («Фото» and «Схема» are one press away: «Детальніше»)
  await openMore(page);
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
    const centreX = async () => { const box = (await handle.boundingBox())!; return box.x + box.width / 2; };
    await expect.poll(async () => Math.abs((await centreX()) - to.x), { message: side }).toBeLessThanOrEqual(2);
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

test('on a phone «Фото» and «Схема» show one side whole, and bring the seam back when pressed again; the title block’s controls are a finger’s 44 px', async ({ page }, testInfo) => {
  const { sheet, stage, slider } = await open(page);
  const photo = sheet.getByRole('button', { name: 'Фото', exact: true });
  const scheme = sheet.getByRole('button', { name: 'Схема', exact: true });
  if (testInfo.project.name === 'desktop-chromium') {
    // A mouse has the whole frame to drag; the two buttons are for fingers
    await expect(photo).toBeHidden();
    await expect(scheme).toBeHidden();
    return;
  }
  // one press away — «Детальніше» (audit 08.10: the default seam already shows both halves)
  await expect(photo).toBeHidden();
  await openMore(page);
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
  // «Фото», «Схема», the way on to a brief and the layers (the tour's button: the fixme below)
  for (const control of [photo, scheme, sheet.locator('figcaption a.hv2-contour-brief'), ...await sheet.getByRole('group', { name: 'Що показати праворуч' }).getByRole('button').all()]) {
    const box = (await control.boundingBox())!;
    expect(box.height, (await control.textContent()) ?? '').toBeGreaterThanOrEqual(44);
  }
});

// On a phone the tour's button is a finger's 44 px, as every other control of the action cell (the laptop's compact
// column keeps it 40 px under a mouse)
test('on a phone the tour’s button is a finger’s 44 px, as every other control of the action cell', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'desktop-chromium', 'a finger’s');
  const { sheet } = await open(page);
  const box = (await sheet.locator('figcaption .hv2-contour-tour-btn').boundingBox())!;
  expect(box.height).toBeGreaterThanOrEqual(44);
});

test('on a phone the title block keeps its height whichever layer is on, and below 390 px a load’s frame has no stamp', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'desktop-chromium', 'a phone\'s title block');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const width of [412, 390, 360, 320]) {
    await page.setViewportSize({ width, height: 800 });
    const { sheet, stage, layers } = await open(page);
    const heights = new Set<number>();
    for (const layer of ['Каркас', 'Сніг', 'Вітер', 'Каркас']) {
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
  // (the four carriers glide there once on hydration, unseen: the armed sheet's picture is under its cover)
  await expect.poll(() => splitOf(stage)).toBe('100%');
  await expect(range).toHaveValue(String(DEFAULT_SPLIT));
  await expectWindow(stage, 100);
  await recordArrival(page);
  await page.evaluate(() => Promise.all([...document.querySelectorAll<HTMLImageElement>('.hv2-contour img')].map((image) => { image.loading = 'eager'; return image.decode().catch(() => undefined); })));
  // The stage itself into view (a phone's sheet is taller than the window): the sheet arrives, and the sweep sees it
  await centre(stage);
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

  // From the edge across the gable to the turn — 38 %: the ridge and both gates in view, the photo never gone (audit 08.10;
  // it used to turn past the gable's left corner, the photo a strip) — and back to rest: one way out, one way back
  const splits = sweep.map((frame) => frame.split);
  const turn = splits.indexOf(Math.min(...splits));
  expect(splits[0]).toBeGreaterThan(99);
  expect(splits[turn]).toBeCloseTo(phone ? SWEEP_TURN_PHONE : SWEEP_TURN, 0);
  expect(splits.slice(0, turn + 1)).toEqual(splits.slice(0, turn + 1).toSorted((a, b) => b - a));
  expect(splits.slice(turn)).toEqual(splits.slice(turn).toSorted((a, b) => a - b));
  // The seam is drawn where --split is, and the right side's window has its edge exactly there, its drawing standing on
  // the photo's canvas: what it has passed is the drawing, whole — no line draws in, nothing slides, nothing else moves on
  // the stage
  for (const frame of sweep) {
    expect(frame.seam, `${frame.t}`).toBeCloseTo(frame.split, 1);
    expect(frame.window, `${frame.t}`).toBeCloseTo(frame.split, 2);
    expect(frame.drift, `${frame.t}`).toBeLessThan(0.05);
    expect(frame.others, `${frame.t}`).toEqual([]);
  }
  // The range and what it says never move; the figure and the names wait until the seam rests
  for (const frame of [...plotting, ...sweep]) expect([frame.range, ...frame.words], `${frame.t}`).toEqual([String(DEFAULT_SPLIT), 0, 0]);

  // At rest, in one frame: the sweep's marks gone, the seam at its split, and two rings from the handle — once
  // one ring from the handle, not two (audit 08.10: the arrival settles sooner)
  expect(after[0]).toMatchObject({ sweep: null, gliding: false, pulse: true, split: DEFAULT_SPLIT, range: String(DEFAULT_SPLIT), rings: 'hv2-contour-pulse 1' });
  for (const frame of after) expect(frame, `${frame.t}`).toMatchObject({ sweep: null, gliding: false, split: DEFAULT_SPLIT, range: String(DEFAULT_SPLIT) });
  expect(frames.filter((frame) => frame.t < ended!).some((frame) => frame.pulse)).toBe(false);
  const rung = after.findIndex((frame) => !frame.pulse);
  expect(rung).toBeGreaterThan(0);
  expect(after.slice(rung).some((frame) => frame.pulse)).toBe(false);
  // …and the figure and the names come in
  for (const part of ['.hv2-proof-labels', 'svg.hv2-proof-marks']) {
    await expect.poll(() => stage.locator(part).evaluate((element) => getComputedStyle(element).opacity), part).toBe('1');
  }
  await settleArrival(page);
  await expectSplit(range, stage, DEFAULT_SPLIT);
});

test('after the arrival a laptop opens node Г by itself, quietly — focus stays where it was — a phone only shows its letters; a visitor who acted first gets neither', async ({ page }) => {
  test.setTimeout(45_000);
  const { stage } = await arrive(page);
  await centre(stage);
  const panel = page.locator('.hv2-detail');
  if (phoneOf(page)) {
    // The phone's letters sit under «Детальніше»: they show for a moment, no panel comes up over the page
    await expect(stage).toHaveAttribute('data-nodes-tease', '', { timeout: 12_000 });
    await expect(panel).toHaveCount(0);
    await expect(stage).not.toHaveAttribute('data-nodes-tease', '', { timeout: 6_000 });
    await expect(panel).toHaveCount(0);
    return;
  }
  await expect(stage).toHaveAttribute('data-detail', 'ridge', { timeout: 12_000 });
  await expect(panel.locator('#hv2-detail-title')).toHaveText('Вузол Г · Коньковий вузол');
  expect(await panel.evaluate((element) => element.contains(document.activeElement))).toBe(false);
  await settleArrival(page);

  // Again, but the visitor presses a key on the sheet while the seam still sweeps: nothing opens by itself
  const second = await arrive(page);
  await centre(second.stage);
  await expect(second.stage).toHaveAttribute('data-sweep', 'run', { timeout: 12_000 });
  await second.sheet.dispatchEvent('keydown', { key: 'Shift' });
  await expect(second.stage).not.toHaveAttribute('data-sweep', /.*/);
  await page.waitForTimeout(3_500);
  await expect(panel).toHaveCount(0);
  expect(await second.stage.getAttribute('data-detail')).toBeNull();
});

test('arriving the usual way — the wheel, or a finger swiping over the sheet — the seam still sweeps once, when the page is quiet', async ({ page }, testInfo) => {
  test.setTimeout(45_000);
  const { sheet, stage, range } = await arrive(page);
  await recordArrival(page);
  const viewport = page.viewportSize()!;
  const top = () => sheet.evaluate((element) => element.getBoundingClientRect().top);
  if (testInfo.project.name === 'desktop-chromium') {
    // The pointer rests mid-window, so the wheel turns over the sheet once it scrolls under it; each turn waits for the
    // page to have moved
    await page.mouse.move(viewport.width / 2, viewport.height / 2);
    await sheet.evaluate((element) => window.scrollTo({ top: element.getBoundingClientRect().top + window.scrollY - window.innerHeight, behavior: 'instant' }));
    while ((await top()) > 130) {
      const before = await top();
      await page.mouse.wheel(0, 100);
      await expect.poll(top).toBeLessThan(before);
    }
  } else {
    // The sheet enters from below; the finger starts on it and swipes it up, and rests before it lifts: the flick's fling
    // carried the 178 px stage clean out of view now and then, and out of view the seam rightly never sweeps
    await sheet.evaluate((element) => window.scrollTo({ top: element.getBoundingClientRect().top + window.scrollY - window.innerHeight + 200, behavior: 'instant' }));
    for (let swipe = 0; swipe < 6 && (await top()) > 90; swipe += 1) {
      const before = await top();
      const from = { x: viewport.width / 2, y: Math.min(viewport.height - 20, before + 120) };
      await touchDrag(page, from, { x: from.x, y: from.y - 160 }, 10, 150);
      await expect.poll(top).toBeLessThan(before);
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
  await settleArrival(page);
  await expectSplit(range, stage, DEFAULT_SPLIT);
});

test('a key in the sheet before the sweep stops it: the seam goes from the edge to the visitor’s split, no sweep, no rings', async ({ page }) => {
  test.setTimeout(45_000);
  const { sheet, stage, range } = await arrive(page);
  await recordArrival(page);
  await centre(stage);
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
  await centre(stage);
  await page.waitForFunction(() => document.querySelector<HTMLElement>('#real-object .hv2-contour-stage')!.dataset.sweep === 'run');
  if (phone) {
    // A finger on a button (here the layer already on: it changes nothing else)
    await sheet.getByRole('group', { name: 'Що показати праворуч' }).getByRole('button', { name: 'Каркас' }).tap();
  } else {
    // A mouse on the title block, clear of every control (its line): the press moves nothing itself
    const cell = (await sheet.locator('figcaption .hv2-contour-line').boundingBox())!;
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
  for (const part of ['.hv2-proof-cut', '.hv2-proof-nodes', '.hv2-proof-labels', '.hv2-proof-marks', '.hv2-proof-detail-rings', '.hv2-proof-detail-pins']) {
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
  // (the handle in its grip: the clamp off the frame's edges is the grip's transform)
  expect(rail.parts).toEqual(['hv2-contour-hint', 'hv2-contour-seamtags', 'hv2-contour-snap', 'hv2-contour-seam', 'hv2-contour-grip']);
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
  // No sweep — the seam never waits at the edge — and no rings, ever: every change of the stage's marks recorded from the
  // sheet at rest until well past when a first view's sweep would have rung (on the page's own clock)
  const since = await stage.evaluate((element) => {
    const marks: string[] = [];
    Object.assign(window, { marks });
    new MutationObserver((records) => {
      for (const record of records) marks.push(`${record.attributeName}=${element.getAttribute(record.attributeName!)}`);
    }).observe(element, { attributes: true, attributeFilter: ['data-sweep', 'data-gliding', 'data-pulse'] });
    return performance.now();
  });
  await pageClockPast(page, since, SWEEP_AT + SWEEP_QUIET + SWEEP_MS + 1_000);
  expect(await page.evaluate(() => (window as unknown as { marks: string[] }).marks)).toEqual([]);
  for (const mark of ['data-sweep', 'data-gliding', 'data-pulse']) await expect(stage).not.toHaveAttribute(mark, /.*/);
  expect(await splitOf(stage)).toBe(`${DEFAULT_SPLIT}%`);
  await expectWindow(stage, DEFAULT_SPLIT);
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('the sheet is complete at its resting split: photo, tracing, scheme, outline, figure, letters; every control says it cannot move it', async ({ page }) => {
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
    // No sweep waits on a script that never runs: the seam at rest, the figure and the names in
    await expect(stage).not.toHaveAttribute('data-sweep', /.*/);
    expect(await splitOf(stage)).toBe(`${DEFAULT_SPLIT}%`);
    for (const part of ['.hv2-proof-labels', 'svg.hv2-proof-marks']) expect(await stage.locator(part).evaluate((element) => getComputedStyle(element).opacity), part).toBe('1');
    // Nothing offers a move the static sheet cannot make: the slider and every button of the sheet — the layers, the
    // legend's words, the nodes' letters on the scheme and in «Вузли крупно», «Фото» / «Схема», the tour — are disabled,
    // out of the tab order; the way on to a brief is a link, and works
    await expect(stage.getByRole('slider', { name: SLIDER })).toBeDisabled();
    const buttons = page.locator('#real-object .hv2-contour button');
    expect(await buttons.count()).toBeGreaterThan(30);
    await expect(page.locator('#real-object .hv2-contour .hv2-chain-step')).toHaveCount(CHAINS.load.words.length + CHAINS.wind.words.length);
    await expect(page.locator('#real-object .hv2-contour .hv2-proof-detail-pin')).toHaveCount(NODES.length);
    await expect(page.locator('#real-object .hv2-contour .hv2-contour-nodes button')).toHaveCount(2 * NODES.length);
    for (const button of await buttons.all()) await expect(button).toBeDisabled();
    await expect(page.locator('#real-object a.hv2-contour-brief')).toHaveAttribute('href', BRIEF_HREF);
  });
});

test('«Вузли крупно»: five letters, each with its word, in the title block one press away — the nodes drawn in a colour of their own, quiet on the scheme at rest, on «Каркас» only', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const { sheet, stage, layers } = await open(page);
  const phone = phoneOf(page);
  expect(NODES.map((node) => node.id)).toEqual(homeProofDetailSpots.map((spot) => spot.id));
  // The nodes' own colour: none of the sheet's others — not the outline's copper, the scheme's paper or either load's
  // tint — and their dark letters legible on it (WCAG AA: 4.5:1)
  const [colour, ink] = [await tokenColour(page, '--hv2-node'), await tokenColour(page, '--hv2-node-ink')];
  for (const other of [COPPER, PAPER, SNOW, WIND]) expect(apart(colour, other), `${colour} / ${other}`).toBeGreaterThan(60);
  expect(contrast(colour, ink), `${ink} on ${colour}`).toBeGreaterThanOrEqual(4.5);
  // No bar over the picture any more (audit 08.10: a second way to the nodes, over the photo): the row is the title
  // block's, under «Детальніше»
  const overPicture = stage.locator('.hv2-contour-nodes[data-place="stage"]');
  const row = sheet.locator('figcaption .hv2-contour-nodes[data-place="block"]');
  await expect(overPicture).toBeHidden();
  await expect(row).toBeHidden();
  await openMore(page);
  await expect(row).toBeVisible();
  await expect(row).toHaveRole('group');
  await expect(row).toHaveAccessibleName('Вузли крупно');
  const letters = row.getByRole('button');
  // each letter with a word of its node (audit 08.10: bare letters were chosen blind) — for the eye; the name is the
  // button's whole title
  await expect(letters).toHaveText(NODES.map((node) => new RegExp(`^${node.letter}\\s*\\S`)));
  for (const [index, node] of NODES.entries()) {
    const letter = letters.nth(index);
    await expect(letter).toHaveAccessibleName(`Вузол ${node.letter}: ${node.title}`);
    await expect(letter).toHaveAttribute('aria-haspopup', 'dialog');
    await expect(letter).toHaveAttribute('aria-expanded', 'false');
    expect(await letter.evaluate((element) => [getComputedStyle(element).backgroundColor, getComputedStyle(element).color]), node.letter).toEqual([colour, ink]);
  }
  const [box, caption] = [(await row.boundingBox())!, (await sheet.locator('figcaption').boundingBox())!];
  expect(box.y).toBeGreaterThanOrEqual(caption.y);
  expect(box.y + box.height).toBeLessThanOrEqual(caption.y + caption.height);
  void phone;
  // On the scheme: a ring in the nodes' colour round each node and its letter beside it — a button naming its node too
  const rings = stage.locator('.hv2-proof-detail-rings circle');
  expect(await rings.evaluateAll((circles) => circles.map((circle) => [circle.getAttribute('data-detail'), getComputedStyle(circle).stroke]))).toEqual(NODES.map((node) => [node.id, colour]));
  const pins = stage.locator('.hv2-proof-detail-pin');
  await expect(pins).toHaveText(NODES.map((node) => node.letter));
  // at rest the letters are quiet — paper on graphite, so the eye goes to the truss first (audit 08.10) — and take the
  // nodes' colour under the cursor (a touch screen: in the tour, or open)
  await page.mouse.move(2, 2);
  for (const [index, node] of NODES.entries()) {
    await expect(pins.nth(index)).toHaveAccessibleName(`Вузол ${node.letter}: ${node.title}`);
    await expect(pins.nth(index)).toHaveAttribute('data-detail', node.id);
    await expect.poll(() => pins.nth(index).evaluate((element) => getComputedStyle(element).backgroundColor), node.letter).not.toBe(colour);
  }
  if (!phone) {
    await stage.hover({ position: { x: 20, y: 20 } });
    for (const [index, node] of NODES.entries()) {
      await expect.poll(() => pins.nth(index).evaluate((element) => [getComputedStyle(element).backgroundColor, getComputedStyle(element).color]), node.letter).toEqual([colour, ink]);
    }
    await page.mouse.move(2, 2);
  }
  await expect(stage.locator('.hv2-proof-detail-rings')).toBeVisible();
  // …on «Каркас» only: a load's layer has neither letters nor rings
  for (const load of ['Сніг', 'Вітер']) {
    await layers.getByRole('button', { name: load }).click();
    await expect(stage.locator('.hv2-proof-detail-rings'), load).toBeHidden();
    await expect(stage.locator('.hv2-proof-detail-pins'), load).toBeHidden();
  }
});

test('a node’s ring on the scheme, clicked or tapped, opens its node — the seam does not jump to the press — and the mouse over it is a hand', async ({ page }) => {
  test.setTimeout(45_000);
  for (const motion of ['reduce', 'no-preference'] as const) {
    await page.emulateMedia({ reducedMotion: motion });
    const { stage, slider } = await open(page);
    // (audit 08.10, F06: the ring — the largest thing that rings after the sweep — moved the seam and hid the node)
    for (const node of [NODES[0], NODES[4]]) {
      const ring = (await stage.locator(`.hv2-proof-detail-rings [data-detail="${node.id}"]`).boundingBox())!;
      // its centre, clear of its letter
      const [x, y] = [ring.x + ring.width / 2, ring.y + ring.height / 2];
      if (!phoneOf(page)) {
        await page.mouse.move(x, y);
        await expect(stage).toHaveAttribute('data-over-ring', '');
        expect(await stage.evaluate((element) => getComputedStyle(element).cursor)).toBe('pointer');
      }
      const clickedAt = await pointerAt(stage, x);
      if (phoneOf(page)) await page.touchscreen.tap(x, y);
      else await page.mouse.click(x, y);
      const panel = page.locator('.hv2-detail');
      await expect(panel, `${motion} ${node.letter}`).toBeVisible();
      await expect(panel).toHaveAccessibleName(`Вузол ${node.letter} · ${node.title}`);
      await expect(stage).toHaveAttribute('data-detail', node.id);
      // the seam where the node puts it — clear of its ring — never at the press (the bug: it went right there)
      expect(Math.abs(Number(await slider.inputValue()) - clickedAt), `${motion} ${node.letter}: the seam at the press`).toBeGreaterThan(2);
      await page.keyboard.press('Escape');
      await expect(panel).toHaveCount(0);
      await expectSplit(slider, stage, DEFAULT_SPLIT);
    }
  }
});

test('a node opened puts the seam clear of its ring — before it, or past it with «На фото» — its handle off the ring, and the seam back on closing', async ({ page }) => {
  test.setTimeout(90_000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const { stage, slider } = await open(page);
  const misses: string[] = [];
  const edges: string[] = [];
  for (const node of NODES) {
    for (const onPhoto of [false, true]) {
      const at = `${node.letter}${onPhoto ? ' «На фото»' : ''}`;
      await expectSplit(slider, stage, DEFAULT_SPLIT);
      const panel = await openNode(page, node);
      // «На фото» is kept from node to node: set it as this case wants
      const toggle = panel.getByRole('button', { name: 'На фото' });
      if ((await toggle.getAttribute('aria-pressed')) !== String(onPhoto)) await toggle.click();
      await expect(toggle, at).toHaveAttribute('aria-pressed', String(onPhoto));
      await expect(stage, at).toHaveAttribute('data-detail', node.id);
      // the open node's ring on the photo too, where the seam has stepped past it
      await expect(stage.locator('svg.hv2-detail-onphoto'), at).toHaveCount(1);
      // (the seam there: the site's reduced motion still glides it for a hundredth of a millisecond, a frame on the page)
      await nextFrames(page, 2);
      const look = await stage.evaluate((element, id) => {
        const frame = element.getBoundingClientRect();
        const ring = element.querySelector(`.hv2-proof-detail-rings [data-detail="${id}"]`)!.getBoundingClientRect();
        const seam = element.querySelector('.hv2-contour-seam')!.getBoundingClientRect();
        const handle = element.querySelector('.hv2-contour-handle')!;
        const box = handle.getBoundingClientRect();
        const disc = getComputedStyle(handle, '::before');
        return {
          frame: { left: frame.left, right: frame.right },
          ring: { left: ring.left, right: ring.right, top: ring.top, bottom: ring.bottom },
          seam: seam.left + seam.width / 2,
          // the disc as drawn: the handle's box less the pseudo-element's insets
          disc: { left: box.left + parseFloat(disc.left), right: box.right - parseFloat(disc.right), top: box.top + parseFloat(disc.top), bottom: box.bottom - parseFloat(disc.bottom) },
          half: box.width / 2,
          split: parseFloat(getComputedStyle(element.querySelector('.hv2-contour-pane')!).getPropertyValue('--split')),
        };
      }, node.id);
      // The seam clear of the ring by the handle's half width at least (owner, 05.10: on «А» the seam stood across it, the
      // handle over it) — before it, the ring whole on the scheme; past it, the ring whole on the photo…
      const clear = onPhoto ? look.seam - look.ring.right : look.ring.left - look.seam;
      const atEdge = onPhoto ? look.split >= 99.95 : look.split <= 0.05;
      if (atEdge) {
        // …except where the frame's own edge stops it (a phone's close-up puts А's ring a few pixels from the frame's right
        // edge): there it stands at that edge, the ring whole on its side
        edges.push(`${at}: the seam at the frame's edge, ${clear.toFixed(1)} px past the ring`);
        if (clear < 0) misses.push(`${at}: the seam at the frame's edge across the ring`);
      } else if (clear < look.half) {
        misses.push(`${at}: the seam ${clear.toFixed(1)} px from the ring (the handle's half width ${look.half} px)`);
      }
      // …and the handle's disc on no part of the ring
      const [overX, overY] = [
        Math.min(look.disc.right, look.ring.right) - Math.max(look.disc.left, look.ring.left),
        Math.min(look.disc.bottom, look.ring.bottom) - Math.max(look.disc.top, look.ring.top),
      ];
      if (overX > 0 && overY > 0) misses.push(`${at}: the handle's disc over the ring by ${overX.toFixed(1)} × ${overY.toFixed(1)} px`);
      // Closed: the seam back where it was, and «На фото» off again for the next case
      if (onPhoto) await toggle.click();
      await page.keyboard.press('Escape');
      await expect(page.locator('.hv2-detail')).toHaveCount(0);
      await expectSplit(slider, stage, DEFAULT_SPLIT);
      await expect(stage.locator('svg.hv2-detail-onphoto')).toHaveCount(0);
    }
  }
  expect(misses).toEqual([]);
  // (where the frame's edge stopped the seam, said in the report)
  if (edges.length) test.info().annotations.push({ type: 'seam at the frame’s edge', description: edges.join('; ') });
});

test('«Розібрати» names every part of every node — its step and its word — no name over another, all inside the drawing; «Зібрати» puts the node back', async ({ page }) => {
  test.setTimeout(90_000);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await open(page);
  for (const node of NODES) {
    const panel = await openNode(page, node);
    await finishAnimations(panel);
    const apartButton = panel.getByRole('button', { name: 'Розібрати' });
    await expect(apartButton).toHaveAttribute('aria-pressed', 'false');
    await apartButton.click();
    await expect(panel).toHaveAttribute('data-exploded', '');
    const together = panel.getByRole('button', { name: 'Зібрати' });
    await expect(together).toHaveAttribute('aria-pressed', 'true');
    // every part drawn apart and named, its name in (the drawing stepping back to make room)
    await finishAnimations(panel);
    const names = await panel.evaluate((element) => {
      const drawing = element.querySelector('.hv2-detail-drawing')!.getBoundingClientRect();
      return {
        drawing: { left: drawing.left, right: drawing.right, top: drawing.top, bottom: drawing.bottom },
        parts: [...element.querySelectorAll('.hv2-detail-part-name')].map((group) => {
          const box = group.getBoundingClientRect();
          return { name: group.textContent ?? '', left: box.left, right: box.right, top: box.top, bottom: box.bottom, opacity: getComputedStyle(group).opacity };
        }),
        own: getComputedStyle(element.querySelector('.hv2-detail-names-wrap')!).opacity,
      };
    });
    expect(names.parts.length, node.letter).toBeGreaterThanOrEqual(5);
    expect(names.own, `${node.letter}: the drawing's own names give way`).toBe('0');
    const found: string[] = [];
    for (const [index, part] of names.parts.entries()) {
      if (part.opacity !== '1') found.push(`${part.name} not shown (${part.opacity})`);
      const off = Math.max(names.drawing.left - part.left, part.right - names.drawing.right, names.drawing.top - part.top, part.bottom - names.drawing.bottom);
      if (off > 0.5) found.push(`${part.name} off the drawing by ${off.toFixed(1)} px`);
      for (const other of names.parts.slice(index + 1)) {
        const [x, y] = [Math.min(part.right, other.right) - Math.max(part.left, other.left), Math.min(part.bottom, other.bottom) - Math.max(part.top, other.top)];
        if (x > 0.5 && y > 0.5) found.push(`${part.name} × ${other.name}`);
      }
    }
    expect(found, node.letter).toEqual([]);
    // «Зібрати»: back together, the parts' names gone, the drawing's own back
    await together.click();
    await expect(panel).not.toHaveAttribute('data-exploded', /.*/);
    await expect(panel.getByRole('button', { name: 'Розібрати' })).toHaveAttribute('aria-pressed', 'false');
    await finishAnimations(panel);
    expect(new Set(await panel.locator('.hv2-detail-part-name').evaluateAll((groups) => groups.map((group) => getComputedStyle(group).opacity))), node.letter).toEqual(new Set(['0']));
    expect(await panel.locator('.hv2-detail-names-wrap').evaluate((element) => getComputedStyle(element).opacity), node.letter).toBe('1');
    await page.keyboard.press('Escape');
    await expect(page.locator('.hv2-detail')).toHaveCount(0);
  }
});

test('«Навантаження»: a node’s load way waits for the node to be put together — on opening, on every ‹ ›, and after «Зібрати»', async ({ page }) => {
  test.setTimeout(60_000);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await open(page);
  const panel = await openNode(page, NODES[0]);
  // Every change of the panel's data-flow, when, on which node, and how far its names (the assembly's last beat) are
  await panel.evaluate((element) => {
    const record: { t: number; flow: boolean; title: string; names: string[] }[] = [];
    Object.assign(window, { flows: record });
    let last: boolean | null = null;
    new MutationObserver(() => {
      const flow = element.hasAttribute('data-flow');
      if (flow === last) return;
      last = flow;
      record.push({
        t: performance.now(), flow, title: element.querySelector('#hv2-detail-title')?.textContent ?? '',
        names: [...element.querySelectorAll('.hv2-detail-callouts')].flatMap((names) => names.getAnimations().map((animation) => animation.playState)),
      });
    }).observe(element, { attributes: true, attributeFilter: ['data-flow'] });
  });
  const flows = () => page.evaluate(() => (window as unknown as { flows: { t: number; flow: boolean; title: string; names: string[] }[] }).flows);
  const now = () => page.evaluate(() => performance.now());
  const way = panel.getByRole('button', { name: 'Навантаження' });
  const words = panel.locator('.hv2-detail-flow-words');

  // Asked for at once, while the node is still coming together: pressed, but the way waits for the names to be in
  await way.click();
  await expect(way).toHaveAttribute('aria-pressed', 'true');
  expect(await panel.evaluate((element) => element.hasAttribute('data-flow'))).toBe(false);
  await expect(panel).toHaveAttribute('data-flow', '', { timeout: 6_000 });
  const first = (await flows()).find((entry) => entry.flow)!;
  expect(first.title).toBe(`Вузол А · ${NODES[0].title}`);
  expect(first.names.length).toBeGreaterThan(0);
  expect(new Set(first.names)).toEqual(new Set(['finished']));
  await expect(words).toHaveText('Пояси → стійка → опорна пластина й анкери → армопояс → стіна');
  await expect(words).toHaveCSS('opacity', '1');

  // ‹ ›: the next node comes together first, its way after — «Навантаження» stays pressed from node to node
  for (const [step, node] of [['Наступний вузол', NODES[1]], ['Попередній вузол', NODES[0]]] as const) {
    const pressedAt = await now();
    await panel.getByRole('button', { name: step }).click();
    await expect(panel.locator('#hv2-detail-title')).toHaveText(`Вузол ${node.letter} · ${node.title}`);
    await expect(way).toHaveAttribute('aria-pressed', 'true');
    await expect(panel).toHaveAttribute('data-flow', '', { timeout: 6_000 });
    const back = (await flows()).filter((entry) => entry.t > pressedAt);
    const off = back.find((entry) => !entry.flow);
    const on = back.find((entry) => entry.flow)!;
    expect(off, `${node.letter}: the way gone while the node comes together`).toBeDefined();
    expect(off!.t, node.letter).toBeLessThan(on.t);
    expect(on.title, node.letter).toBe(`Вузол ${node.letter} · ${node.title}`);
    expect(new Set(on.names), node.letter).toEqual(new Set(['finished']));
    expect(on.t - pressedAt, `${node.letter}: the way after the assembly`).toBeGreaterThan(1_500);
  }

  // «Розібрати» takes the way away with the parts; «Зібрати» brings it back once they are in place
  await panel.getByRole('button', { name: 'Розібрати' }).click();
  await expect(panel).not.toHaveAttribute('data-flow', /.*/);
  const together = await now();
  await panel.getByRole('button', { name: 'Зібрати' }).click();
  await expect(panel).toHaveAttribute('data-flow', '', { timeout: 6_000 });
  const reassembled = (await flows()).filter((entry) => entry.t > together && entry.flow)[0];
  expect(reassembled.t - together, 'the way after the parts are back').toBeGreaterThan(1_000);

  // With reduced motion nothing is put together before the eye: the way shows with the next node at once
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const instant = await now();
  await panel.getByRole('button', { name: 'Наступний вузол' }).click();
  await expect(panel.locator('#hv2-detail-title')).toHaveText(`Вузол Б · ${NODES[1].title}`);
  await expect(panel).toHaveAttribute('data-flow', '');
  expect(await panel.evaluate((element) => element.hasAttribute('data-flow'))).toBe(true);
  expect((await flows()).filter((entry) => entry.t > instant && !entry.flow), 'never without its way').toEqual([]);
});

test('‹ › go round the five nodes — a finger swipes them too — and Esc closes the node, the focus back on its letter', async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const { stage } = await open(page);
  const panel = await openNode(page, NODES[0]);
  const title = panel.locator('#hv2-detail-title');
  // A dialog named by its title, the focus on its close
  await expect(panel).toHaveRole('dialog');
  await expect(panel).toHaveAccessibleName(`Вузол А · ${NODES[0].title}`);
  await expect(panel.getByRole('button', { name: 'Закрити вузол' })).toBeFocused();
  const next = panel.getByRole('button', { name: 'Наступний вузол' });
  const previous = panel.getByRole('button', { name: 'Попередній вузол' });
  // › round all five, back to А
  for (const node of [...NODES.slice(1), NODES[0]]) {
    await next.click();
    await expect(title).toHaveText(`Вузол ${node.letter} · ${node.title}`);
    await expect(stage).toHaveAttribute('data-detail', node.id);
    await expect(panel).toHaveAccessibleName(`Вузол ${node.letter} · ${node.title}`);
  }
  // ‹ the other way round: А → Д, then from the keyboard Д → Г
  await previous.click();
  await expect(title).toHaveText(`Вузол Д · ${NODES[4].title}`);
  await previous.focus();
  await page.keyboard.press('Enter');
  await expect(title).toHaveText(`Вузол Г · ${NODES[3].title}`);
  if (testInfo.project.name !== 'desktop-chromium') {
    // A finger swiping across the sheet: to the left the next node, to the right the previous one
    const box = (await panel.locator('.hv2-detail-drawing').boundingBox())!;
    const middle = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    await touchDrag(page, { x: middle.x + 70, y: middle.y }, { x: middle.x - 70, y: middle.y + 6 });
    await expect(title).toHaveText(`Вузол Д · ${NODES[4].title}`);
    await touchDrag(page, { x: middle.x - 70, y: middle.y }, { x: middle.x + 70, y: middle.y - 6 });
    await expect(title).toHaveText(`Вузол Г · ${NODES[3].title}`);
    // a swipe mostly up and down is the page's, not a step
    await touchDrag(page, { x: middle.x, y: middle.y + 40 }, { x: middle.x + 30, y: middle.y - 60 });
    await expect(title).toHaveText(`Вузол Г · ${NODES[3].title}`);
  }
  // Esc: closed, the focus on the letter of the node it closed, which says so
  await page.keyboard.press('Escape');
  await expect(page.locator('.hv2-detail')).toHaveCount(0);
  await expect(stage).not.toHaveAttribute('data-detail', /.*/);
  const pin = stage.locator('.hv2-proof-detail-pin[data-detail="ridge"]');
  await expect(pin).toBeFocused();
  await expect(pin).toHaveAttribute('aria-expanded', 'false');
  // …and the close does the same, for the node the visitor opened by its letter
  await openNode(page, NODES[2]);
  await page.locator('.hv2-detail').getByRole('button', { name: 'Закрити вузол' }).click();
  await expect(page.locator('.hv2-detail')).toHaveCount(0);
  await expect(stage.locator('.hv2-proof-detail-pin[data-detail="base"]')).toBeFocused();
});

/** Every change of the tour's chip and of what it puts on the stage, recorded in the page: the step («1/6 Каркас
 *  збирається»), the stage's assembly, layer, weight on the roof (and where it stands), the node open and its way, the
 *  brief's call */
type TourEntry = { t: number; step: string | null; building: boolean; layer: string; point: boolean; weight: number | null; detail: string | null; flow: boolean | null; call: boolean };
async function recordTour(page: Page) {
  await page.evaluate(() => {
    const sheet = document.querySelector<HTMLElement>('#real-object .hv2-contour')!;
    const stage = sheet.querySelector<HTMLElement>('.hv2-contour-stage')!;
    const chip = stage.querySelector<HTMLElement>('.hv2-contour-tour')!;
    const brief = sheet.querySelector<HTMLElement>('.hv2-contour-brief')!;
    const entries: unknown[] = [];
    let last = '';
    const read = () => {
      const panel = document.querySelector<HTMLElement>('.hv2-detail');
      const weight = stage.querySelector('.hv2-proof-point-weight');
      const name = [...chip.childNodes].filter((node) => node.nodeType === Node.TEXT_NODE).map((node) => node.textContent).join('').trim();
      const entry = {
        step: chip.dataset.on === undefined ? null : `${chip.querySelector('i')?.textContent ?? ''} ${name}`,
        building: stage.dataset.building !== undefined, layer: stage.dataset.layer ?? '', point: stage.dataset.point !== undefined,
        weight: weight ? Number(weight.getAttribute('x')) : null, detail: stage.dataset.detail ?? null,
        flow: panel ? panel.dataset.flow !== undefined : null, call: brief.dataset.call !== undefined,
      };
      const key = JSON.stringify(entry);
      if (key === last) return;
      last = key;
      entries.push({ t: performance.now(), ...entry });
    };
    Object.assign(window, { tour: entries });
    new MutationObserver(read).observe(document.querySelector('main')!, { attributes: true, childList: true, subtree: true, characterData: true });
    read();
  });
  return () => page.evaluate(() => (window as unknown as { tour: TourEntry[] }).tour);
}

test('«Тур за 20 секунд» plays six steps in order — the frame put up, the snow, a weight walking the roof, the wind, node Г with its load — then rings the brief and hands the block back', async ({ page }) => {
  test.setTimeout(75_000);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  const { sheet, stage, slider } = await open(page);
  const button = sheet.locator('figcaption .hv2-contour-tour-btn');
  const chip = stage.locator('.hv2-contour-tour');
  const log = await recordTour(page);
  await expect(button).toHaveText('Тур за 20 секунд');
  await button.click();
  // Pressed: «Зупинити тур», the step said in a status on the frame
  await expect(button).toHaveText('Зупинити тур');
  await expect(button).toHaveAttribute('aria-pressed', 'true');
  await expect(chip).toHaveRole('status');
  await expect(chip).toHaveAttribute('data-on', '');
  // …until it ends by itself, about 22 s on
  await expect(button).toHaveText('Тур за 20 секунд', { timeout: 35_000 });
  await expect(button).toHaveAttribute('aria-pressed', 'false');
  await expect(chip).not.toHaveAttribute('data-on', /.*/);
  const entries = await log();
  const steps = entries.filter((entry, index) => entry.step !== null && entry.step !== entries[index - 1]?.step);
  expect(steps.map((entry) => entry.step)).toEqual(TOUR.map(([name], index) => `${index + 1}/${TOUR.length} ${name}`));
  // each step held its time (ProofContour's TOUR), the whole about 22 s
  const t0 = steps[0].t;
  let due = 0;
  for (const [index, [name, hold]] of TOUR.entries()) {
    expect(Math.abs(steps[index].t - t0 - due), `${name} at ${Math.round(steps[index].t - t0)} ms`).toBeLessThan(500);
    due += hold;
  }
  const end = entries.find((entry) => entry.t > steps.at(-1)!.t && entry.step === null)!;
  expect(Math.abs(end.t - t0 - due), `the end at ${Math.round(end.t - t0)} ms`).toBeLessThan(600);
  const during = (index: number) => entries.filter((entry) => entry.step === steps[index].step);
  // 1: the frame put up on «Каркас»
  expect(during(0).some((entry) => entry.building), '1: the frame put up').toBe(true);
  expect(new Set(during(0).map((entry) => entry.layer))).toEqual(new Set(['frame']));
  // 2: the snow's way
  expect(new Set(during(1).map((entry) => entry.layer))).toEqual(new Set(['load']));
  // 3: a weight walking the roof, eave to eave
  expect(new Set(during(2).map((entry) => entry.layer))).toEqual(new Set(['load']));
  const walk = during(2).map((entry) => entry.weight).filter((x) => x !== null);
  expect(walk.length, '3: the weight walks').toBeGreaterThan(10);
  expect(walk, '3: the weight walks one way').toEqual(walk.toSorted((a, b) => a - b));
  expect(walk[0]).toBeLessThan(600);
  expect(walk.at(-1)!).toBeGreaterThan(1300);
  // 4: the wind's way, the weight gone
  expect(new Set(during(3).map((entry) => `${entry.layer} ${entry.point}`))).toEqual(new Set(['wind false']));
  // 5: node Г open on «Каркас», its load's way shown once it is put together
  expect(new Set(during(4).map((entry) => `${entry.layer} ${entry.detail}`))).toEqual(new Set(['frame ridge']));
  expect(during(4)[0].flow, '5: the way waits for the node').toBe(false);
  expect(during(4).some((entry) => entry.flow), '5: the node’s load way').toBe(true);
  // 6: the node closed, the brief's button rung
  expect(during(5).some((entry) => entry.call), '6: the brief rings').toBe(true);
  expect(during(5).at(-1)!.detail, '6: the node closed').toBeNull();
  // Handed back: the frame on «Каркас», the seam at rest, no node open, the way on to a brief lit for the visitor
  await expect(stage).toHaveAttribute('data-layer', 'frame');
  await expectSplit(slider, stage, DEFAULT_SPLIT);
  await expect(page.locator('.hv2-detail')).toHaveCount(0);
  await expect(sheet.locator('a.hv2-contour-brief')).toHaveAttribute('data-lit', '');
});

test('the tour hands the block back at once: on «Зупинити тур», on a press of the visitor’s own in the sheet, on a key there — and nothing of it comes back', async ({ page }, testInfo) => {
  test.setTimeout(60_000);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  const { sheet, stage, slider, layers } = await open(page);
  const button = sheet.locator('figcaption .hv2-contour-tour-btn');
  const chip = stage.locator('.hv2-contour-tour');
  const stopped = async (why: string) => {
    await expect(chip, why).not.toHaveAttribute('data-on', /.*/);
    await expect(button, why).toHaveText('Тур за 20 секунд');
    await expect(button, why).toHaveAttribute('aria-pressed', 'false');
  };
  // Its own button, pressed again
  await button.click();
  await expect(chip).toHaveAttribute('data-on', '');
  await expect(button).toHaveText('Зупинити тур');
  await button.click();
  await stopped('«Зупинити тур»');
  // A press of the visitor's own in the sheet — here a layer, on the snow's step: the layer is the visitor's from then on
  await button.click();
  await expect(chip).toContainText('2/6', { timeout: 8_000 });
  await layers.getByRole('button', { name: 'Вітер' }).click();
  await stopped('a layer pressed');
  await expect(stage).toHaveAttribute('data-layer', 'wind');
  // …and nothing of the tour comes back after that step would have ended: every change recorded, on the page's own clock
  const log = await recordTour(page);
  const since = await page.evaluate(() => performance.now());
  await pageClockPast(page, since, TOUR[1][1] + 600);
  expect((await log()).filter((entry) => entry.step !== null || entry.layer !== 'wind' || entry.point || entry.detail !== null)).toEqual([]);
  // A key in the sheet
  await button.click();
  await expect(chip).toHaveAttribute('data-on', '');
  await slider.focus();
  await page.keyboard.press('ArrowRight');
  await stopped('a key');
  // A mouse pressed on the title block, clear of every control (a laptop's)
  if (testInfo.project.name === 'desktop-chromium') {
    await button.click();
    await expect(chip).toHaveAttribute('data-on', '');
    const cell = (await sheet.locator('figcaption .sheet-cell-note').boundingBox())!;
    await page.mouse.click(cell.x + cell.width / 2, cell.y + cell.height / 2);
    await stopped('a press on the title block');
  }
});

// The tour's chip covers no other word on the frame: the seam's names step aside while the tour plays (its first step
// glides the seam to 15 %, under the chip on a laptop), and on a phone the assembly's step label stands under the chip
test('the tour’s chip covers no other word on the frame', async ({ page }) => {
  test.setTimeout(45_000);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  const { sheet } = await open(page);
  await page.evaluate(() => {
    const stage = document.querySelector<HTMLElement>('#real-object .hv2-contour-stage')!;
    const chip = stage.querySelector<HTMLElement>('.hv2-contour-tour')!;
    const met = new Set<string>();
    Object.assign(window, { met, metDone: false });
    const visible = (element: Element) => getComputedStyle(element).visibility === 'visible' && Number(getComputedStyle(element).opacity) > 0.05;
    const start = performance.now();
    const tick = () => {
      if (chip.dataset.on !== undefined) {
        const a = chip.getBoundingClientRect();
        for (const word of stage.querySelectorAll('.hv2-contour-seamtags > span, .hv2-contour-build-steps > span, .hv2-contour-hint, .hv2-contour-stamp')) {
          const b = word.getBoundingClientRect();
          if (visible(word) && Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1) met.add(word.textContent ?? '');
        }
      }
      if (performance.now() - start < 9_000) requestAnimationFrame(tick);
      else Object.assign(window, { metDone: true });
    };
    requestAnimationFrame(tick);
  });
  await sheet.locator('figcaption .hv2-contour-tour-btn').click();
  await page.waitForFunction(() => (window as unknown as { metDone: boolean }).metDone, undefined, { timeout: 15_000 });
  expect(await page.evaluate(() => [...(window as unknown as { met: Set<string> }).met])).toEqual([]);
});

// The nodes' letters cover no word on the frame, from tablet to wide screen: on a tablet's frame Г, Б and Д stand inside
// the truss (homeProofDetailSpots' badgeNarrow); a letter that would still cover a word of the drawing gives way to it
// (its ring and the bar's letter stay), and «Схема ›» gives way to a letter as to a word
test('the nodes’ letters cover no word on the frame — no name, no figure, not the seam’s names or the stamp — from tablet to wide screen', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'desktop windows');
  test.setTimeout(150_000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const found: string[] = [];
  const plan: [number, number, number[]][] = [
    [761, 900, [DEFAULT_SPLIT]], [768, 1024, [DEFAULT_SPLIT]], [1024, 768, [DEFAULT_SPLIT, 70]], [1180, 820, [DEFAULT_SPLIT]],
    [1280, 720, [DEFAULT_SPLIT, 64, 68]], [1366, 768, [DEFAULT_SPLIT, 64, 68]], [1440, 780, [DEFAULT_SPLIT, 64, 68]], [1440, 900, [DEFAULT_SPLIT]], [1920, 1080, [DEFAULT_SPLIT]],
  ];
  for (const [width, height, splits] of plan) {
    await page.setViewportSize({ width, height });
    const { stage, slider } = await open(page);
    for (const value of splits) {
      await splitTo(page, slider, value);
      await nextFrames(page, 2);
      found.push(...(await stage.evaluate((element) => {
        const frame = element.getBoundingClientRect();
        const seam = frame.left + (frame.width * parseFloat(getComputedStyle(element.querySelector('.hv2-contour-pane')!).getPropertyValue('--split'))) / 100;
        const shown = (node: Element) => {
          for (let at: Element | null = node; at && at !== element; at = at.parentElement) {
            const style = getComputedStyle(at);
            if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) < 0.05) return false;
          }
          return true;
        };
        const box = (node: Element, rightSide: boolean) => {
          const rect = node.getBoundingClientRect();
          return { left: Math.max(rect.left, rightSide ? seam : frame.left), right: Math.min(rect.right, frame.right), top: rect.top, bottom: rect.bottom };
        };
        const words = [
          ...[...element.querySelectorAll<HTMLElement>('.hv2-proof-measure, .hv2-proof-tag, .hv2-contour-stamp')].filter(shown).map((node) => ({ name: node.textContent ?? '', ...box(node, true) })),
          ...[...element.querySelectorAll('.hv2-contour-seamtags > span')].filter(shown).map((node) => ({ name: node.textContent ?? '', ...box(node, false) })),
        ];
        const misses: string[] = [];
        for (const pin of element.querySelectorAll<HTMLElement>('.hv2-proof-detail-pin')) {
          if (!shown(pin)) continue;
          const a = box(pin, true);
          if (a.right - a.left > 0 && a.right - a.left < pin.getBoundingClientRect().width - 0.5) misses.push(`${pin.textContent} cut by the seam`);
          for (const word of words) {
            const [x, y] = [Math.min(a.right, word.right) - Math.max(a.left, word.left), Math.min(a.bottom, word.bottom) - Math.max(a.top, word.top)];
            if (x > 1 && y > 1) misses.push(`${pin.textContent} × ${word.name} (${x.toFixed(0)} × ${y.toFixed(0)} px)`);
          }
        }
        return misses;
      })).map((miss) => `${width}×${height} ${value}: ${miss}`));
    }
  }
  expect(found).toEqual([]);
});

test('on a laptop the sheet fits under the header where the window has the room, its title block — one row — is never under the picture, and the crop keeps the gable whole', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'laptop windows');
  test.setTimeout(90_000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  // The usual laptops fit, as before, and so does a window a little short of that — a Mac with its dock showing, 1440 ×
  // 700–760: the sheet narrows to fit it (owner, 06.10), never below the title block's one row; on a short window (owner,
  // 04.10: there the picture covered the note) the picture keeps the photo's rows 84–644 and the sheet runs past the
  // window instead
  const windows = [[1280, 720, true], [1366, 768, true], [1440, 900, true], [1440, 760, true], [1440, 700, true], [1536, 864, true], [1920, 1080, true], [1280, 600, false], [1100, 650, false], [1024, 600, false]] as const;
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
    // The title block in one row from 1240 px (owner, 05.10: «Вузли крупно» moved over the picture's foot — about 119 px
    // at 1280 × 720), its right cell wide enough for a load's way in two lines
    const caption = sheet.locator('figcaption');
    if (width >= 1240) {
      expect(new Set(await caption.locator(':scope > :is(.sheet-cell, .sheet-action)').evaluateAll((cells) => cells.filter((cell) => cell.getBoundingClientRect().width > 0).map((cell) => Math.round(cell.getBoundingClientRect().top)))), `${at}: one row`).toHaveProperty('size', 1);
    }
    if (width >= 1280) expect((await caption.boundingBox())!.height, at).toBeLessThanOrEqual(120);
    expect((await sheet.locator('figcaption .hv2-contour-right').boundingBox())!.width, at).toBeGreaterThanOrEqual(302);
    const image = (await sheet.locator('.sheet-image').boundingBox())!;
    const [least, most] = [(image.width * 560) / 1536, (image.width * 788) / 1536];
    const room = height - 117 - 12 - rest.measured;
    expect(image.height, at).toBeCloseTo(Math.min(most, Math.max(least, room)), 0);
    // …so the usual laptops show the whole sheet (on 1280 × 720 the picture is at its least, the window leaving it 0.9 px
    // less than that: the sheet ends 11 px above the window's foot instead of 12 — said in the report), and a short
    // window keeps the photo's rows 84–644 and lets the sheet run past its foot. (soft: every window's misses in one run)
    if (fits) expect.soft(box.y + box.height, `${at}: the sheet fits`).toBeLessThanOrEqual(height);
    else expect.soft(room, `${at}: the window is shorter than the sheet`).toBeLessThan(least);
    // Without a script a usual rest by width stands in for the measured one (whether it is still the measured one: the
    // fixme below)
    expect(await sheet.evaluate((element) => getComputedStyle(element).getPropertyValue('--hv2-sheet-rest-0')), at).toMatch(/^\d+px$/);
    // The title block keeps its place under the picture, inside the sheet…
    const stamp = (await caption.boundingBox())!;
    expect(stamp.y, at).toBeGreaterThanOrEqual(image.y + image.height - 0.5);
    expect(stamp.y + stamp.height, at).toBeLessThanOrEqual(box.y + box.height + 0.5);
    // …and nothing of the picture lies over it: in view, each of its cells is what the window shows at its middle
    await caption.evaluate((element) => element.scrollIntoView({ block: 'end' }));
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
    // (never drawn larger than fetched; a sheet narrowed to fit the window draws it a little smaller — the srcset's sizes
    // are the full width's)
    expect(fetched[0], at).toBeGreaterThanOrEqual(fetched[1] - 1);
    expect(fetched[0] / fetched[1], at).toBeLessThan(1.45);
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
        const partBox = part.getBBox();
        return partBox.y + partBox.height;
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

// Without a script the usual rest by width stands in for the measured one (home-v2.css --hv2-sheet-rest-0: 177 px from
// 1239 px, 248 px from 813, 268 px below — measured 06.10 on the compact title block), so on the usual laptops the
// server's picture is the hydrated one's (review, 04.10)
test('without a script the usual rest by width stands in for the measured one: on the usual laptops the server’s picture is the hydrated one’s', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'laptop windows');
  test.setTimeout(60_000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const [width, height] of [[1280, 720], [1366, 768], [1440, 900], [1536, 864], [1920, 1080]] as const) {
    await page.setViewportSize({ width, height });
    const { sheet } = await open(page);
    const [measured, fallback] = await sheet.evaluate((element) => [
      `${(element as HTMLElement).offsetHeight - element.querySelector<HTMLElement>('.sheet-image')!.offsetHeight}px`,
      getComputedStyle(element).getPropertyValue('--hv2-sheet-rest-0'),
    ]);
    expect.soft(fallback, `${width}×${height}`).toBe(measured);
  }
});

test('from tablet to wide screen, no word on the frame covers another or runs off it', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'desktop windows');
  test.setTimeout(150_000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  // At rest in every layer from 761 px up; the seam dragged right over the figure on short laptops (where the seam's
  // name used to land on it) and to the far right (where «‹ Фото» met the stamp). Every miss is collected
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
    for (const layer of LAYERS) {
      await layers.getByRole('button', { name: layer }).click();
      for (const value of splits) {
        await splitTo(page, slider, value);
        found.push(...(await settledClashes(stage, value === DEFAULT_SPLIT)).map((clash) => `${width}×${height} ${layer} ${value}: ${clash}`));
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
  // …and «Схема ›» is back at rest (the slope's figure it used to give way to went on 09.10; what it yields to on the way
  // is checked frame by frame above)
  void yielded;
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
  // frame, over the column's name (under the ground since 09.10; the slope's figure went), every frame recorded
  await page.setViewportSize({ width: 1280, height: 720 });
  await splitTo(page, slider, DEFAULT_SPLIT);
  await expect.poll(misses).toEqual([]);
  await stage.evaluate((element) => element.scrollIntoView({ block: 'center' }));
  const frame = (await stage.boundingBox())!;
  const y = Math.round(frame.y + frame.height * 0.6);
  const xAt = (value: number) => Math.round(frame.x + (frame.width * value) / 100);
  await page.mouse.move(Math.round(frame.x - 30), y);
  await page.mouse.move(xAt(DEFAULT_SPLIT), y);
  // (a press takes the seam: a mouse over the frame moves none on its own — owner, 05.10)
  await page.mouse.down();
  await expect.poll(() => splitOf(stage)).toBe(tenths(await pointerAt(stage, xAt(DEFAULT_SPLIT))));
  await stage.evaluate((element) => {
    const pane = element.querySelector('.hv2-contour-pane')!;
    const slope = element.querySelector<HTMLElement>('.hv2-proof-tag[data-tag="column"]')!;
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
  for (let step = 1; step <= 60; step += 1) {
    await page.mouse.move(xAt(DEFAULT_SPLIT + (18 * step) / 60), y);
    // (one move a frame: the page's own pace, no fixed wait)
    await nextFrames(page, 1);
  }
  await page.mouse.up();
  await page.waitForFunction(() => (window as unknown as { drag: { done: boolean } }).drag.done);
  const drag = await page.evaluate(() => (window as unknown as { drag: { frames: { t: number; cutBySeam: boolean; cut: boolean; range: string }[]; released: number } }).drag);
  const moving = drag.frames.filter((at) => at.t < drag.released);
  const reached = moving.find((at) => at.cutBySeam);
  expect(reached, 'the seam reached the column’s name while it moved').toBeDefined();
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

test('the scheme’s names stand in free room: the truss’s over the rake, the purlins’ and the walls’ on the right wall’s face, the column’s under the ground by its footing, the footings’ under the base, none over another or off the frame, at every width', async ({ page }, testInfo) => {
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
      const [footNear, footFar, headFarPoint, headNear] = opening;
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
          jamb: xAt(footNear, headNear, middle), farJamb: xAt(footFar, headFarPoint, middle), section: xAt(section[0], section[1], middle),
          head: Math.max(screen(headNear)[1], screen(headFarPoint)[1]), foot: Math.min(screen(footNear)[1], screen(footFar)[1]), low: screen([0, low])[1], scale: ctm.a,
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
      // the footings' under the base — below 1240 px under the column's too (09.10: side by side they met there)
      if (box.id === 'footing') expect.soft(box.top, `${at} ${box.id} under the base`).toBeGreaterThanOrEqual(box.base);
      if (box.id === 'footing' && width <= 1239) expect.soft(box.top, `${at} ${box.id} under the column's name`).toBeGreaterThanOrEqual(byId.column.bottom);
      if (box.id === 'bracing' || box.id === 'wall') {
        // on the face that holds only blockwork: right of the right gate, short of the right wall's section, under every
        // member behind it, over the base
        expect.soft(box.left, `${at} ${box.id} right of the right gate`).toBeGreaterThanOrEqual(box.farJamb);
        expect.soft(box.right, `${at} ${box.id} short of the right wall's section`).toBeLessThanOrEqual(box.section);
        expect.soft(box.top, `${at} ${box.id} under the members behind the face`).toBeGreaterThanOrEqual(box.low);
        expect.soft(box.bottom, `${at} ${box.id} over the base`).toBeLessThanOrEqual(box.baseUnder);
      }
      if (box.id === 'column') {
        // under the ground, beside the column's footing (owner, 09.10: in the right gate's opening it lay on the gate):
        // under the gable's base, left of the right gate's jamb
        expect.soft(box.top, `${at} column under the base`).toBeGreaterThanOrEqual(box.baseUnder);
        expect.soft(box.left, `${at} column left of the gate's jamb`).toBeLessThanOrEqual(box.jamb);
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
  // (sixteen steady screenshots and four pixel counts)
  test.setTimeout(60_000);
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
    const { stage, slider } = await open(page);
    const geometry = () => stage.evaluate((element) => {
      const [frame, canvas] = [element, element.querySelector('.hv2-contour-canvas')!].map((part) => part.getBoundingClientRect());
      return { frame: { left: frame.left, top: frame.top, right: frame.right, bottom: frame.bottom, width: frame.width }, canvas: { left: canvas.left, top: canvas.top, width: canvas.width } };
    });
    const { frame, canvas } = await geometry();
    // The canvas 1.22 × the frame's width, 19.46 % of it off to the left, the photo's first row at the frame's top (since
    // 09.10 the frame is the photo's full height — 1536 / 961 — and the sheet edge to edge: 390 × 244 at 390 px)…
    expect(canvas.width, `${width}`).toBeCloseTo(frame.width * PHONE_ZOOM, 0);
    expect(canvas.left - frame.left, `${width}`).toBeCloseTo((-frame.width * PHONE_LEFT) / 100, 0);
    expect(canvas.top - frame.top, `${width}`).toBeCloseTo((-canvas.width * PHONE_TOP_ROW) / 1536, 0);
    // …so the frame shows the photo's columns 245–1504 and all its rows, 0–788
    const scale = canvas.width / 1536;
    expect(Math.abs((frame.left - canvas.left) / scale - 245), `${width}`).toBeLessThanOrEqual(1);
    expect(Math.abs((frame.right - canvas.left) / scale - 1504), `${width}`).toBeLessThanOrEqual(1);
    expect(Math.abs((frame.top - canvas.top) / scale - PHONE_TOP_ROW), `${width}`).toBeLessThanOrEqual(1);
    expect(Math.abs((frame.bottom - canvas.top) / scale - 788), `${width}`).toBeLessThanOrEqual(1);
    expect(frame.width, `${width}: edge to edge`).toBeCloseTo(width, 0);
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

    // The photo is fetched for the canvas's width, not the frame's (the srcset's sizes × 1.22)
    const fetched = await stage.locator('.hv2-contour-canvas > picture img').evaluate((element) => [(element as HTMLImageElement).naturalWidth, element.getBoundingClientRect().width]);
    expect(Math.abs(fetched[0] - fetched[1]), `${width}`).toBeLessThanOrEqual(1);
    // The lines keep their set weight on the screen, within a fifth (home-v2.css: --u stepped by width and divided by the
    // zoom): the outline is --lw-1 × --k CSS pixels
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
  const overflowing = await sheet.locator('figcaption, figcaption .sheet-cell, figcaption .sheet-cell b, figcaption .sheet-action, figcaption button, figcaption a').evaluateAll((elements) =>
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
  // The scheme's name is not read while the sketch is on, nor are its nodes or its tour offered: they are the scheme's
  await expect(sketch.stage.getByRole('img', { name: homeProofFrame.label })).toHaveCount(0);
  await expect(sketch.sheet.locator('figcaption .hv2-contour-tour-btn')).toBeDisabled();
  for (const letter of await sketch.sheet.locator('.hv2-contour-nodes button').all()) await expect(letter).toBeDisabled();
  await expect(sketch.stage.locator('.hv2-proof-detail-pins')).toBeHidden();
  // The sketch lies on the right side only, in its window: its own dark ground over the tracing, nothing of it over the
  // photo
  await expect(sketch.stage.locator('.hv2-contour-pane .hv2-contour-sketch')).toHaveCSS('background-color', 'rgb(22, 24, 23)');
  expect(await sketch.stage.locator('.hv2-contour-sketch').evaluate((element) => element.closest('.hv2-contour-pane') !== null)).toBe(true);
  await expectWindow(sketch.stage, DEFAULT_SPLIT);
  // The scheme is one press away, for the comparison — with its own note, not the sketch's
  await sketch.layers.getByRole('button', { name: 'Каркас' }).click();
  await expect(sketch.stage.locator('.hv2-proof-scheme')).toBeVisible();
  await expect(sketch.stage.locator('.hv2-contour-sketch')).toBeHidden();
  const note = sketch.sheet.locator('.sheet-cell-note');
  await expect(note).not.toContainText('згенероване');
  await expect(note).toContainText(LINE);
  await expect(sketch.stage.getByRole('img', { name: homeProofFrame.label, exact: true })).toBeVisible();
  await expect(sketch.sheet.locator('figcaption .hv2-contour-tour-btn')).toBeEnabled();
  // No visible word names the old idea
  expect(await sketch.sheet.innerText()).not.toMatch(/x-?ray|рентген/i);
});
