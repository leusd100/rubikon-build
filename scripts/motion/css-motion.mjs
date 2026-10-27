// CSS motion parser — reads the transition*/animation* declarations of a stylesheet and the custom properties that
// supply them, and puts a value in a normal form, so two spellings of one motion compare equal (`.3s` and `300ms`,
// `var(--motion-ui)` and the time behind it). Dependency-free: a bracket scanner that knows strings, comments, escapes
// and parentheses, not a full CSS grammar. Built for Motion v1 (M1-1), which moves literal times and curves into tokens
// without changing a value; scripts/motion/motion-diff.mjs uses it to prove that.
//
//   import { motionDeclarations, normalizeMotion, resolveVars } from './css-motion.mjs';
//
// Limits, on purpose: only @media and @supports preludes are part of a declaration's `atRule` (@container and @layer are
// transparent), selectors of native CSS nesting are joined by `&` substitution, and the contents of @keyframes,
// @font-face, @property and @page are skipped.

/** @typedef {{ selector: string, property: string, value: string, atRule: string | null }} Declaration */

const MOTION_PROPERTY = /^(transition|animation)(-[a-z-]+)?$/;
const PROPERTY_NAME = /^(?:--[^\s:;{}]+|-?[a-z][a-z0-9-]*)$/i;
const OPAQUE_AT_RULES = new Set(['font-face', 'property', 'page', 'counter-style', 'font-feature-values', 'font-palette-values',
  'position-try', 'view-transition']);
const NUMBER = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i;
/** A time: not glued to a name (`fade-2s`, `h1s`), with a sign and a leading dot allowed */
const TIME = /(?<![\w.-])([+-]?(?:\d+\.?\d*|\.\d+))(ms|s)(?![\w-])/gi;

/** Whitespace folded to single spaces outside strings, trimmed */
function foldSpace(text) {
  let out = '';
  let quote = null;
  let pendingSpace = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quote) {
      out += ch;
      if (ch === '\\' && i + 1 < text.length) out += text[++i];
      else if (ch === quote || ch === '\n') quote = null;
      continue;
    }
    if (/\s/.test(ch)) { pendingSpace = out !== ''; continue; }
    if (pendingSpace) { out += ' '; pendingSpace = false; }
    if (ch === '"' || ch === "'") quote = ch;
    out += ch;
  }
  return out;
}

/** Index of the `)` that closes the `(` at `open`, or -1. Strings and escapes are skipped. */
function findClose(text, open) {
  let depth = 0;
  let quote = null;
  for (let i = open; i < text.length; i++) {
    const ch = text[i];
    if (quote) {
      if (ch === '\\') i++;
      else if (ch === quote || ch === '\n') quote = null;
      continue;
    }
    if (ch === '\\') i++;
    else if (ch === '"' || ch === "'") quote = ch;
    else if (ch === '(') depth++;
    else if (ch === ')' && --depth === 0) return i;
  }
  return -1;
}

/** Positions of the commas that sit at the top level of `text` (not inside parentheses or strings) */
function topLevelCommas(text) {
  const at = [];
  let depth = 0;
  let quote = null;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quote) {
      if (ch === '\\') i++;
      else if (ch === quote || ch === '\n') quote = null;
      continue;
    }
    if (ch === '\\') i++;
    else if (ch === '"' || ch === "'") quote = ch;
    else if (ch === '(') depth++;
    else if (ch === ')') depth = Math.max(0, depth - 1);
    else if (ch === ',' && depth === 0) at.push(i);
  }
  return at;
}

/** Calls of the function `name(...)` in `text`, each replaced by `rewrite(inner, whole)` (nested parentheses respected) */
function rewriteCalls(text, name, rewrite) {
  const call = new RegExp(`(?<![\\w-])${name}\\(`, 'gi');
  let out = '';
  let last = 0;
  let match;
  while ((match = call.exec(text))) {
    const open = match.index + name.length;
    const close = findClose(text, open);
    if (close === -1) break;
    out += text.slice(last, match.index) + rewrite(text.slice(open + 1, close), text.slice(match.index, close + 1));
    last = close + 1;
    call.lastIndex = last;
  }
  return out + text.slice(last);
}

/**
 * The source without comments (each becomes one space). A `/*` inside a string stays; an unterminated comment runs to
 * the end of the file.
 * @param {string} css
 * @returns {string}
 */
