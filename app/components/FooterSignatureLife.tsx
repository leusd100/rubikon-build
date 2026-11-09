'use client';

import { useEffect } from 'react';
import type { FooterScene, WordGeometry } from './footerScenes';

// What moves on the footer's embossed RUBIKON (owner 08–09.11):
// - the lamp: where a mouse moves over the footer, a point light rakes the letters (FooterSignature's lamp pass). Only a
//   fine pointer and motion allowed, as MaterialLight; a phone keeps the band of light that crosses the word once (motion.css).
// - on the eight pages with a live scene of their own, that scene plays on the word (footerScenes.ts), continuously while
//   the word is on the screen and paused off it, from 1181 px as the page scenes (LiveScene.tsx) — owner 09.11: «безперервно,
//   як і було». The home page shows all eight in turn; the 404 page lowers the word's missing O into place. With reduced
//   motion one still frame, without the play. Nothing is fetched on the other pages.

/** The pages with a footer scene, as selectors on their <main>: the keys of FOOTER_SCENES and the list globals.css lifts the
    word on (tests/unit/footer-scenes.test.ts holds the three equal) */
export const FOOTER_SCENE_PAGES = [
  '.roofing-page', '.metal-page', '.concrete-page', '.grain-page', '.process-page', '.angary-page', '.about-page', '.directions-page',
  '[data-home]', '.not-found-page',
] as const;
const DESKTOP = '(min-width: 1181px)';
/** How far the scene canvas reaches above the word: --footer-scene-head in globals.css (less on the grain page), else this */
const HEAD = 120;
const headOf = (stage: HTMLElement) => Number.parseFloat(getComputedStyle(stage).getPropertyValue('--footer-scene-head')) || HEAD;
/** viewBox of the signature: x from 521, y from 140, 802 wide */
const VIEW = { x: 521, y: 140, width: 802 };
const LONGEST_STEP = 1 / 20;
/** A scene comes up already going (rain mid-fall, the arc lit), not from an empty sky; reduced motion shows the frame after more */
const WARM_UP_STEPS = 60;
const STILL_STEPS = 240;
/** The lamp's z over the letters: low for the arc, so the light falls on the letters around it */
const LAMP_Z = 46;
const ARC_Z = 22;
/** The visitor's «Зупинити рух», kept for the next pages and visits */
const STOPPED_KEY = 'rubikon-footer-motion';
const STOP_LABEL = 'Зупинити рух';
const START_LABEL = 'Увімкнути рух';
const readStopped = () => {
  try {
    return window.localStorage.getItem(STOPPED_KEY) === 'off';
  } catch {
    return false;
  }
};
const writeStopped = (stopped: boolean) => {
  try {
    if (stopped) window.localStorage.setItem(STOPPED_KEY, 'off');
    else window.localStorage.removeItem(STOPPED_KEY);
  } catch {
    // storage may be off: the choice then lasts this page
  }
};

