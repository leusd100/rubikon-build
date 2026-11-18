#!/usr/bin/env node
// Records the /angary 3D build-up frame by frame and encodes the loop that ConfiguratorBuildUpVideo plays (18.11).
//
//   node scripts/capture-configurator-buildup.mjs [--url https://rubikonbuild.com/angary] [--size 24x60x8] [--out public/media/angary]
//
// Why frame by frame: a screen recording drops and doubles frames. Here the page clock is Playwright's fake clock, paused,
// and every output frame advances it by exactly 16 ms before a screenshot, so each frame is one exact step of the
// configurator's own animation (useBuildProgress / layerLifecycle) — about 1.9× slower at 30 fps, the same on any machine.
// What is drawn is the live 3D view: the script only ticks «Окремі роботи» layers one by one in fullscreen, hides the
// view's own buttons and size line (illegible at this size) and lays the stage names over it.
//
// Needs system Chrome with a GPU (`--use-angle=metal` on macOS; SwiftShader also works, slowly), ffmpeg with libx264,
// and Pillow for the posters. Output: <out>/configurator-buildup-<W>x<L>-v1.{mp4,webp,avif}.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium } from '@playwright/test';

const arg = (name, fallback) => {
  const at = process.argv.indexOf(`--${name}`);
  return at > 0 ? process.argv[at + 1] : fallback;
};
const url = arg('url', 'https://rubikonbuild.com/angary');
const dims = arg('size', '24x60x8').split('x').map(Number);
const out = arg('out', 'public/media/angary');
const SCOPE = ['Фундамент', 'Каркас', 'Стіни', 'Покрівля'];
const STAGES = [['Фундамент', 'Фундамент'], ['Каркас', 'Металокаркас'], ['Стіни', 'Стіни й ворота'], ['Покрівля', 'Покрівля']];
const DT = 16;
const fmt = (n) => String(n).replace('.', ',');

const work = mkdtempSync(join(tmpdir(), 'buildup-'));
const frames = join(work, 'frames');
execFileSync('mkdir', ['-p', frames]);

// Extra Chrome flags, e.g. BUILDUP_CHROME_ARGS='--host-resolver-rules=MAP rubikonbuild.com <ip>' where a local DNS filter
// blocks the address the resolver returns (18.11)
const extraArgs = process.env.BUILDUP_CHROME_ARGS ? [process.env.BUILDUP_CHROME_ARGS] : [];
const browser = await chromium.launch({ channel: 'chrome', args: ['--use-angle=metal', '--enable-gpu', ...extraArgs] });
const page = await (await browser.newContext({ viewport: { width: 960, height: 540 }, deviceScaleFactor: 2, colorScheme: 'light', locale: 'uk-UA' })).newPage();
await page.clock.install();
await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60_000 });
await page.getByRole('button', { name: 'Лише необхідні', exact: true }).click({ timeout: 8000 }).catch(() => {});

async function openStep(id) {
  const tab = page.locator(`#hc-step-${id}-tab`);
  for (let i = 0; i < 30 && (await tab.getAttribute('aria-selected')) !== 'true'; i++) { await tab.click(); await page.waitForTimeout(300); }
}
await openStep('size');
for (const [k, name] of ['Ширина', 'Довжина', 'Висота стін'].entries()) await page.getByRole('slider', { name, exact: true }).fill(String(dims[k]));
await openStep('check');
// Every layer must start off: a click before the option card took effect once left three of them ticked (18.11)
for (let attempt = 0; ; attempt++) {
  await page.locator('.hc-option-card').filter({ hasText: 'Окремі роботи' }).click();
  const ticked = [];
  for (const name of SCOPE) {
    const box = page.getByRole('checkbox', { name, exact: true });
    if (!(await box.count()) || await box.isChecked()) ticked.push(name);
    if ((await box.count()) && await box.isChecked()) await box.click({ force: true });
  }
  if (!ticked.length) break;
  if (attempt > 20) throw new Error(`scope did not clear: ${ticked.join(', ')}`);
  await page.waitForTimeout(400);
}
await page.getByRole('button', { name: 'Подивитися в 3D', exact: true }).first().evaluate((el) => el.click());
await page.locator('.hc-preview-sheet canvas, .hc-preview-surface canvas').first().waitFor({ timeout: 20_000 });
await page.waitForTimeout(1500);
await page.getByRole('button', { name: 'Розгорнути', exact: true }).first().evaluate((el) => el.click());
await page.waitForTimeout(2500);

