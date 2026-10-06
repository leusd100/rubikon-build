import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const css = readFileSync(join(process.cwd(), 'app', 'zernoskhovyshcha', 'grain-planner.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const editorialCss = readFileSync(join(process.cwd(), 'app', 'zernoskhovyshcha', 'grain-editorial.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const nodeCss = readFileSync(join(process.cwd(), 'app', 'components', 'directions', 'direction-node.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

/** A selector list split at its own commas only — not at those inside :is(…), :not(…) or :where(…) */
function splitSelectorList(list: string) {
  const parts: string[] = [];
  let depth = 0;
  let part = '';
  for (const char of list) {
    if (char === '(') depth += 1;
    if (char === ')') depth -= 1;
    if (char === ',' && depth === 0) {
      parts.push(part);
      part = '';
    } else part += char;
  }
  return [...parts, part];
}

/** Every style rule's selectors, with the at-rule (if any) each sits in. Keyframe steps are skipped. */
function styleRuleSelectors(source: string) {
  const selectors: { selector: string; within: string | null }[] = [];
  const stack: string[] = [];
  let prelude = '';
  for (const char of source) {
    if (char === '{') {
      const head = prelude.trim();
      const parent = stack[stack.length - 1] ?? null;
      if (!head.startsWith('@') && !(parent ?? '').startsWith('@keyframes')) {
        for (const selector of splitSelectorList(head)) selectors.push({ selector: selector.trim(), within: parent });
      }
      stack.push(head);
      prelude = '';
    } else if (char === '}') {
      stack.pop();
      prelude = '';
    } else if (char === ';' && stack.length && !stack[stack.length - 1].startsWith('@')) {
      prelude = '';
    } else {
      prelude += char;
    }
  }
  return selectors;
}

describe('grain-planner.css', () => {
  const selectors = styleRuleSelectors(css);

  // Three roots: the two planner bands, and the phone handoff CTA — the one element the planner page
  // adds outside them, because nothing inside the planner may be fixed.
  it('scopes every selector to the planner bands or the handoff CTA', () => {
    expect(selectors.length).toBeGreaterThan(100);
    const roots = [/^\.grain-planner-root(?=[\s.:[>]|$)/, /^\.grain-result-band(?=[\s.:[>]|$)/, /^\.grain-handoff-cta(?=[\s.:[>]|$)/];
    const unscoped = selectors.filter(({ selector }) => !roots.some((root) => root.test(selector)));
    expect(unscoped).toEqual([]);
  });

  it('never uses !important', () => {
    expect(css).not.toContain('!important');
  });

  it('pulls in no Tailwind and no other stylesheet', () => {
    expect(css).not.toMatch(/@(?:tailwind|apply|import)\b/);
  });

  it('keeps motion behind prefers-reduced-motion: no-preference', () => {
    const animated = selectors.filter(({ selector }) => selector.length > 0);
    const declarations = css.match(/[^{}]*\{[^{}]*(?:animation|transition)\s*:[^{}]*\}/g) ?? [];
    for (const block of declarations) {
      const index = css.indexOf(block);
      const before = css.slice(0, index);
      const lastMotionQuery = before.lastIndexOf('@media (prefers-reduced-motion: no-preference)');
      expect(lastMotionQuery, `motion outside the no-preference query: ${block.trim().slice(0, 80)}`).toBeGreaterThan(-1);
    }
    expect(animated.length).toBeGreaterThan(0);
  });

  // Band 04's steps are the drawing tour's since 06.10 (DirectionNode): their small numbers keep the AA-safe dark accent,
  // and the grain page does not repaint them
  it('uses the AA-safe dark accent for small editorial step numbers', () => {
    expect(nodeCss).toMatch(/\.dn-step-index\s*\{[^}]*color:\s*var\(--color-accent-strong\)/);
    expect(editorialCss).not.toMatch(/\.dn-step-index[^{]*\{[^}]*color:/);
  });
});
