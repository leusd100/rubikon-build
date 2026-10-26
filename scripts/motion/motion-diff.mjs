// Motion diff — proves that a refactor moved motion values without changing one. Compares the transition*/animation*
// declarations of every app/**/*.css in a base ref with the working tree, after variables are resolved and times and
// curves are normalised (`.2s` and `var(--motion-micro)` are the same entry), and prints what differs.
//
//   node scripts/motion/motion-diff.mjs [--base <ref>] [--expect-none]
//
// --base <ref>   the tree to compare with (default origin/main); its files are read with `git ls-tree` and `git show`.
// --expect-none  exit 1 when anything differs (the proof a token PR runs). Without it the exit code is 0 either way.
// Exit 2: the base ref or the repository could not be read.
//
// Per file the key of a declaration is `[@media … | @supports … | ]selector | property | value`, the value being
// normalizeMotion(resolveVars(value, defs)). `defs` = the custom properties that have exactly one value across
// app/globals.css + app/theme.css of the same tree, overridden by the file's own single-valued custom properties. A name
// the file declares two or more times is context-dependent and is dropped from `defs`, so it stays `var(--x)` and shows
// as a difference. A choreography name (`--<prefix>-for|at|curve-…`) is accepted only from a top-level `:root` rule: from
// any other rule, or inside @media/@supports, it stays unresolved too. The two ordered lists are compared per file; a
// file present on one side only is a difference unless it has no motion declarations.
//
// `:root` is one scope for every stylesheet, which a per-file comparison cannot see: when a name a motion declaration
// resolves through is declared with different values in different files, and that set of values is new or changed
// against the base, it is reported as a difference of its own (a collision), under the files' differences.
import { spawnSync } from 'node:child_process';
import { readFileSync, readdirSync, realpathSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { customPropertyDeclarations, motionDeclarations, normalizeMotion, resolveVars } from './css-motion.mjs';

const GLOBALS = 'app/globals.css';
const THEME = 'app/theme.css';

/**
 * The comparison keys of a stylesheet, one per motion declaration, in the order of the file.
 * @param {string} css
 * @param {Map<string, string>} defs
 * @returns {string[]}
 */
export function motionKeys(css, defs) {
  return motionDeclarations(css).map(({ selector, property, value, atRule }) =>
    [atRule, selector, property, normalizeMotion(resolveVars(value, defs))].filter((part) => part).join(' | '));
}

/** A choreography name (Motion v1): its file's own times, delays and curves, declared once in that file's `:root` */
const CHOREOGRAPHY = /^--[a-z0-9]+-(?:for|at|curve)-/;

/**
 * What the custom properties of some stylesheets may resolve to: `defs` holds the names with exactly one value, `blocked`
 * the names that must stay unresolved: several values, or a choreography name declared anywhere but a top-level `:root`
 * rule (a value in a nested scope or a media query is not the value every use sees).
 * @param {string[]} sheets
 * @returns {{ defs: Map<string, string>, blocked: Set<string> }}
 */
function definitions(sheets) {
  /** @type {Map<string, string[]>} */
  const values = new Map();
  /** @type {Set<string>} */
  const blocked = new Set();
  for (const sheet of sheets) {
    for (const { name, value, selector, atRule } of customPropertyDeclarations(sheet)) {
      if (CHOREOGRAPHY.test(name) && (atRule !== null || selector !== ':root')) blocked.add(name);
      else values.set(name, [...(values.get(name) ?? []), value]);
    }
  }
  for (const [name, list] of values) if (list.length > 1) blocked.add(name);
  return { defs: new Map([...values].filter(([name]) => !blocked.has(name)).map(([name, list]) => [name, list[0]])), blocked };
}

/**
 * The custom properties with exactly one value across the given stylesheets (globals.css and theme.css of one tree).
 * @param {string[]} sheets
 * @returns {Map<string, string>}
 */
export function sharedDefs(sheets) {
  return definitions(sheets).defs;
}

/**
 * The shared definitions as one file sees them: its own single-valued custom properties override them, and a name the
 * file declares twice (or a choreography name from the wrong scope) is dropped, so it cannot fall back to a shared value.
 * @param {Map<string, string>} shared
 * @param {string} css
 * @returns {Map<string, string>}
 */
export function fileDefs(shared, css) {
  const own = definitions([css]);
  const defs = new Map(shared);
  for (const name of own.blocked) defs.delete(name);
  for (const [name, value] of own.defs) defs.set(name, value);
  return defs;
}

/** The shared definitions of one tree: its globals.css and theme.css (a tree without them shares nothing) */
const treeDefs = (texts) => sharedDefs([GLOBALS, THEME].map((file) => texts.get(file) ?? ''));

/** Every custom property name that `value` reaches through `defs`, following the definitions of other variables */
function resolvedNames(value, defs, found = new Set()) {
  for (const [, name] of value.matchAll(/var\(\s*(--[\w-]+)/gi)) {
    if (!defs.has(name) || found.has(name)) continue;
    found.add(name);
    resolvedNames(/** @type {string} */ (defs.get(name)), defs, found);
  }
  return found;
}

/**
 * Names declared with different values in different stylesheets, which a motion declaration resolves through: `:root` is
 * one scope for the whole document, so the last declaration wins in every file, though each file read alone resolves its
 * own. Only a collision that is new in the head, or whose set of values changed against the base, is returned.
 * @param {Map<string, string>} baseTexts path → source
 * @param {Map<string, string>} headTexts path → source
 * @returns {{ name: string, declarations: { file: string, value: string }[] }[]}
 */
export function globalCollisions(baseTexts, headTexts) {
  /** @param {Map<string, string>} texts @returns {Map<string, { file: string, value: string }[]>} */
  const declaredBy = (texts) => {
    /** @type {Map<string, { file: string, value: string }[]>} */
    const byName = new Map();
    for (const [file, css] of texts) {
      for (const { name, value } of customPropertyDeclarations(css)) {
        const list = byName.get(name) ?? [];
        if (!list.some((entry) => entry.file === file && entry.value === value)) list.push({ file, value });
        byName.set(name, list);
      }
    }
    return byName;
  };
  const valueSet = (entries = []) => new Set(entries.map(({ value }) => normalizeMotion(value)));
  const baseDeclared = declaredBy(baseTexts);
  const headDeclared = declaredBy(headTexts);
  const shared = treeDefs(headTexts);
  /** @type {Set<string>} */
  const used = new Set();
  for (const css of headTexts.values()) {
    const defs = fileDefs(shared, css);
    for (const { value } of motionDeclarations(css)) resolvedNames(value, defs, used);
  }
  return [...used].sort().flatMap((name) => {
    const declarations = headDeclared.get(name) ?? [];
    const head = valueSet(declarations);
    const base = valueSet(baseDeclared.get(name));
    const unchanged = head.size === base.size && [...head].every((value) => base.has(value));
    return head.size < 2 || unchanged ? [] : [{ name, declarations }];
  });
}

/**
 * The difference between two ordered lists (longest common subsequence). Neighbouring removals and additions form one
 * hunk, and a hunk counts as max(removed, added) differences: a changed entry is one.
 * @param {string[]} base
 * @param {string[]} head
 * @returns {{ count: number, hunks: { removed: string[], added: string[] }[] }}
 */
export function diffLists(base, head) {
  const rows = base.length + 1;
  const cols = head.length + 1;
  const lcs = Array.from({ length: rows }, () => new Array(cols).fill(0));
  for (let i = base.length - 1; i >= 0; i--) {
    for (let j = head.length - 1; j >= 0; j--) {
      lcs[i][j] = base[i] === head[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }
  /** @type {{ removed: string[], added: string[] }[]} */
  const hunks = [];
  let open = null;
  const hunk = () => (open ??= { removed: [], added: [] });
  const close = () => { if (open) hunks.push(open); open = null; };
  let i = 0;
  let j = 0;
  while (i < base.length || j < head.length) {
    if (i < base.length && j < head.length && base[i] === head[j]) { close(); i++; j++; }
    else if (j >= head.length || (i < base.length && lcs[i + 1][j] >= lcs[i][j + 1])) hunk().removed.push(base[i++]);
    else hunk().added.push(head[j++]);
  }
  close();
  return { count: hunks.reduce((sum, { removed, added }) => sum + Math.max(removed.length, added.length), 0), hunks };
}

/** @param {string[]} argv @returns {{ base: string, expectNone: boolean }} */
export function parseArgs(argv) {
  const options = { base: 'origin/main', expectNone: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--expect-none') options.expectNone = true;
    else if (arg === '--base') options.base = argv[++i] ?? '';
    else if (arg.startsWith('--base=')) options.base = arg.slice('--base='.length);
    else throw new Error(`unknown argument ${arg}\nusage: node scripts/motion/motion-diff.mjs [--base <ref>] [--expect-none]`);
  }
  if (!options.base || options.base.startsWith('-')) throw new Error(`--base needs a git ref, got "${options.base}"`);
  return options;
}

/** @param {string[]} args @param {string} cwd @returns {string} stdout decoded as UTF-8 */
function git(args, cwd) {
  const run = spawnSync('git', args, { cwd, maxBuffer: 256 * 1024 * 1024 });
  if (run.error) throw run.error;
  if (run.status !== 0) throw new Error(`git ${args.join(' ')} failed: ${run.stderr.toString('utf8').trim()}`);
  return run.stdout.toString('utf8');
}

/** The .css files under app/ in the working tree, as repo-relative paths with "/" */
function currentFiles(root) {
  /** @type {string[]} */
  const files = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith('.css')) files.push(relative(root, full).split(sep).join('/'));
    }
  };
  walk(join(root, 'app'));
  return files.sort();
}

/** @param {number} n @param {[string, string, string]} forms one, few, many */
const plural = (n, [one, few, many]) => n % 10 === 1 && n % 100 !== 11 ? one
  : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14) ? few : many;