await page.evaluate((size) => {
  const root = document.querySelector('.hc-fullscreen-canvas-slot').parentElement.parentElement;
  root.querySelector('.hc-three-overlay-toggle')?.click();
  const css = document.createElement('style');
  css.textContent = `
    #vx { position: fixed; inset: 0; z-index: 2147483647; pointer-events: none; color: #f2efe8; font-family: var(--font-display); }
    #vx .stage { position: absolute; left: 48px; top: 44px; }
    #vx .lbl { font-family: var(--font-condensed); font-weight: 600; text-transform: uppercase; letter-spacing: .14em; color: #cc8455; font-size: 19px; }
    #vx .t { font-size: 54px; line-height: 1.08; margin-top: 10px; }
    #vx .bar { margin-top: 18px; display: flex; gap: 8px; }
    #vx .bar i { display: block; width: 48px; height: 3px; background: rgba(242,239,232,.2); }
    #vx .bar i.on { background: #cc8455; }`;
  document.head.appendChild(css);
  for (const b of root.querySelectorAll('button')) b.style.visibility = 'hidden';
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) if (walker.currentNode.textContent.includes('Нічого не обрано')) walker.currentNode.parentElement.style.visibility = 'hidden';
  const vx = document.createElement('div');
  vx.id = 'vx';
  vx.dataset.size = size;
  vx.innerHTML = `<div class="stage" id="stage" style="opacity:0"><div class="lbl" id="stage-n"></div><div class="t" id="stage-t"></div><div class="bar">${'<i></i>'.repeat(4)}</div></div>`;
  document.body.appendChild(vx);
}, `${fmt(dims[0])} × ${fmt(dims[1])} м`);
await page.waitForTimeout(800);

await page.clock.pauseAt(new Date((await page.evaluate(() => Date.now())) + 1000));
let f = 0;
const ease = (t) => 1 - (1 - Math.min(1, Math.max(0, t))) ** 3;
const opacity = (v) => page.evaluate((v) => { document.getElementById('stage').style.opacity = v; }, v);
async function shoot(n, each) {
  for (let i = 0; i < n; i++) {
    if (each) await each(i);
    await page.clock.runFor(DT);
    await page.screenshot({ path: join(frames, `${String(f++).padStart(4, '0')}.png`), animations: 'allow', caret: 'hide' });
  }
}
const settled = () => page.evaluate(() => document.querySelector('[data-build-up]').getAttribute('data-build-up') === 'settled');

await shoot(12);
for (const [k, [box, title]] of STAGES.entries()) {
  await page.evaluate(([k, title]) => {
    document.getElementById('stage-n').textContent = `${document.getElementById('vx').dataset.size} · етап ${k + 1} / 4`;
    document.getElementById('stage-t').textContent = title;
    document.querySelectorAll('#vx .bar i').forEach((el, j) => el.classList.toggle('on', j <= k));
  }, [k, title]);
  if (k === 0) await shoot(8, (i) => opacity(ease((i + 1) / 8))); else await shoot(4);
  await page.getByRole('checkbox', { name: box, exact: true }).evaluate((el) => el.click());
  await shoot(4);
  for (let guard = 0; !(await settled()) && guard < 400; guard++) await shoot(1);
  await shoot(k === 3 ? 30 : 16);
}
await opacity(0);
const poster = join(work, 'poster.png');
await page.screenshot({ path: poster });
await opacity(1);
await shoot(10, (i) => opacity(1 - ease((i + 1) / 10)));
await browser.close();

const name = `configurator-buildup-${dims[0]}x${dims[1]}-v1`;
// A 20-frame crossfade from the finished building back to frame 0 (the empty scene) closes the loop without a seam,
// and the posters are the finished building without a caption
execFileSync('python3', ['-c', `
import os, sys
from PIL import Image
d, poster, out, name = sys.argv[1:5]
n = len(os.listdir(d))
a = Image.open(f'{d}/{n-1:04d}.png').convert('RGB'); b = Image.open(f'{d}/0000.png').convert('RGB')
for i in range(1, 21):
    t = i / 20; t = t * t * (3 - 2 * t)
    Image.blend(a, b, t).save(f'{d}/{n-1+i:04d}.png')
im = Image.open(poster).convert('RGB').resize((1280, 720), Image.LANCZOS)
im.save(f'{out}/{name}.webp', 'WEBP', quality=80, method=6)
im.save(f'{out}/{name}.avif', 'AVIF', quality=60)
`, frames, poster, out, name], { stdio: 'inherit' });
execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-framerate', '30', '-i', join(frames, '%04d.png'),
  '-vf', 'scale=1280:720:flags=lanczos', '-c:v', 'libx264', '-profile:v', 'high', '-preset', 'veryslow', '-crf', '27',
  '-pix_fmt', 'yuv420p', '-tune', 'animation', '-g', '60', '-movflags', '+faststart', '-an', join(out, `${name}.mp4`)], { stdio: 'inherit' });
console.log(`${readdirSync(frames).length} frames → ${out}/${name}.mp4`);
rmSync(work, { recursive: true, force: true });
