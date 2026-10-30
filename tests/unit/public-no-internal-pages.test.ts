import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// DC-02 (29.10): three internal review galleries of PR #243 sat in public/media/reviews and so were served from
// rubikonbuild.com with no CSP (the asset layer answers before the Worker) and no robots rule. Files in public/ are
// published as they are, so nothing in it may be a page of its own: review galleries and prototypes live in
// design-assets/ (kept in the repository, never deployed), the site's pages come from app/.
function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : [path];
  });
}

describe('public/ publishes no pages of its own', () => {
  it('has no HTML file and no review directory', () => {
    const published = files(new URL('../../public', import.meta.url).pathname);
    expect(published.filter((path) => /\.html?$/i.test(path))).toEqual([]);
    expect(published.filter((path) => /\/reviews\//.test(path))).toEqual([]);
  });
});
