import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// The materials load on every page that has them (page-materials.css), before the visitor reaches the block. A tile is one
// period of a surface and stays tiny because its fade is a CSS gradient; only the surfaces that cannot repeat are larger.
const DIRECTORY = join(process.cwd(), 'public/media/materials');
const SCENE_KB = 45;
const LIMIT_KB: Record<string, number> = { 'brushed-dark.webp': 60, 'concrete-dark.webp': 16, 'concrete-paper.webp': 10, 'contours-dark.svg': 48, 'grainfall-dark.svg': 40, 'grainfall-paper.svg': 40, 'silo-dark.webp': 10 };
const TILE_KB = 7;

describe('the weight of the pages\' materials', () => {
  for (const file of readdirSync(DIRECTORY)) {
    it(`${file} stays within its budget`, () => {
      expect(statSync(join(DIRECTORY, file)).size / 1024).toBeLessThanOrEqual(file.startsWith('scene-') ? SCENE_KB : LIMIT_KB[file] ?? TILE_KB);
    });
  }
});
