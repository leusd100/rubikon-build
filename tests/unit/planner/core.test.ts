import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const coreDir = join(process.cwd(), 'app', 'lib', 'planner', 'core');

/**
 * The universal planner core is a contract, not an engine: types only until a second planner
 * exists. A runtime export here would be the first step towards a shared engine nobody asked for.
 */
describe('universal planner core', () => {
  it('contains only the types module', () => {
    expect(readdirSync(coreDir)).toEqual(['types.ts']);
  });

  it('exports types and nothing that runs', () => {
    const source = readFileSync(join(coreDir, 'types.ts'), 'utf8');
    expect(source).not.toMatch(/^\s*export\s+(?:default|const|let|var|function|class|enum)\b/m);
    expect(source).not.toMatch(/^\s*import\s/m);
  });
});
