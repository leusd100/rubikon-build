import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';
import { Arrow, type ArrowWay } from '../../app/components/Arrow';

// The site's arrows are drawn (Arrow.tsx). An arrow that Unicode lists as an emoji — ↗, ↔ and their kin — is in none of
// the site's fonts, and iOS draws it from Apple Color Emoji: a blue tile in the copper call button (owner, 26.10). Only
// a text-presentation selector (U+FE0E) right after it keeps it a glyph.
const EMOJI_ARROW = /[↔-↙↩↪⤴⤵➡⬅-⬇](?!︎)/u;
const ENTITY = /&#(?:0*(?:8596|8597|8598|8599|8600|8601|8617|8618)|[xX]0*(?:2194|2195|2196|2197|2198|2199|21[aA]9|21[aA][aA]));|&(?:harr|varr|nwarr|nearr|searr|swarr|nearrow|UpperRightArrow|LeftRightArrow);/;
const hasEmojiArrow = (text: string) => EMOJI_ARROW.test(text) || ENTITY.test(text);

// Not on the live site: the grain planner's own page, /planner-preview, answers 404 (X-01), and these two lines are
// locked to the prototype's golden output (tests/unit/planner/grain/__golden__). Give them U+FE0E when the planner ships.
const NOT_LIVE: ReadonlyArray<readonly [file: string, text: string]> = [
  ['app/lib/planner/grain/brief.ts', 'Компактний майданчик ↔ фізичне розширення'],
  ['app/lib/planner/grain/understanding.ts', 'Компактність ↔ розширення'],
];

const blankComments = (text: string) => text.replace(/\/\*[\s\S]*?\*\/|<!--[\s\S]*?-->/g, (comment) => comment.replace(/[^\n]/g, ' '));
const lineOf = (source: string, offset: number) => source.slice(0, offset).split('\n').length;

/** Every place a source file would put an emoji arrow on a page, as file:line:text */
function emojiArrows(file: string, source: string): string[] {
  const found: string[] = [];
  const record = (text: string, offset: number) => {
    if (hasEmojiArrow(text)) found.push(`${file}:${lineOf(source, offset)}:${text.trim()}`);
  };
  if (file.endsWith('.css')) {
    for (const match of blankComments(source).matchAll(/\bcontent\s*:\s*([^;}]+)/gi)) {
      // CSS escapes (\2197) are the same character
      record(match[1].replace(/\\([\da-f]{1,6})\s?/gi, (_, hex: string) => String.fromCodePoint(parseInt(hex, 16))), match.index);
    }
  } else if (/\.(?:html|svg|json|txt)$/.test(file)) {
    const text = blankComments(file.endsWith('.json') ? source.replace(/\\u([\da-f]{4})/gi, (_, hex: string) => String.fromCharCode(parseInt(hex, 16))) : source);
    let offset = 0;
    for (const line of text.split('\n')) { record(line, offset); offset += line.length + 1; }
  } else {
    // String literals and JSX text, with JS escapes decoded; comments are not nodes, and a type union draws nothing
    const tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
    const visit = (node: ts.Node) => {
      if ((ts.isJsxText(node) || ts.isStringLiteralLike(node) || ts.isTemplateLiteralToken(node)) && !ts.isLiteralTypeNode(node.parent)) {
        record(node.text, node.getStart(tree));
      }
      ts.forEachChild(node, visit);
    };
    visit(tree);
  }
  return found;
}

function files(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) return files(file);
    return /\.(?:[cm]?[jt]sx?|css|html|svg|json|txt)$/.test(file) ? [file] : [];
  });
}

describe('arrows', () => {
  it('puts no emoji arrow on a page: the site draws its arrows', () => {
    const found = ['app', 'public'].flatMap(files).flatMap((file) => emojiArrows(file, readFileSync(file, 'utf8')));
    const live = found.filter((place) => !NOT_LIVE.some(([file, text]) => place.startsWith(`${file}:`) && place.includes(text)));
    expect(live, 'Use <Arrow to="…" /> (app/components/Arrow.tsx) instead of the character.').toEqual([]);
    expect(found).toHaveLength(NOT_LIVE.length);
  });

  it('finds the arrow in JSX text, escapes, templates, entities, data and CSS, and passes U+FE0E and comments', () => {
    for (const source of ['<a>Далі <span>↗</span></a>', String.raw`<a>{'↗'}</a>`, String.raw`<a>{'\u{2194}'}</a>`, '<a>{`Далі ↗ ${label}`}</a>',
      '<a>&#8599;</a>', '<a>&#x2197;</a>', '<a>&nearr;</a>', 'const links = [{ label: "Далі ↙" }];']) {
      expect(emojiArrows('example.tsx', source), source).toHaveLength(1);
    }
    expect(emojiArrows('links.json', String.raw`{"label":"Далі ↗"}`)).toHaveLength(1);
    expect(emojiArrows('index.html', '<a href="/">Далі ↗</a>')).toHaveLength(1);
    expect(emojiArrows('links.css', String.raw`.link::after { content: "\2197"; }`)).toHaveLength(1);
    expect(emojiArrows('links.css', '/* content: "↗"; */ .link::after { content: "→"; }')).toEqual([]);
    expect(emojiArrows('example.tsx', `
      // ↗ in a comment
      type Way = '↗' | '↓';
      const view = <><a href="#form">Далі ↓</a><p>плита → колона</p><b>{'↔︎'}</b>{/* ↗ */}<Arrow to="up-right" /></>;
    `)).toEqual([]);
  });

  it('draws every way as a hidden icon in its holder’s colour, with data-arrow for the arrow link’s nudge', () => {
    const ways: ArrowWay[] = ['up-right', 'down', 'up', 'right', 'left', 'left-right'];
    const drawings = new Set<string>();
    for (const to of ways) {
      const markup = renderToStaticMarkup(createElement(Arrow, { to, className: 'x' }));
      expect(markup, to).toMatch(new RegExp(`^<span class="x" aria-hidden="true" data-arrow="${to}"><svg [^>]*stroke="currentColor"[^>]*focusable="false"`));
      expect(markup, to).not.toMatch(/[←-⇿]|<text/);
      drawings.add(markup.replace(/^.*?<svg[^>]*>/, ''));
    }
    expect(drawings.size).toBe(ways.length);
  });
});
