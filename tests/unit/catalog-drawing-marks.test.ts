import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CatalogDrawing } from '../../app/components/directions/CatalogDrawing';
import type { DirectionId } from '../../app/data/directions';

// MT-01 (Engineering Excellence, 27.10): the sheets' pointing rules sit behind HOME's card :has(), and Chrome keeps one
// invalidation set for every :has() on a page. A bare path or circle at the end of such a rule put those tags into it,
// and every DOM insertion restyled HOME's SVG shapes: one span put into <main> restyled 455 elements, 33 once the rules
// end in a class. So the copper shapes carry .dsd-mark and the rules name them by it.

const DIRECTIONS: DirectionId[] = ['angary', 'zernoskhovyshcha', 'metalokonstruktsii', 'betonni-roboty', 'pokrivelni-roboty'];
const CSS = readFileSync(new URL('../../app/components/directions/catalog-drawing.css', import.meta.url), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '');

/** The selectors of every style rule in the sheet, one by one */
function selectors(css: string) {
  const found: string[] = [];
  for (const match of css.matchAll(/([^{}]+)\{/g)) {
    const prelude = match[1].trim();
    if (!prelude || prelude.startsWith('@') || /^(?:from|to|[\d.]+%)/.test(prelude)) continue;
    let depth = 0;
    let current = '';
    for (const char of prelude) {
      if (char === '(') depth += 1;
      if (char === ')') depth -= 1;
      if (char === ',' && depth === 0) { found.push(current.trim()); current = ''; } else current += char;
    }
    found.push(current.trim());
  }
  return found;
}

/** The last compound of a selector (after its last combinator outside parentheses), its pseudo-class arguments dropped */
function lastCompound(selector: string) {
  let depth = 0;
  let start = 0;
  [...selector].forEach((char, index) => {
    if (char === '(') depth += 1;
    else if (char === ')') depth -= 1;
    else if (depth === 0 && /[\s>+~]/.test(char)) start = index + 1;
  });
  let compound = selector.slice(start);
  while (/\([^()]*\)/.test(compound)) compound = compound.replace(/\([^()]*\)/g, '');
  return compound;
}

describe('catalogue sheets: the copper shapes are named by a class', () => {
  it.each(DIRECTIONS)('every shape of the %s sheet’s copper group carries .dsd-mark', (id) => {
    const markup = renderToStaticMarkup(createElement(CatalogDrawing, { id }));
    const groups = [...markup.matchAll(/<g class="dsd-accent">([\s\S]*?)<\/g>/g)];
    expect(groups.length).toBeGreaterThan(0);
    for (const [, inner] of groups) {
      const shapes = [...inner.matchAll(/<(?:path|circle)\b[^>]*>/g)].map(([tag]) => tag);
      expect(shapes.length).toBeGreaterThan(0);
      for (const shape of shapes) expect(shape, shape).toMatch(/class="[^"]*\bdsd-mark\b/);
    }
  });

  it('no rule behind a :has() ends in a bare tag', () => {
    const behindHas = selectors(CSS).filter((selector) => selector.includes(':has('));
    expect(behindHas.length).toBeGreaterThanOrEqual(13);
    const bare = behindHas.filter((selector) => !/[.#[]/.test(lastCompound(selector)));
    expect(bare).toEqual([]);
  });
});
