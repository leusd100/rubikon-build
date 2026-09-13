import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const fontDirectory = path.join(process.cwd(), 'app/fonts');
const css = readFileSync(path.join(fontDirectory, 'ibm-plex-sans-condensed.css'), 'utf8');

type Face = {
  family: string;
  weight: string;
  display: string;
  src: string;
  ranges: Array<[number, number]>;
};

const faces: Face[] = [...css.matchAll(/@font-face\s*\{([^}]*)\}/g)].map(([, body]) => {
  const descriptor = (name: string) => body.match(new RegExp(`${name}:\\s*([^;]+);`))?.[1].trim() ?? '';
  return {
    family: descriptor('font-family').replace(/['"]/g, ''),
    weight: descriptor('font-weight'),
    display: descriptor('font-display'),
    src: descriptor('src').match(/url\('([^']+)'\)/)?.[1] ?? '',
    ranges: descriptor('unicode-range')
      .split(',')
      .filter(Boolean)
      .map((range) => {
        const [start, end = start] = range.trim().replace(/^U\+/i, '').split('-');
        return [parseInt(start, 16), parseInt(end, 16)];
      }),
  };
});

const plexFaces = faces.filter(({ family }) => family === 'IBM Plex Sans Condensed');
const covers = (face: Face, text: string) =>
  [...text].every((char) => {
    const code = char.codePointAt(0) ?? 0;
    return face.ranges.some(([start, end]) => code >= start && code <= end);
  });

const ukrainianAlphabet = 'АБВГҐДЕЄЖЗИІЇЙКЛМНОПРСТУФХЦЧШЩЬЮЯабвгґдеєжзиіїйклмнопрстуфхцчшщьюя';
// Digits and the punctuation the condensed labels use next to Cyrillic: ’ · × – —.
const latinAndPunctuation = 'AZaz09’·×–—';

describe('self-hosted IBM Plex Sans Condensed', () => {
  it.each(['500', '600', '700'])('declares the whole Ukrainian alphabet at weight %s', (weight) => {
    const cyrillic = plexFaces.find((face) => face.weight === weight && covers(face, ukrainianAlphabet));

    expect(cyrillic?.src).toMatch(/-Cyrillic\.woff2$/);
  });

  it.each(['500', '600', '700'])('keeps Latin, digits and label punctuation at weight %s', (weight) => {
    const latin = plexFaces.find((face) => face.weight === weight && covers(face, latinAndPunctuation));

    expect(latin?.src).toMatch(/-Latin1\.woff2$/);
  });

  it('serves every face from a committed file and swaps instead of blocking text', () => {
    expect(plexFaces).toHaveLength(9);

    for (const face of plexFaces) {
      expect(face.display, face.src).toBe('swap');
      expect(existsSync(path.join(fontDirectory, face.src)), face.src).toBe(true);
    }
    expect(existsSync(path.join(fontDirectory, 'ibm-plex-sans-condensed/LICENSE.txt'))).toBe(true);
  });
});
