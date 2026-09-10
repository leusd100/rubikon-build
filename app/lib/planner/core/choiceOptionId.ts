/**
 * A choice option's DOM id. Scoped by the rendering group, never by the option value alone:
 * a primary group and its adaptive clarifier share values (`unknown` above all) and render in
 * the same card, so a value-derived id produced duplicates and `<label htmlFor>` then resolved
 * to the wrong group's radio. Taking the group as a required argument makes that regression
 * impossible to reintroduce silently.
 *
 * Lives in lib rather than inside the ChoiceGroup component so the regression guard stays a
 * plain unit test — this repo's Vitest runs in node and deliberately does not render .tsx.
 */
export function choiceOptionId(group: string, value: string) {
  return `${group}-${value}`;
}
