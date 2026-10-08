// A page that failed to load a part of itself — a dropped connection, or a new version published while it was opening
// (audit 08.10: one missing file put «This page couldn’t load» over /angary, its phone and its form) — reloads once by
// itself; the second time it shows what to do. The mark lives a minute in this tab, so a page that keeps failing is
// never reloaded in a loop.

const RELOAD_KEY = 'rubikon-error-reload';
const WINDOW_MS = 60_000;

/** Reloads the page and returns true, unless it already reloaded for an error in the last minute */
export function reloadOnce(): boolean {
  try {
    const last = Number(window.sessionStorage.getItem(RELOAD_KEY) || 0);
    if (Date.now() - last < WINDOW_MS) return false;
    window.sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
  } catch {
    // no storage: no way to tell a loop from a first failure, so show the page instead
    return false;
  }
  window.location.reload();
  return true;
}
