import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Plugin } from 'vite';

const MODULE_ID = 'virtual:rubikon-video-byte-lengths';

// ASSETS streams do not expose Content-Length inside the Worker. Read the
// exact lengths at build time, without importing any video bytes into JS.
export function collectVideoByteLengths(
  directory: string,
  watchFile: (path: string) => void = () => {},
): Record<string, number> {
  const lengths: Record<string, number> = {};
  function visit(current: string, parts: string[]) {
    watchFile(current);
    for (const entry of readdirSync(current, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const path = join(current, entry.name);
      const segments = [...parts, entry.name];
      if (entry.isDirectory()) visit(path, segments);
      else if (entry.isFile() && entry.name.endsWith('.mp4')) {
        watchFile(path);
        lengths[`/media/${segments.map(encodeURIComponent).join('/')}`] = statSync(path).size;
      }
    }
  }
  visit(directory, []);
  return lengths;
}

export function videoAssetsPlugin(): Plugin {
  const directory = fileURLToPath(new URL('../public/media/', import.meta.url));
  return {
    name: 'rubikon-video-byte-lengths',
    resolveId(id) {
      if (id === MODULE_ID) return `\0${MODULE_ID}`;
    },
    load(id) {
      if (id !== `\0${MODULE_ID}`) return;
      const lengths = collectVideoByteLengths(directory, (path) => this.addWatchFile(path));
      return `export default ${JSON.stringify(lengths)};`;
    },
  };
}
