'use client';

import { useEffect } from 'react';
import type { FooterScene, WordGeometry } from './footerScenes';

// What moves on the footer's embossed RUBIKON (owner 08.11, «Один раз і застигає»):
// - the lamp: where a mouse moves over the footer, a point light rakes the letters (FooterSignature's lamp pass). Only a
//   fine pointer and motion allowed, as MaterialLight; a phone keeps the band of light that crosses the word once (motion.css).
// - on three pages the page's own scene plays once on the word as the footer comes up and stops at its trace
//   (footerScenes.ts), from 1181 px as the page scenes (LiveScene.tsx). Coming back to the footer plays it again. With
//   reduced motion the trace is drawn at once, without the play. Nothing is fetched on the other pages.

/** The pages with a footer scene: the <main> classes FOOTER_SCENES knows (tests/unit/footer-scenes.test.ts holds them equal) */
export const FOOTER_SCENE_PAGES = ['roofing-page', 'metal-page', 'concrete-page'] as const;
const DESKTOP = '(min-width: 1181px)';
/** The scene canvas reaches this far above the word (--footer-scene-head in globals.css), for the rain and the sparks */
const HEAD = 120;
/** viewBox of the signature: x from 521, y from 140, 802 wide */
const VIEW = { x: 521, y: 140, width: 802 };
const LONGEST_STEP = 1 / 20;
/** With reduced motion, or to redraw the trace at a new size: the scene run to its end at once, at most this many steps */
const SETTLE_STEPS = 900;
/** The lamp's z over the letters: low for the arc, so the light falls on the letters around it */
const LAMP_Z = 46;
const ARC_Z = 22;

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

    // ——— the lamp ———
    const lamp = { x: 700, y: 150, tx: 700, ty: 150, hover: false, arc: null as [number, number] | null, frame: 0 };
    let onLampMove: () => void = () => {};
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
      onLampMove();
      if (Math.abs(tx - lamp.x) > .3 || Math.abs(ty - lamp.y) > .3) lamp.frame = requestAnimationFrame(glide);
    };
    const wake = () => {
      if (!lamp.frame) lamp.frame = requestAnimationFrame(glide);
    };
    if (fine && !calm) {
      const move = (event: PointerEvent) => {
        if (event.pointerType !== 'mouse') return;
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
    const page = FOOTER_SCENE_PAGES.find((name) => document.querySelector(`main.${name}`));
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
      const contexts = canvases.map((canvas) => canvas.getContext('2d'));
      const probe = document.createElement('canvas').getContext('2d');
      const [bc, fc] = contexts;
      if (!bc || !fc || !probe) return () => canvases.forEach((canvas) => canvas.remove());

      let geometry: WordGeometry | null = null;
      let scene: FooterScene | null = null;
      let time = 0, frame = 0, last = 0;

      const layout = () => {
        const box = signature.getBoundingClientRect();
        const width = box.width, height = box.height + HEAD, ratio = Math.min(2, window.devicePixelRatio || 1);
        for (const [index, canvas] of canvases.entries()) {
          canvas.width = Math.round(width * ratio);
          canvas.height = Math.round(height * ratio);
          contexts[index]!.setTransform(ratio, 0, 0, ratio, 0, 0);
          contexts[index]!.lineCap = 'round';
        }
        const scale = width / VIEW.width;
        const word = new Path2D();
        word.addPath(new Path2D(signature.querySelector('path')!.getAttribute('d')!), new DOMMatrix([scale, 0, 0, scale, -VIEW.x * scale, HEAD - VIEW.y * scale]));
        // the letters' top edge per column, read once per size
        const tops = new Float32Array(Math.ceil(width) + 1).fill(height);
        for (let x = 0; x < tops.length; x++) {
          for (let y = Math.floor(HEAD); y < height; y++) {
            if (probe.isPointInPath(word, x, y)) {
              tops[x] = y;
              break;
            }
          }
        }
        geometry = { width, height, scale, wordTop: HEAD, word, surface: (x) => tops[Math.max(0, Math.min(tops.length - 1, Math.round(x)))] };
      };

      const draw = (dt: number) => {
        if (!scene || !geometry) return;
        scene.lamp = lamp.hover ? [(lamp.x - VIEW.x) * geometry.scale, HEAD + (lamp.y - VIEW.y) * geometry.scale] : null;
        bc.clearRect(0, 0, geometry.width, geometry.height);
        fc.clearRect(0, 0, geometry.width, geometry.height);
        scene.back?.(bc, dt, time);
        scene.front?.(fc, dt, time);
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
      };
      const stop = () => {
        cancelAnimationFrame(frame);
        frame = 0;
      };
      const tick = (now: number) => {
        const dt = Math.min(LONGEST_STEP, (now - last) / 1000 || 0);
        last = now;
        time += dt;
        draw(dt);
        followArc();
        if (scene?.done(time)) {
          host.dataset.scene = 'rest';
          frame = 0;
          return;
        }
        frame = requestAnimationFrame(tick);
      };
      const play = () => {
        stop();
        if (!geometry) layout();
        scene = make(geometry!);
        time = 0;
        host.dataset.scene = 'playing';
        last = performance.now();
        frame = requestAnimationFrame(tick);
      };
      /** The trace at once: the scene run to its end without a frame on the screen */
      const settle = () => {
        stop();
        layout();
        scene = make(geometry!);
        time = 0;
        for (let i = 0; i < SETTLE_STEPS && !scene.done(time); i++) {
          time += 1 / 60;
          draw(1 / 60);
        }
        scene.arc = null;
        followArc();
        host.dataset.scene = 'rest';
      };
      // the trace at rest answers the lamp (the rain's beads glint): redrawn as it moves, nothing simulated
      onLampMove = () => {
        if (!frame && host.dataset.scene === 'rest') draw(0);
      };

      if (calm) settle();
      const seen = new IntersectionObserver(([entry]) => {
        if (calm) return;
        if (entry.isIntersecting) play();
        else stop();
      }, { threshold: .5 });
      seen.observe(signature);
      let resized = 0;
      const sized = new ResizeObserver(() => {
        window.clearTimeout(resized);
        // a new width redraws the trace at once rather than replaying the scene under the visitor
        // (the first call, as the observer starts, finds nothing played yet: the size is read when the scene first plays)
        resized = window.setTimeout(() => {
          if (host.dataset.scene) settle();
          else geometry = null;
        }, 150);
      });
      sized.observe(host);
      return () => {
        stop();
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
