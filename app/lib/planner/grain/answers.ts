/**
 * Grain Planner answers and capacity parsing.
 *
 * Moved verbatim from the prototype (`codex/grain-planner-v0.5 @ 819f163`, app/planner-logic.ts);
 * behaviour is pinned by tests/unit/planner/grain/golden.test.ts.
 */

export type SingleChoice = string | null;

export type Answers = {
  crops: string[];
  capacity: string;
  separation: SingleChoice;
  operation: SingleChoice;
  handling: SingleChoice;
  processing: SingleChoice;
  site: SingleChoice;
  sitePressure: SingleChoice;
  development: string[];
  futureHandling: SingleChoice;
};

export type CapacityInfo =
  | { kind: 'empty' | 'unknown' | 'invalid' }
  | { kind: 'known'; min: number; max: number }
  | { kind: 'range'; min: number; max: number };

function parsePositiveInteger(value: string) {
  const compact = value.replace(/\s/g, '');
  if (!/^\d+$/.test(compact)) return null;
  const parsed = Number(compact);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

export function parseCapacity(value: string): CapacityInfo {
  const normalized = value.trim();
  if (!normalized) return { kind: 'empty' };
  if (normalized === 'unknown') return { kind: 'unknown' };
  const range = normalized.match(/^(\d[\d\s]*)\s*[–—-]\s*(\d[\d\s]*)$/);
  if (range) {
    const min = parsePositiveInteger(range[1]);
    const max = parsePositiveInteger(range[2]);
    if (!min || !max || min >= max) return { kind: 'invalid' };
    return { kind: 'range', min, max };
  }
  const known = parsePositiveInteger(normalized);
  return known ? { kind: 'known', min: known, max: known } : { kind: 'invalid' };
}

export function formatCapacityInfo(info: CapacityInfo) {
  if (info.kind === 'unknown') return 'місткість ще не визначена';
  if (info.kind === 'range') return `≈ ${formatNumber(info.min)}–${formatNumber(info.max)} т`;
  if (info.kind === 'known') return `≈ ${formatNumber(info.min)} т`;
  return '';
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('uk-UA').format(value);
}
