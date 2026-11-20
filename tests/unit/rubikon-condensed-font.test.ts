import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { brotliDecompressSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';

// Rubikon Condensed: IBM Plex Sans Condensed 3.000 subset to the site's characters and renamed (owner, 20.11). Plex's
// licence reserves the name "Plex", which a subset may not carry; the subset must not cost the site a glyph either.

const fontDirectory = path.join(process.cwd(), 'app/fonts');
const css = readFileSync(path.join(fontDirectory, 'rubikon-condensed.css'), 'utf8');

type Range = [number, number];
type Face = { family: string; weight: string; display: string; src: string; ranges: Range[] };

const parseRanges = (list: string): Range[] => list.split(',').filter((part) => part.trim()).map((part) => {
  const [start, end = start] = part.trim().replace(/^U\+/i, '').split('-');
  return [Number.parseInt(start, 16), Number.parseInt(end, 16)];
});

const faces: Face[] = [...css.matchAll(/@font-face\s*\{([^}]*)\}/g)].map(([, body]) => {
  const descriptor = (name: string) => new RegExp(`${name}:\\s*([^;]+);`).exec(body)?.[1].trim() ?? '';
  return {
    family: descriptor('font-family').replaceAll(/['"]/g, ''),
    weight: descriptor('font-weight'),
    display: descriptor('font-display'),
    src: /url\('([^']+)'\)/.exec(descriptor('src'))?.[1] ?? '',
    ranges: parseRanges(descriptor('unicode-range')),
  };
});

const condensedFaces = faces.filter(({ family }) => family === 'Rubikon Condensed');
const inRanges = (ranges: Range[], code: number) => ranges.some(([start, end]) => code >= start && code <= end);
const covers = (face: Face, text: string) => [...text].every((char) => inRanges(face.ranges, char.codePointAt(0) ?? 0));

const ukrainianAlphabet = 'АБВГҐДЕЄЖЗИІЇЙКЛМНОПРСТУФХЦЧШЩЬЮЯабвгґдеєжзиіїйклмнопрстуфхцчшщьюя';
// Digits and the punctuation the condensed labels use next to Cyrillic: ’ · × – —.
const latinAndPunctuation = 'AZaz09’·×–—';

// What IBM's split files covered until 20.11 (each range was its file's cmap: Latin1, Cyrillic, Pi as narrowed in #93)
const IBM_RANGES = parseRanges([
  'U+0000, U+000D, U+0020-007E, U+00A0-00FF, U+0131, U+0152-0153, U+02C6, U+02DA, U+02DC, U+2013-2014, U+2018-201A',
  'U+201C-201E, U+2020-2022, U+2026, U+2030, U+2039-203A, U+2044, U+20AC, U+2122, U+2212, U+FB01-FB02',
  'U+0400-045F, U+0462-0463, U+046A-046B, U+0472-0475, U+0490-04C2, U+04CF-04D9, U+04DC-04E9, U+04EE-04F9, U+0524-0525',
  'U+2032-2033, U+2191, U+2193, U+2215',
].join(', '));

/** Every character in the site's sources — text, data and CSS content — as the subset script reads them */
function siteCharacters() {
  const root = path.join(process.cwd(), 'app');
  const chars = new Set<number>();
  for (const file of readdirSync(root, { recursive: true }) as string[]) {
    if (!/\.(tsx?|css)$/.test(file)) continue;
    for (const char of readFileSync(path.join(root, file), 'utf8')) {
      const code = char.codePointAt(0) ?? 0;
      if (code > 0x7e) chars.add(code);
    }
  }
  return chars;
}

/** One table of a WOFF2 file, as stored (name and cmap are never transformed in WOFF2, so they sit in the stream as is) */
function woff2Table(file: string, wanted: string) {
  const bytes = readFileSync(file);
  const numTables = bytes.readUInt16BE(12);
  const totalCompressedSize = bytes.readUInt32BE(20);
  const KNOWN = ['cmap', 'head', 'hhea', 'hmtx', 'maxp', 'name', 'OS/2', 'post', 'cvt ', 'fpgm', 'glyf', 'loca', 'prep'];
  let at = 48;
  const base128 = () => {
    let value = 0;
    for (let i = 0; i < 5; i += 1) {
      const byte = bytes[at++];
      value = value * 128 + (byte & 0x7f);
      if (!(byte & 0x80)) return value;
    }
    throw new Error('bad UIntBase128');
  };
  const tables: { tag: string; length: number }[] = [];
  for (let i = 0; i < numTables; i += 1) {
    const flags = bytes[at++];
    const index = flags & 0x3f;
    let tag = KNOWN[index] ?? `#${index}`;
    if (index === 0x3f) {
      tag = bytes.toString('latin1', at, at + 4);
      at += 4;
    }
    const original = base128();
    const version = (flags >> 6) & 3;
    const transformed = tag === 'glyf' || tag === 'loca' ? version === 0 : version !== 0;
    tables.push({ tag, length: transformed ? base128() : original });
  }
  const stream = brotliDecompressSync(bytes.subarray(at, at + totalCompressedSize));
  let offset = 0;
  for (const table of tables) {
    if (table.tag === wanted) return stream.subarray(offset, offset + table.length);
    offset += table.length;
  }
  throw new Error(`${file}: no ${wanted} table`);
}

/** The characters a WOFF2 file maps (its Windows Unicode BMP cmap, format 4) */
function cmapOf(file: string) {
  const cmap = woff2Table(file, 'cmap');
  const count = cmap.readUInt16BE(2);
  for (let i = 0; i < count; i += 1) {
    const platform = cmap.readUInt16BE(4 + i * 8);
    const encoding = cmap.readUInt16BE(6 + i * 8);
    const at = cmap.readUInt32BE(8 + i * 8);
    if (platform !== 3 || encoding !== 1 || cmap.readUInt16BE(at) !== 4) continue;
    const segments = cmap.readUInt16BE(at + 6) / 2;
    const codes = new Set<number>();
    for (let s = 0; s < segments; s += 1) {
      const end = cmap.readUInt16BE(at + 14 + s * 2);
      const start = cmap.readUInt16BE(at + 16 + segments * 2 + s * 2);
      for (let code = start; code <= end && code !== 0xffff; code += 1) codes.add(code);
    }
    return codes;
  }
  throw new Error(`${file}: no format 4 cmap`);
}

/** A WOFF2 file's name table records, decoded */
function nameRecords(file: string) {
  const name = woff2Table(file, 'name');
  const count = name.readUInt16BE(2);
  const strings = name.readUInt16BE(4);
  const records: { id: number; text: string }[] = [];
  for (let r = 0; r < count; r += 1) {
    const record = 6 + r * 12;
    if (name.readUInt16BE(record) !== 3) continue;
    const id = name.readUInt16BE(record + 6);
    const length = name.readUInt16BE(record + 8);
    const start = strings + name.readUInt16BE(record + 10);
    // UTF-16BE; copied before swapping, as two records may share one string
    records.push({ id, text: Buffer.from(name.subarray(start, start + length)).swap16().toString('utf16le') });
  }
  return records;
}

describe('self-hosted Rubikon Condensed (IBM Plex Sans Condensed, subset)', () => {
  it.each(['500', '600', '700'])('declares the whole Ukrainian alphabet at weight %s', (weight) => {
    const cyrillic = condensedFaces.find((face) => face.weight === weight && covers(face, ukrainianAlphabet));
    expect(cyrillic?.src).toMatch(/-Cyrillic\.woff2$/);
  });

  it.each(['500', '600', '700'])('keeps Latin, digits and label punctuation at weight %s', (weight) => {
    const latin = condensedFaces.find((face) => face.weight === weight && covers(face, latinAndPunctuation));
    expect(latin?.src).toMatch(/-Latin\.woff2$/);
  });

  it('serves every face from a committed file and swaps instead of blocking text', () => {
    expect(condensedFaces).toHaveLength(9);
    for (const face of condensedFaces) {
      expect(face.display, face.src).toBe('swap');
      expect(existsSync(path.join(fontDirectory, face.src)), face.src).toBe(true);
    }
    expect(existsSync(path.join(fontDirectory, 'rubikon-condensed/OFL.txt'))).toBe(true);
    expect(existsSync(path.join(fontDirectory, 'rubikon-condensed/README.md'))).toBe(true);
  });

  // The subset must cost no glyph: a character the site sets that IBM's faces had stays in the face at every weight.
  // When this fails, run scripts/fonts/subset_rubikon_condensed.py and paste the ranges it prints into the CSS.
  it.each(['500', '600', '700'])('draws every character the site sets that Plex drew, at weight %s', (weight) => {
    const ranges = condensedFaces.filter((face) => face.weight === weight).flatMap((face) => face.ranges);
    const lost = [...siteCharacters()]
      .filter((code) => inRanges(IBM_RANGES, code) && !inRanges(ranges, code))
      .map((code) => `${String.fromCodePoint(code)} U+${code.toString(16).toUpperCase().padStart(4, '0')}`);
    expect(lost).toEqual([]);
  });

  // WebKit draws a character from a loaded face whose file has it, inside the face's unicode-range or not: with IBM's Pi
  // loaded, Safari took № ← → ↔ ↗ ↺ √ ≈ ≤ ≥ ✓ from it (20.11). The Pi file keeps every such character the site sets.
  it.each(condensedFaces.filter((face) => face.src.endsWith('-Pi.woff2')).map((face) => face.src))('%s keeps what WebKit drew from IBM\'s Pi', (src) => {
    const IBM_PI = parseRanges('U+0E3F, U+2000-200D, U+2015, U+2028-2029, U+202F, U+2032-2033, U+2070, U+2074-2079, U+2080-2089, U+2113, U+2116, U+2126, U+212E, U+2150-2151, U+2153-215E, U+2190-2199, U+21A9-21AA, U+21B0-21B3, U+21B6-21B7, U+21BA-21BB, U+21C4, U+21C6, U+2202, U+2206, U+220F, U+2211, U+2215, U+221A, U+221E, U+222B, U+2248, U+2260, U+2264-2265, U+25CA, U+2713, U+274C, U+2B0E-2B11');
    const kept = cmapOf(path.join(fontDirectory, src));
    const lost = [...siteCharacters()].filter((code) => inRanges(IBM_PI, code) && !kept.has(code)).map((code) => String.fromCodePoint(code));
    expect(lost).toEqual([]);
  });

  // SIL OFL 1.1, Reserved Font Name "Plex": a Modified Version may not be called Plex. IBM's copyright and the licence
  // notice stay; the description (ID 10) says what the font is derived from.
  it.each(condensedFaces.map((face) => face.src))('%s is named Rubikon Condensed, not Plex', (src) => {
    const records = nameRecords(path.join(fontDirectory, src));
    const text = (id: number) => records.find((record) => record.id === id)?.text ?? '';
    expect(text(16)).toBe('Rubikon Condensed');
    expect(text(1)).toMatch(/^Rubikon Condensed /);
    expect(text(6)).toMatch(/^RubikonCondensed-/);
    expect(text(13)).toContain('SIL Open Font License');
    expect(text(0)).toContain('IBM Corp');
    for (const record of records.filter(({ id }) => id !== 0 && id !== 10)) expect(record.text, `name ID ${record.id}`).not.toContain('Plex');
  });
});
