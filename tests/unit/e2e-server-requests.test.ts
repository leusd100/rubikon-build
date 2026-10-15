import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// Every request an e2e test sends from Node (`request`, `page.request`) goes through getFromServer
// (tests/e2e/server.helpers.ts): one sent straight through Playwright's shared keep-alive pool can land on a socket the
// test server is closing and fail with «socket hang up» (Main Regression, 15.10).
const E2E_DIR = new URL('../e2e/', import.meta.url);
const HELPER = 'server.helpers.ts';

const sources = readdirSync(E2E_DIR)
  .filter((file) => file.endsWith('.ts') && file !== HELPER)
  .sort()
  .map((file) => ({ file, source: readFileSync(new URL(file, E2E_DIR), 'utf8') }));

describe('e2e specs reach the test server on a connection of their own', () => {
  it('finds the specs that read the server from Node', () => {
    expect(sources.filter(({ source }) => source.includes('getFromServer(')).map(({ file }) => file)).toEqual(expect.arrayContaining([
      'grain-page.spec.ts', 'grain-planner.spec.ts', 'pr-critical.spec.ts',
    ]));
  });

  it('no spec sends an API request around getFromServer', () => {
    const direct = sources.flatMap(({ file, source }) => source.split('\n').flatMap((line, index) =>
      /\brequest\.(?:get|head|fetch|post|put|patch|delete)\(/.test(line) ? [`${file}:${index + 1}: ${line.trim()}`] : []));
    expect(direct).toEqual([]);
  });
});
