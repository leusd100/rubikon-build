import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

// Typography v1.1 (14.10): Fixel Display replaces Jost for the display role; every brand face has metric fallbacks for
// macOS/Windows (Arial), Linux (Liberation, DejaVu) and Android (Roboto), split by script where the widths differ.

const fonts = path.join(process.cwd(), 'app/fonts');
const read = (file: string) => readFileSync(path.join(fonts, file), 'utf8');

type Face = { family: string; weight: string; display: string; src: string; ranges: Array<[number, number]>; sizeAdjust: string };

const facesOf = (css: string): Face[] =>
  [...css.matchAll(/@font-face\s*\{([^}]*)\}/g)].map(([, body]) => {
    const descriptor = (name: string) => body.match(new RegExp(`${name}:\\s*([^;]+);`))?.[1].trim() ?? '';
    return {
      family: descriptor('font-family').replace(/['"]/g, ''),
      weight: descriptor('font-weight'),
      display: descriptor('font-display'),
      src: descriptor('src'),
      sizeAdjust: descriptor('size-adjust'),
      ranges: descriptor('unicode-range')
        .split(',')
        .filter(Boolean)
        .map((range) => {
          const [start, end = start] = range.trim().replace(/^U\+/i, '').split('-');
          return [parseInt(start, 16), parseInt(end, 16)] as [number, number];
        }),
    };
  });

const covers = (face: Face, text: string) =>
  [...text].every((char) => face.ranges.some(([start, end]) => (char.codePointAt(0) ?? 0) >= start && (char.codePointAt(0) ?? 0) <= end));

const display = facesOf(read('fixel-display.css')).filter(({ family }) => family === 'Fixel Display');
const fallbacks = facesOf(read('fallback-metrics.css'));
const ukrainianAlphabet = 'АБВГҐДЕЄЖЗИІЇЙКЛМНОПРСТУФХЦЧШЩЬЮЯабвгґдеєжзиіїйклмнопрстуфхцчшщьюя№₴';
// What the site's headings set besides letters: digits, ’ apostrophe, quotes, dashes, the no-break space.
const latinAndPunctuation = 'AZaz09’«»“”—–… ';

describe('self-hosted Fixel Display (display role)', () => {
  it('declares the whole Ukrainian alphabet in the Cyrillic subset and Latin + heading punctuation in the Latin one', () => {
    expect(display.find((face) => covers(face, ukrainianAlphabet))?.src).toMatch(/FixelDisplay-Regular-Cyrillic\.woff2/);
    expect(display.find((face) => covers(face, latinAndPunctuation))?.src).toMatch(/FixelDisplay-Regular-Latin\.woff2/);
  });

  it('ships only weight 400, swaps instead of blocking text, and serves committed files within budget', () => {
    expect(display).toHaveLength(2);
    for (const face of display) {
      expect(face.weight).toBe('400');
      expect(face.display).toBe('swap');
      const file = path.join(fonts, face.src.match(/url\('\.\/([^']+)'\)/)?.[1] ?? '');
      expect(existsSync(file)).toBe(true);
    }
    // Jost's two Google subsets were 36 KB; Fixel's must not be heavier (Latin 24 220 B, Cyrillic 11 472 B).
    const total = display.reduce((sum, face) => sum + statSync(path.join(fonts, face.src.match(/url\('\.\/([^']+)'\)/)?.[1] ?? '')).size, 0);
    expect(total).toBeLessThanOrEqual(36 * 1024);
  });

  it('keeps the OFL licence and the provenance next to the files', () => {
    expect(read('fixel-display/OFL.txt')).toMatch(/SIL OPEN FONT LICENSE Version 1\.1/);
    expect(read('fixel-display/OFL.txt')).toMatch(/MacPaw/);
    const readme = read('fixel-display/README.md');
    for (const file of readdirSync(path.join(fonts, 'fixel-display')).filter((name) => name.endsWith('.woff2'))) {
      expect(readme).toContain(file);
    }
    expect(readme).toMatch(/github\.com\/macpaw\/fixel/);
  });

  it('puts the display stack on :root with its own metric fallbacks', () => {
    expect(read('fixel-display.css')).toMatch(/--font-display:\s*'Fixel Display', 'Fixel Display Fallback Arial-metric', 'Fixel Display Fallback Roboto', 'Fixel Display Fallback DejaVu'/);
  });
});

describe('metric fallbacks', () => {
  it.each(['Arial-metric', 'Roboto', 'DejaVu'])('Fixel Display has a Cyrillic and a Latin face for %s, Latin declared last', (system) => {
    const faces = fallbacks.filter(({ family }) => family === `Fixel Display Fallback ${system}`);
    expect(faces).toHaveLength(2);
    expect(covers(faces[0], 'Їжак')).toBe(true);
    expect(covers(faces[1], 'Steel')).toBe(true);
    expect(faces[0].sizeAdjust).not.toBe(faces[1].sizeAdjust);
  });

  it.each([
    ['Manrope Fallback Arial-metric'], ['Manrope Fallback Roboto'], ['Manrope Fallback DejaVu'],
    ['IBM Plex Sans Condensed Fallback Arial-metric'], ['IBM Plex Sans Condensed Fallback Roboto'], ['IBM Plex Sans Condensed Fallback DejaVu'],
  ])('declares %s with its own size-adjust', (family) => {
    const faces = fallbacks.filter((face) => face.family === family);
    expect(faces.length).toBeGreaterThan(0);
    for (const face of faces) expect(face.sizeAdjust).toMatch(/^\d+(\.\d+)?%$/);
  });

  it('wires the support faces into their stacks', () => {
    expect(readFileSync(path.join(process.cwd(), 'app/layout.tsx'), 'utf8')).toMatch(/fallback: \['Manrope Fallback Arial-metric', 'Manrope Fallback Roboto', 'Manrope Fallback DejaVu'\]/);
    expect(read('ibm-plex-sans-condensed.css')).toMatch(/--font-condensed:[^;]*'IBM Plex Sans Condensed Fallback Arial-metric',\s*'IBM Plex Sans Condensed Fallback Roboto', 'IBM Plex Sans Condensed Fallback DejaVu'/);
  });
});

describe('Jost is gone', () => {
  it('is neither loaded nor named anywhere in the app', () => {
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (/\.(tsx?|css)$/.test(entry.name)) files.push(full);
      }
    };
    walk(path.join(process.cwd(), 'app'));
    // Comments may still tell the history; code may not load or name the face.
    const code = (file: string) => readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    expect(files.filter((file) => /\bJost\b/.test(code(file)))).toEqual([]);
  });
});

describe('display sizing tokens', () => {
  const globals = readFileSync(path.join(process.cwd(), 'app/globals.css'), 'utf8');

  it('sizes the direction titles and hero H1s from --display-fit instead of per-breakpoint numbers', () => {
    expect(globals).toMatch(/--display-fit:\s*9\.23;/);
    expect(globals).toMatch(/calc\(\(100cqi \+ var\(--title-overhang\)\) \/ var\(--display-fit\)\)/);
    expect(globals).toMatch(/\.subhero h1, \.service-subhero h1 \{ font-size: min\(var\(--hero-title\), calc\(100cqi \/ var\(--display-fit\)\)\); \}/);
    // Section titles (PDO-05): on a phone 28–32 px in rem, never larger than the phone H1; from 761 px a 38 px floor
    expect(globals).toMatch(/--title-section: clamp\(1\.75rem, 7\.4vw, 2rem\);/);
    expect(globals).toMatch(/--title-section: clamp\(2\.375rem, 4\.5vw, 4\.5rem\);/);
    expect(globals).not.toMatch(/--display-phone-scale/);
    // The Jost-era fixed sizes for 320 px are gone: the token covers them.
    expect(globals).not.toMatch(/\.subhero h1, \.service-subhero h1 \{ font-size: 36px; \}/);
    expect(readFileSync(path.join(process.cwd(), 'app/home-v2.css'), 'utf8')).not.toMatch(/10\.9vw - 11\.6px/);
  });
});
