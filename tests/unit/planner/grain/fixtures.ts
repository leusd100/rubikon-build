import type { Answers } from '../../../../app/lib/planner/grain';

const base: Answers = {
  crops: [], capacity: '', separation: null, operation: null, handling: null,
  processing: null, site: null, sitePressure: null, development: [], futureHandling: null,
};

/** The scenario answers the golden was captured with (see __golden__/README.md). */
export const fixtures = {
  A: { ...base, crops: ['Пшениця', 'Ячмінь'], capacity: '3000', separation: 'shared', operation: 'seasonal', processing: 'none', site: 'greenfield', sitePressure: 'space', development: ['capacity'] },
  B: { ...base, crops: ['Пшениця', 'Кукурудза', 'Соняшник', 'Ячмінь'], capacity: '12 000', separation: 'required', operation: 'high', handling: 'stationary', processing: 'both', site: 'greenfield', sitePressure: 'compact', development: ['capacity', 'handling', 'physical'], futureHandling: 'stationary' },
  C1: { ...base, crops: ['Пшениця', 'Соняшник'], capacity: 'unknown', separation: 'unknown', operation: 'unknown', handling: 'unknown', processing: 'drying', site: 'greenfield', sitePressure: 'unknown', development: ['unknown'] },
  C2: { ...base, crops: ['Пшениця'], capacity: '3000', separation: 'shared', operation: 'regular', handling: 'unknown', processing: 'drying', site: 'greenfield', sitePressure: 'space', development: ['unknown'] },
  /** The prototype's «Демо 8 000 т» scenario. Test data only — there is no public demo in production. */
  DEMO: { crops: ['Пшениця', 'Кукурудза', 'Соняшник'], capacity: '8000', separation: 'required', operation: 'high', handling: 'stationary', processing: 'both', site: 'greenfield', sitePressure: 'compact', development: ['capacity', 'handling', 'physical'], futureHandling: 'stationary' },
} satisfies Record<string, Answers>;

export type FixtureName = keyof typeof fixtures;
export const fixtureNames = Object.keys(fixtures) as FixtureName[];

const spaced: Answers = { ...fixtures.DEMO, sitePressure: 'space' };
const shared: Answers = { ...spaced, separation: 'shared' };
const seasonal: Answers = { ...shared, operation: 'seasonal' };

/** Batch #3 edits, applied one after another to DEMO exactly as they were clicked in the prototype. */
export const editChain = [
  { name: 'compact→space', before: fixtures.DEMO, after: spaced },
  { name: 'separation required→shared', before: spaced, after: shared },
  { name: 'high→seasonal', before: shared, after: seasonal },
];

/** The golden's DOM strings are whitespace-normalised; compare the port's output the same way. */
export function normalize(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}