export function stripComments(css) {
  let out = '';
  let quote = null;
  for (let i = 0; i < css.length; i++) {
    const ch = css[i];
    if (quote) {
      out += ch;
      if (ch === '\\' && i + 1 < css.length) out += css[++i];
      else if (ch === quote || ch === '\n') quote = null;
      continue;
    }
    if (ch === '/' && css[i + 1] === '*') {
      out += ' ';
      const end = css.indexOf('*/', i + 2);
      if (end === -1) break;
      i = end + 1;
      continue;
    }
    if (ch === '\\' && i + 1 < css.length) { out += ch + css[++i]; continue; }
    if (ch === '"' || ch === "'") quote = ch;
    out += ch;
  }
  return out;
}

/** Selector of a rule nested in `parent`: `&` stands for the parent, otherwise the child is a descendant */
const nestSelector = (parent, child) => !parent ? child : child.includes('&') ? child.replaceAll('&', parent) : `${parent} ${child}`;

/**
 * Every declaration of the stylesheet, in the order of the file, with the selector of its rule and the @media/@supports
 * preludes around it. The contents of @keyframes and of the descriptor at-rules (@font-face, @property, @page) are skipped.
 * @param {string} source
 * @returns {Declaration[]}
 */
function declarations(source) {
  const css = stripComments(source);
  /** @type {Declaration[]} */
  const found = [];
  /** @type {{ selector: string, atRules: string[], opaque: boolean }[]} */
  const stack = [{ selector: '', atRules: [], opaque: false }];
  const top = () => stack[stack.length - 1];
  let buffer = '';
  let parens = 0;
  let quote = null;
  let valueBraces = 0;

  const declaration = (text) => {
    const trimmed = text.trim();
    const frame = top();
    if (!trimmed || trimmed.startsWith('@') || frame.opaque) return;
    const colon = trimmed.indexOf(':');
    if (colon < 1) return;
    const name = trimmed.slice(0, colon).trim();
    if (!PROPERTY_NAME.test(name)) return;
    found.push({
      selector: frame.selector,
      property: name.startsWith('--') ? name : name.toLowerCase(),
      value: foldSpace(trimmed.slice(colon + 1)),
      atRule: frame.atRules.length ? frame.atRules.join(' | ') : null,
    });
  };

  const open = (prelude) => {
    const parent = top();
    const text = foldSpace(prelude);
    const at = /^@([a-z-]+)/i.exec(text);
    if (!at) {
      stack.push({ selector: nestSelector(parent.selector, text), atRules: parent.atRules, opaque: parent.opaque });
      return;
    }
    const keyword = at[1].toLowerCase();
    if (parent.opaque || keyword.endsWith('keyframes') || OPAQUE_AT_RULES.has(keyword)) {
      stack.push({ ...parent, opaque: true });
    } else if (keyword === 'media' || keyword === 'supports') {
      stack.push({ ...parent, atRules: [...parent.atRules, `@${keyword} ${text.slice(at[0].length).trim()}`.trim()] });
    } else {
      stack.push({ ...parent });
    }
  };

  for (let i = 0; i < css.length; i++) {
    const ch = css[i];
    if (quote) {
      buffer += ch;
      if (ch === '\\' && i + 1 < css.length) buffer += css[++i];
      else if (ch === quote || ch === '\n') quote = null;
      continue;
    }
    if (ch === '\\') { buffer += ch + (css[++i] ?? ''); continue; }
    if (ch === '"' || ch === "'") { quote = ch; buffer += ch; continue; }
    if (valueBraces > 0) {
      buffer += ch;
      if (ch === '{') valueBraces++;
      else if (ch === '}') valueBraces--;
      continue;
    }
    if (ch === '(') { parens++; buffer += ch; continue; }
    if (ch === ')') { parens = Math.max(0, parens - 1); buffer += ch; continue; }
    if (parens > 0) { buffer += ch; continue; }
    if (ch === '{') {
      if (/^\s*--[^\s:;{}]+\s*:/.test(buffer)) { valueBraces = 1; buffer += ch; continue; } // `--x: {…}` is a value, not a block
      open(buffer);
      buffer = '';
    } else if (ch === '}') {
      declaration(buffer);
      buffer = '';
      if (stack.length > 1) stack.pop();
    } else if (ch === ';') {
      declaration(buffer);
      buffer = '';
    } else {
      buffer += ch;
    }
  }
  return found;
}

/**
 * The transition and animation declarations (a property matching `^(transition|animation)(-[a-z-]+)?$`), in the order of the
 * file. `atRule` joins the enclosing @media/@supports preludes, outermost first, with " | ", each with its at-keyword
 * (`@media (min-width: 761px) | @supports (selector(:has(*)))`); null when there is none. The contents of @keyframes are skipped.
 * @param {string} css
 * @returns {Declaration[]}
 */
export function motionDeclarations(css) {
  return declarations(css).filter(({ property }) => MOTION_PROPERTY.test(property));
}

