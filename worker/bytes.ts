// Byte helpers for the Worker's HTML rewrites (modulepreload-priority.ts, hero-theme-sources.ts): both match ASCII in the
// bytes as they come, since UTF-8 never repeats an ASCII byte inside a multi-byte letter.

export const NOTHING = new Uint8Array(0);

/** The parts as one array, without a copy when there is only one */
export function join(parts: Uint8Array[]) {
  if (parts.length === 1) return parts[0];
  const out = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let at = 0;
  for (const part of parts) { out.set(part, at); at += part.length; }
  return out;
}

/** Whether `bytes` at `at` hold the first `length` bytes of `pattern` (the first byte is already known to match) */
export function matchesAt(bytes: Uint8Array, at: number, pattern: Uint8Array, length: number) {
  for (let i = 1; i < length; i += 1) if (bytes[at + i] !== pattern[i]) return false;
  return true;
}
