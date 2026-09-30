import { existsSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { processHeroImage } from '../../app/data/processHeroImage';

// The /yak-pratsyuiemo hero: every variant the page asks for exists, widths ascend, and the fallback is the largest one.
describe('process hero image', () => {
  const variants = processHeroImage.srcSet.split(', ').map((entry) => entry.split(' ') as [string, string]);

  it('points only at generated files', () => {
    for (const [src] of variants) expect(existsSync(path.join(process.cwd(), 'public', src)), src).toBe(true);
    expect(existsSync(path.join(process.cwd(), 'public', processHeroImage.fallbackSrc))).toBe(true);
  });

  it('lists the widths smallest first and falls back to the largest', () => {
    expect(variants.map(([, width]) => width)).toEqual(['480w', '768w', '1200w', '1536w']);
    expect(processHeroImage.fallbackSrc).toBe(variants.at(-1)![0]);
  });
});