/**
 * Every declaration of a custom property (`--*`), in the order of the file, with the selector of its rule and the
 * enclosing @media/@supports preludes (the same `atRule` as motionDeclarations): where a variable is declared decides
 * where it applies, so a caller that resolves variables needs the scope, not only the value.
 * @param {string} css
 * @returns {{ name: string, value: string, selector: string, atRule: string | null }[]}
 */
export function customPropertyDeclarations(css) {
  return declarations(css)
    .filter(({ property }) => property.startsWith('--'))
    .map(({ property, value, selector, atRule }) => ({ name: property, value, selector, atRule }));
}

/**
 * Every value of every custom property (`--*`) in the file, in the order of the file.
 * @param {string} css
 * @returns {Map<string, string[]>}
 */
export function customProperties(css) {
  /** @type {Map<string, string[]>} */
  const props = new Map();
  for (const { name, value } of customPropertyDeclarations(css)) {
    const values = props.get(name);
    if (values) values.push(value);
    else props.set(name, [value]);
  }
  return props;
}

const PLAIN_NUMBER = /^[+-]?(?:\d+\.?\d*|\.\d+)$/;

/** @param {string} value @param {Map<string, string>} defs @param {Set<string>} expanding */
function expand(value, defs, expanding) {
  return rewriteCalls(value, 'var', (inner, whole) => {
    const comma = topLevelCommas(inner)[0];
    const name = (comma === undefined ? inner : inner.slice(0, comma)).trim();
    const fallback = comma === undefined ? undefined : inner.slice(comma + 1).trim();
    if (defs.has(name) && !expanding.has(name)) return expand(/** @type {string} */ (defs.get(name)), defs, new Set(expanding).add(name));
    if (fallback === undefined || defs.has(name)) return whole;
    const resolved = expand(fallback, defs, expanding);
    // `var(--i, 0)`: a plain-number fallback marks an index the page sets itself (inline style), so the variable stays
    if (PLAIN_NUMBER.test(resolved)) return resolved === fallback ? whole : `var(${name}, ${resolved})`;
    return resolved;
  });
}

/**
 * `var(--x[, fallback])` replaced by its value, recursively. A variable defined in `defs` takes its definition; an unknown
 * one takes its fallback, except a plain-number fallback (`var(--i, 0)`, a per-element index set outside the stylesheet),
 * which keeps the whole `var()`; an unknown one without a fallback stays as it is, and so does a variable that names itself.
 * @param {string} value
 * @param {Map<string, string>} defs
 * @returns {string}
 */
export function resolveVars(value, defs) {
  return expand(value, defs, new Set());
}

/** A time in ms as a plain number: no float noise (`0.07s` is 70, not 70.00000000000001), no `-0` */
const formatMs = (ms) => String(Number(ms.toPrecision(12)) || 0);
const toMs = (amount, unit) => unit.toLowerCase() === 's' ? Number(amount) * 1000 : Number(amount);

/**
 * The normal form of a motion value: lowercase, whitespace folded, every time in ms (`.3s` → `300ms`, `-0.4s` → `-400ms`,
 * `.01ms` → `0.01ms`), `cubic-bezier(.30, .7,.2,1)` → `cubic-bezier(0.3,0.7,0.2,1)`, list commas as ", ".
 * @param {string} value
 * @returns {string}
 */
export function normalizeMotion(value) {
  const folded = foldSpace(value).toLowerCase()
    .replace(/\s*,\s*/g, ', ')
    .replace(/\(\s+/g, '(')
    .replace(/\s+\)/g, ')')
    .trim();
  const curves = rewriteCalls(folded, 'cubic-bezier', (inner) => {
    const commas = topLevelCommas(inner);
    const args = [0, ...commas.map((at) => at + 1)].map((from, index) => inner.slice(from, commas[index] ?? inner.length).trim());
    return `cubic-bezier(${args.map((arg) => NUMBER.test(arg) ? String(Number(arg)) : arg).join(',')})`;
  });
  return curves.replace(TIME, (_, amount, unit) => `${formatMs(toMs(amount, unit))}ms`);
}

/**
 * The times written in a value, as written and in order, one per occurrence (inside calc() and var() fallbacks too),
 * apart from zero and the `.01ms` of reduced motion.
 * @param {string} value
 * @returns {string[]}
 */
export function timeLiterals(value) {
  return [...value.matchAll(TIME)]
    .filter(([, amount, unit]) => {
      const ms = toMs(amount, unit);
      return ms !== 0 && Math.abs(ms - 0.01) > 1e-9;
    })
    .map(([literal]) => literal);
}
