import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// Every literal path to a public asset in the app's source must exist under public/. Regenerated, content-hashed
// variants (scripts/generate-*.py) change file names, and a reference the manifests do not cover keeps pointing at a
// deleted file with no build error: /napryamky's Open Graph image did exactly that in the q85 hero re-encode.
const ROOT = process.cwd();
const ASSET_PATH = /['"`(](\/(?:media|media-responsive|brands|brand|images|photos)\/[\w./-]+\.(?:webp|jpe?g|png|svg|mp4|m4v|avif))/g;

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.(tsx?|css)$/.test(name) ? [path] : [];
  });
}

describe('public asset references', () => {
  const references = new Map<string, string>();
  for (const file of sourceFiles(join(ROOT, 'app'))) {
    for (const [, path] of readFileSync(file, 'utf8').matchAll(ASSET_PATH)) references.set(path, file.slice(ROOT.length + 1));
  }

  it('finds the references it is meant to check', () => {
    expect(references.size).toBeGreaterThan(100);
  });

  it('every literal asset path in app/ exists under public/', () => {
    const missing = [...references].filter(([path]) => !existsSync(join(ROOT, 'public', path))).map(([path, file]) => `${file}: ${path}`);
    expect(missing).toEqual([]);
  });
});
