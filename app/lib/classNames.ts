/** Joins class names, skipping the empty ones: a conditional class without a template inside a template. */
export function classNames(...names: (string | false | null | undefined)[]) {
  return names.filter(Boolean).join(' ');
}
