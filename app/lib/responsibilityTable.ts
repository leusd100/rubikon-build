import type { DeliveryFormatId } from '../types/deliveryModel';
import type { ResponsibilityZone, SwitchFormat, SwitchItem } from './deliveryModelPresentation';

// /yak-pratsyuiemo «Відповідальність без дрібного шрифту» — what the responsibility table says, apart from how it is drawn
// (components/process/ResponsibilityMatrix.tsx). The table speaks to the client («Ви»); every word here is derived from
// responsibilityByFormat() — the model's matrix, its notes and roles — or is a plainer name for the same work, and the
// e2e spec reads the page against these same functions.

export const RESPONSIBILITY_ZONES: readonly { id: ResponsibilityZone; title: string }[] = [
  { id: 'rubikon', title: 'RUBIKON' },
  { id: 'client', title: 'Ви' },
  { id: 'specialists', title: 'Профільні спеціалісти' },
];

/** When a format is the visitor's, in plain words — built from the page's own entries (STARTS), the formats' contract
 *  terms (CHOICE_TERMS: who coordinates) and their interfaces; no new promise. The model's interfaces line follows it. */
export const FORMAT_WHEN: Record<DeliveryFormatId, string> = {
  comprehensive: 'Потрібно звести об’єкт комплексно — ми координуємо погоджений обсяг робіт.',
  'work-package': 'Потрібен окремий етап: фундамент, каркас чи покрівля. Об’єкт загалом координуєте ви або ваш генпідрядник.',
  subcontract: 'Ви генпідрядник, і вам потрібен виконавець на пакет робіт.',
};

/** The rows in three groups, by the first matrix row each work stands for. On a phone each group folds under its title
 *  (Phase 3, PROPOSED); the id names it in the markup. */
export const RESPONSIBILITY_GROUPS: readonly { id: string; title: string; rows: readonly string[] }[] = [
  { id: 'preparation', title: 'Підготовка', rows: ['task-framing', 'site-inputs', 'design', 'interfaces', 'estimate'] },
  { id: 'construction', title: 'Будівництво', rows: ['materials', 'steel', 'steel-fabrication', 'flexible-packages', 'engineering-systems', 'external-utilities', 'process-equipment', 'quality-control'] },
  { id: 'handover', title: 'Нагляд, дозволи й здача', rows: ['permits', 'surveys', 'acceptance'] },
];

/** «5 робіт», «3 роботи», «1 робота»: how many works a folded group holds. */
export function worksCount(count: number) {
  const tens = count % 100;
  const units = count % 10;
  if (units === 1 && tens !== 11) return `${count} робота`;
  if (units >= 2 && units <= 4 && (tens < 12 || tens > 14)) return `${count} роботи`;
  return `${count} робіт`;
}

/** Plainer names for the most technical works (same scope; the model's wording stays in the data). */
const PLAIN: Readonly<Record<string, string>> = {
  'task-framing': 'Розібрати задачу й скласти список потрібних даних',
  design: 'Проєкт об’єкта',
  interfaces: 'Ув’язка наших робіт з іншими роботами на об’єкті',
  steel: 'Будівельні роботи: фундаменти, бетон, каркас, покрівля',
  surveys: 'Геодезія й геологія, технічний і авторський нагляд',
};

/** The name a row shows: the plainer one where the model's is technical, else the model's own. */
export function workName(item: SwitchItem): string {
  return PLAIN[item.rows[0]] ?? item.text;
}

export type MarkKind = 'own' | 'soft' | 'client' | 'specialist';

export function kindOf(item: SwitchItem, zone: ResponsibilityZone, format: SwitchFormat['id']): MarkKind {
  if (zone === 'client') return 'client';
  if (zone === 'specialists') return 'specialist';
  const role = item.rubikonRole[format];
  return role && role !== 'executes' ? 'soft' : 'own';
}

/** The word in a cell: what that party does with the work in that format. */
export function wordOf(item: SwitchItem, zone: ResponsibilityZone, format: SwitchFormat['id']): string {
  const kind = kindOf(item, zone, format);
  if (kind === 'soft') return item.rubikonRole[format] === 'organizes' ? 'Організовуємо' : 'Координуємо';
  return { own: 'Робимо', client: 'На вас', specialist: 'Виконують' }[kind];
}

/** The model's notes were written about «замовник» / «генпідрядник»; the table speaks to them as «ви». */
export const TO_YOU: Readonly<Record<string, string>> = {
  'або надає замовник — залежно від договору': 'або надаєте ви — залежно від договору',
  'або надає генпідрядник — залежно від договору': 'або надаєте ви — залежно від договору',
  'або окремо на стороні замовника': 'або окремо, на вашому боці',
  'координує об’єкт загалом': 'координуєте об’єкт загалом',
  'описує пакет робіт і графік': 'описуєте пакет робіт і графік',
  'спеціалісти замовника': 'ваші спеціалісти',
  'спеціалісти генпідрядника': 'ваші спеціалісти',
  'сам або через свого генпідрядника': 'самі або через свого генпідрядника',
};

/**
 * The model's note for a cell, in the second person — unless it only repeats the cell's word (the generated
 * «координуємо» / «організовуємо», «виконують») or the RUBIKON cell's note in the same row.
 */
export function noteOf(item: SwitchItem, zone: ResponsibilityZone, format: SwitchFormat['id']): string | undefined {
  const note = item.notes[zone]?.[format];
  if (!note || note.toLowerCase() === wordOf(item, zone, format).toLowerCase()) return undefined;
  if (zone !== 'rubikon' && note === item.notes.rubikon?.[format] && item.zones.rubikon.includes(format)) return undefined;
  return TO_YOU[note] ?? note;
}

