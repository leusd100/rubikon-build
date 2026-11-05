import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createContext, runInContext } from 'node:vm';
import { describe, expect, it } from 'vitest';

const ROUTES = ['home', 'napryamky', 'angary', 'zernoskhovyshcha', 'metalokonstruktsii', 'betonni-roboty', 'pokrivelni-roboty', 'yak-pratsyuiemo', 'pro-nas'];
const GALLERIES = ['photo-depth', 'soft-light'] as const;

type Node = {
  value: string;
  src: string;
  href: string;
  dataset: Record<string, string>;
  onclick?: () => void;
  onchange?: () => void;
  setAttribute: (name: string, value: unknown) => void;
  classList: { toggle: (name: string, on: boolean) => void };
};

function openGallery(name: (typeof GALLERIES)[number]) {
  const html = readFileSync(resolve('design-assets/reviews/architectural-daylight', name, 'index.html'), 'utf8');
  const script = /<script\b[^>]*>([\s\S]*?)<\/script\s*>/i.exec(html)?.[1];
  if (!script) throw new Error(`Gallery script missing: ${name}`);
  const nodes = new Map<string, Node>();
  const get = (id: string): Node => {
    if (!nodes.has(id)) nodes.set(id, {
      value: id === 'route' ? 'napryamky' : '', src: '', href: '', dataset: {},
      setAttribute() {}, classList: { toggle() {} },
    });
    return nodes.get(id)!;
  };
  const widths = [1440, 390].map((width) => ({ ...get(`width-${width}`), dataset: { pageW: String(width) } }));
  const document = {
    getElementById: get,
    querySelectorAll: (selector: string) => selector === '[data-page-w]' ? widths : [],
  };
  runInContext(script, createContext({ document }));
  return {
    choose(route: string, width: number) {
      const button = widths.find((node) => node.dataset.pageW === String(width));
      button?.onclick?.();
      get('route').value = route;
      get('route').onchange?.();
      const ids = name === 'photo-depth' ? ['page-before', 'page-after'] : ['page'];
      return ids.map((id) => ({ src: get(id).src, href: get(`${id}-link`).href }));
    },
  };
}

for (const name of GALLERIES) describe(`${name} gallery URLs`, () => {
  it('keeps every approved route and viewport reachable', () => {
    const gallery = openGallery(name);
    for (const route of ROUTES) for (const width of [1440, 390]) {
      const actual = gallery.choose(route, width);
      const files = name === 'photo-depth'
        ? [`${route}--${width}--before.webp`, `${route}--${width}--after.webp`]
        : [`${route}--1440--after.webp`];
      expect(actual, `${route} at ${width}`).toEqual(files.map((file) => ({ src: file, href: file })));
    }
  });

  it.each(['javascript:alert(1)//', 'data:text/html,<script>alert(1)</script>', '//attacker.example/image', '../outside', 'constructor', '__proto__', 'toString', ''])('uses the default image for unapproved route %j', (route) => {
    const gallery = openGallery(name);
    for (const width of [1440, 390]) {
      const actual = gallery.choose(route, width);
      const files = name === 'photo-depth'
        ? [`napryamky--${width}--before.webp`, `napryamky--${width}--after.webp`]
        : ['napryamky--1440--after.webp'];
      expect(actual).toEqual(files.map((file) => ({ src: file, href: file })));
    }
  });
});
