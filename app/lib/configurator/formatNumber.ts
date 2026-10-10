// Numbers as the configurator prints them: the Ukrainian decimal comma («7,5»), thousands parted by a non-breaking space
// («1 440» with U+00A0). One formatter per precision, made the first time it is needed and kept (10.10, audit F80):
// `toLocaleString('uk-UA', options)` builds a new ICU formatter on every call, and a dragged size slider made 107 such
// calls a step across the fields, the stamp and the drawings — on a phone with a slower CPU the drawing fell behind the
// finger (audit F79). The output is the same as `value.toLocaleString('uk-UA', { maximumFractionDigits })`.

const formatters = new Map<number, Intl.NumberFormat>();

/** `value` with at most `maximumFractionDigits` decimals (1 by default; `toLocaleString`'s own default is 3) */
export function formatNumber(value: number, maximumFractionDigits = 1): string {
  let formatter = formatters.get(maximumFractionDigits);
  if (!formatter) {
    formatter = new Intl.NumberFormat('uk-UA', { maximumFractionDigits });
    formatters.set(maximumFractionDigits, formatter);
  }
  return formatter.format(value);
}