function main() {
  const { base, expectNone } = parseArgs(process.argv.slice(2));
  const root = git(['rev-parse', '--show-toplevel'], process.cwd()).trim();
  const baseFiles = git(['ls-tree', '-r', '--name-only', '-z', base, 'app'], root).split('\0').filter((file) => file.endsWith('.css'));
  const headFiles = currentFiles(root);
  const baseTexts = new Map(baseFiles.map((file) => [file, git(['show', `${base}:${file}`], root)]));
  const headTexts = new Map(headFiles.map((file) => [file, readFileSync(join(root, file), 'utf8')]));
  const baseShared = treeDefs(baseTexts);
  const headShared = treeDefs(headTexts);

  const names = [...new Set([...baseFiles, ...headFiles])].sort();
  const sha = git(['rev-parse', '--short', base], root).trim();
  console.log(`База ${base} (${sha}): ${baseFiles.length} CSS-файлів; поточне дерево: ${headFiles.length}`);

  let total = 0;
  for (const name of names) {
    const baseText = baseTexts.get(name);
    const headText = headTexts.get(name);
    const baseKeys = baseText === undefined ? [] : motionKeys(baseText, fileDefs(baseShared, baseText));
    const headKeys = headText === undefined ? [] : motionKeys(headText, fileDefs(headShared, headText));
    const { count, hunks } = diffLists(baseKeys, headKeys);
    if (count === 0) continue;
    total += count;
    const where = baseText === undefined ? ' (лише в поточному дереві)' : headText === undefined ? ' (лише в базі)' : '';
    console.log(`\n${name}${where}: ${count} ${plural(count, ['відмінність', 'відмінності', 'відмінностей'])}`);
    for (const { removed, added } of hunks) {
      for (const key of removed) console.log(`  - ${key}`);
      for (const key of added) console.log(`  + ${key}`);
    }
  }
  const collisions = globalCollisions(baseTexts, headTexts);
  if (collisions.length) {
    total += collisions.length;
    console.log(`\nЗмінні в :root, оголошені в кількох файлах з різними значеннями: ${collisions.length} ${plural(collisions.length, ['відмінність', 'відмінності', 'відмінностей'])}`);
    for (const { name, declarations } of collisions) console.log(`  ! ${name}: ${declarations.map(({ file, value }) => `${file} = ${value}`).join(', ')}`);
  }
  console.log(`\n${total} ${plural(total, ['відмінність', 'відмінності', 'відмінностей'])} у ${names.length} ${plural(names.length, ['файлі', 'файлах', 'файлах'])}`);
  if (expectNone && total > 0) process.exitCode = 1;
}

/** Whether this module is the script node was started with: node resolves symlinks for import.meta.url, not for argv[1] */
function isEntryPoint() {
  try {
    return Boolean(process.argv[1]) && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
}

if (isEntryPoint()) {
  try {
    main();
  } catch (error) {
    console.error(`motion-diff: ${error instanceof Error ? error.message : error}`);
    process.exitCode = 2;
  }
}