export function FooterSignatureLife() {
  useEffect(() => {
    const stage = document.querySelector<HTMLElement>('.footer-signature-stage');
    const svg = stage?.querySelector<SVGSVGElement>('svg.footer-signature');
    const point = svg?.querySelector('#footer-signature-lamp');
    const footer = stage?.closest('footer');
    if (!stage || !svg || !point || !footer) return;
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const cleanups: Array<() => void> = [];
    // «Зупинити рух» stops the scene at a still frame and the lamp with it (WCAG 2.2.2: moving content longer than 5 s)
    let stopped = readStopped();

    // ——— the lamp ———
    const lamp = { x: 700, y: 150, tx: 700, ty: 150, hover: false, arc: null as [number, number] | null, frame: 0 };
    const setLamp = () => {
      point.setAttribute('x', lamp.x.toFixed(1));
      point.setAttribute('y', lamp.y.toFixed(1));
      point.setAttribute('z', String(lamp.arc ? ARC_Z : LAMP_Z));
      if (lamp.hover || lamp.arc) svg.dataset.lamp = lamp.arc ? 'arc' : 'on';
      else delete svg.dataset.lamp;
    };
    const glide = () => {
      lamp.frame = 0;
      const [tx, ty] = lamp.arc ?? [lamp.tx, lamp.ty];
      const ease = lamp.arc ? .5 : .14;
      lamp.x += (tx - lamp.x) * ease;
      lamp.y += (ty - lamp.y) * ease;
      setLamp();
      if (Math.abs(tx - lamp.x) > .3 || Math.abs(ty - lamp.y) > .3) lamp.frame = requestAnimationFrame(glide);
    };
    const wake = () => {
      if (!lamp.frame) lamp.frame = requestAnimationFrame(glide);
    };
    if (fine && !calm) {
      const move = (event: PointerEvent) => {
        if (event.pointerType !== 'mouse' || stopped) return;
        const toSvg = svg.getScreenCTM()?.inverse();
        if (!toSvg) return;
        const at = new DOMPoint(event.clientX, event.clientY).matrixTransform(toSvg);
        // anywhere over the footer the light stays near the word: above it it rakes, below it it grazes
        lamp.tx = at.x;
        lamp.ty = Math.max(90, Math.min(260, at.y));
        if (!lamp.hover) {
          lamp.hover = true;
          lamp.x = lamp.tx;
          lamp.y = lamp.ty;
        }
        wake();
      };
      const leave = () => {
        lamp.hover = false;
        setLamp();
      };
      footer.addEventListener('pointermove', move);
      footer.addEventListener('pointerleave', leave);
      cleanups.push(() => {
        footer.removeEventListener('pointermove', move);
        footer.removeEventListener('pointerleave', leave);
        cancelAnimationFrame(lamp.frame);
      });
    }

    // ——— the scene ———
    const page = FOOTER_SCENE_PAGES.find((key) => document.querySelector(`main${key}`));
    let cancelled = false;
    if (page && window.matchMedia(DESKTOP).matches) {
      void import('./footerScenes').then(({ FOOTER_SCENES }) => {
        if (cancelled) return;
        cleanups.push(mountScene(stage, svg, FOOTER_SCENES[page]));
      });
    }

    function mountScene(host: HTMLElement, signature: SVGSVGElement, make: (g: WordGeometry) => FooterScene) {
      const canvases = ['back', 'front'].map((layer) => {
        const canvas = document.createElement('canvas');
        canvas.className = `footer-scene footer-scene-${layer}`;
        canvas.setAttribute('aria-hidden', 'true');
        return canvas;
      });
      const [back, front] = canvases;
      // appendChild, not prepend/append: the Workers types give Element those two as HTMLRewriter's (string | Response)
      host.insertBefore(back, host.firstChild);
      host.appendChild(front);
      // the scene is here: on 404 the word's O goes (globals.css) before the letters are first measured
      host.dataset.scene = 'ready';
      const contexts = canvases.map((canvas) => canvas.getContext('2d'));
      const probe = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
      const [bc, fc] = contexts;
      if (!bc || !fc || !probe) return () => canvases.forEach((canvas) => canvas.remove());

      let geometry: WordGeometry | null = null;
      let scene: FooterScene | null = null;
      let time = 0, frame = 0, last = 0, laidWidth = 0;

      const layout = () => {
        // the stage, not the svg: on narrower layouts the svg has a margin inside it, and the canvas spans the stage
        const box = host.getBoundingClientRect(), word = signature.getBoundingClientRect(), head = headOf(host);
        const width = box.width, height = box.height + head, ratio = Math.min(2, window.devicePixelRatio || 1);
        const wordTop = head + word.top - box.top;
        for (const [index, canvas] of canvases.entries()) {
          canvas.width = Math.round(width * ratio);
          canvas.height = Math.round(height * ratio);
          contexts[index]!.setTransform(ratio, 0, 0, ratio, 0, 0);
          contexts[index]!.lineCap = 'round';
        }
        const scale = word.width / VIEW.width;
        const letters = new Path2D();
        // the letters the page shows: on 404 the O is left out (globals.css), and the scene must not land on it
        const shown = [...signature.querySelectorAll<SVGPathElement>('path.footer-signature-letters')].filter((path) => getComputedStyle(path).display !== 'none');
        const matrix = new DOMMatrix([scale, 0, 0, scale, -VIEW.x * scale, wordTop - VIEW.y * scale]);
        for (const path of shown) letters.addPath(new Path2D(path.getAttribute('d')!), matrix);
        // the letters' top edge per column: the word filled once, read back once (a point test per pixel was ~30 000 calls)
        const columns = Math.ceil(width), rows = Math.ceil(height);
        probe.canvas.width = columns;
        probe.canvas.height = rows;
        probe.fill(letters, 'evenodd');
        const alpha = probe.getImageData(0, 0, columns, rows).data;
        const tops = new Float32Array(columns + 1).fill(height);
        for (let x = 0; x < columns; x++) {
          for (let y = Math.floor(wordTop); y < rows; y++) {
            if (alpha[(y * columns + x) * 4 + 3] > 127) {
              tops[x] = y;
              break;
            }
          }
        }
        laidWidth = width;
        geometry = { width, height, scale, wordTop, word: letters, surface: (x) => tops[Math.max(0, Math.min(tops.length - 1, Math.round(x)))] };
      };

      const draw = (dt: number) => {
        if (!scene || !geometry) return;
        scene.lamp = lamp.hover ? [(lamp.x - VIEW.x) * geometry.scale, geometry.wordTop + (lamp.y - VIEW.y) * geometry.scale] : null;
        bc.clearRect(0, 0, geometry.width, geometry.height);
        fc.clearRect(0, 0, geometry.width, geometry.height);
        scene.back?.(bc, dt, time);
        scene.front?.(fc, dt, time);
        // the home page fades from one direction to the next
        const opacity = String(scene.opacity ?? 1);
        if (back.style.opacity !== opacity) back.style.opacity = front.style.opacity = opacity;
      };
      const followArc = () => {
        const arc = scene?.arc ?? null;
        if (arc === lamp.arc) return;
        lamp.arc = arc;
        if (arc) {
          lamp.x = arc[0];
          lamp.y = arc[1];
        }
        setLamp();
        // the arc out under a resting mouse: the light goes back to the pointer
        if (!arc && lamp.hover) wake();
      };
      /** A new scene for the present size, run a little so it comes up going */
      const begin = (steps: number) => {
        layout();
        scene = make(geometry!);
        time = 0;
        for (let i = 0; i < steps; i++) {
          time += 1 / 60;
          draw(1 / 60);
        }
      };
      const pause = () => {
        cancelAnimationFrame(frame);
        frame = 0;
        if (host.dataset.scene === 'playing') host.dataset.scene = 'paused';
        // off the screen the arc lights nothing
        if (scene) scene.arc = null;
        followArc();
      };
      const tick = (now: number) => {
        const dt = Math.min(LONGEST_STEP, (now - last) / 1000 || 0);
        last = now;
        time += dt;
        draw(dt);
        followArc();
        frame = requestAnimationFrame(tick);
      };
      const resume = () => {
        if (frame) return;
        if (!scene) begin(WARM_UP_STEPS);
        host.dataset.scene = 'playing';
        last = performance.now();
        frame = requestAnimationFrame(tick);
      };
      /** Reduced motion: one frame of the scene, standing */
      const still = () => {
        begin(STILL_STEPS);
        if (scene) scene.arc = null;
        followArc();
        host.dataset.scene = 'still';
      };

      if (calm || stopped) still();
      // Runs while the scene's canvas is on the screen, and stops off it — the canvas, not the word: below 1181 px (a narrowed
      // window, a zoom past 125 %) CSS hides the canvas while the word stays, and the loop must not draw for nobody
      // (review 09.11; LiveScene.tsx observes its canvas for the same reason)
      let inView = false;
      const seen = new IntersectionObserver(([entry]) => {
        inView = entry.isIntersecting;
        if (calm || stopped) return;
        if (inView) resume();
        else pause();
      });
      seen.observe(front);
      let resized = 0;
      const sized = new ResizeObserver(() => {
        window.clearTimeout(resized);
        // a new width starts the scene again at the new size. Only a real change: the observer's first call, as it starts,
        // must not restart a scene that has just come up (review 08.11)
        resized = window.setTimeout(() => {
          if (!geometry || Math.abs(host.getBoundingClientRect().width - laidWidth) < 1) return;
          if (calm || stopped) still();
          else begin(WARM_UP_STEPS);
        }, 150);
      });
      sized.observe(host);

      // The stop, in the footer's legal line (SiteChrome): shown only where a scene moves, so never with reduced motion
      const toggle = host.closest('footer')?.querySelector<HTMLButtonElement>('[data-footer-motion]');
      const label = () => {
        if (toggle) toggle.textContent = stopped ? START_LABEL : STOP_LABEL;
      };
      const flip = () => {
        stopped = !stopped;
        writeStopped(stopped);
        label();
        if (stopped) {
          pause();
          still();
          lamp.hover = false;
          setLamp();
        } else {
          begin(WARM_UP_STEPS);
          if (inView) resume();
        }
      };
      if (toggle && !calm) {
        label();
        toggle.hidden = false;
        toggle.addEventListener('click', flip);
      }
      return () => {
        if (toggle) {
          toggle.removeEventListener('click', flip);
          toggle.hidden = true;
        }
        pause();
        seen.disconnect();
        sized.disconnect();
        window.clearTimeout(resized);
        canvases.forEach((canvas) => canvas.remove());
        delete host.dataset.scene;
      };
    }

    return () => {
      cancelled = true;
      cleanups.forEach((cleanup) => cleanup());
    };
  }, []);

  return null;
}
