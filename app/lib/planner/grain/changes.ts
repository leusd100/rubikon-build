/**
 * «Що змінилося?» — explains an edit by its consequences. Verbatim from the prototype
 * (`819f163`, app/planner-logic.ts).
 */
import type { ChangeExplanation } from '../core/types';
import type { Answers } from './answers';
import { buildCandidates, visibleCandidateKeys, type CandidateKey } from './candidates';
import { logicLabels } from './labels';
import { existingSiteTypes, hasActiveProcessing, hasExpansionTension, requiresFutureHandling, routeDecision, stationaryHandling } from './rules';
import { buildDrivers, joinTraits } from './understanding';

const CANDIDATE_TITLES: Record<CandidateKey, string> = { silo: 'Силосна система', framed: 'Каркасне підлогове', arch: 'Безкаркасне арочне' };
const DRIVER_FIELDS: Record<string, (keyof Answers)[]> = {
  'Масштаб зберігання': ['capacity'], 'Розділення партій': ['separation'], 'Інтенсивна логістика': ['operation'],
  'Компактність': ['sitePressure'], 'Майбутній розвиток': ['development'],
};
const CANDIDATE_SIGNAL_FIELDS: (keyof Answers)[] = ['handling', 'operation', 'processing', 'futureHandling', 'development', 'site', 'sitePressure'];

function quoted(items: string[]) {
  return joinTraits(items.map((item) => `«${item}»`));
}

function handlingTriggers(answers: Answers) {
  const triggers: string[] = [];
  if (answers.operation === 'high') triggers.push('інтенсивне приймання');
  if (hasActiveProcessing(answers.processing)) triggers.push(`підготовка «${logicLabels[answers.processing ?? '']}»`);
  return triggers;
}

/** What still keeps the current comparison in place when a driver drops out. */
function comparisonSupport(answers: Answers) {
  const mobile = answers.handling === 'mobile';
  return ([
    !mobile && answers.operation === 'high' && 'інтенсивна логістика',
    !mobile && hasActiveProcessing(answers.processing) && `підготовка «${logicLabels[answers.processing ?? '']}»`,
    answers.handling === 'stationary' && 'поточна стаціонарна механізація',
    answers.handling === 'combined' && 'поточне комбіноване переміщення',
    requiresFutureHandling(answers) && stationaryHandling.includes(answers.futureHandling ?? '') && 'майбутня стаціонарна механізація',
  ].filter(Boolean) as string[]).slice(0, 2);
}

/**
 * Explains an edit by its consequences, not by the field that moved. Priority follows what the
 * client can observe: the concept set, then the tension, then the decision drivers, then derived
 * needs (route, classification, the handling dependency). A raw field note is written only for a
 * changed answer that none of those consequences already explains.
 */
export function explainChanges(before: Answers, after: Answers): ChangeExplanation {
  const changed = (Object.keys(after) as (keyof Answers)[]).filter((key) => JSON.stringify(before[key]) !== JSON.stringify(after[key]));
  if (!changed.length) return ['Підтверджені факти не змінилися.'];
  const notes: string[] = [];
  const covered = new Set<keyof Answers>();
  const cover = (...keys: (keyof Answers)[]) => keys.forEach((key) => covered.add(key));

  // 1. Concept set
  const keysBefore = visibleCandidateKeys(before);
  const keysAfter = visibleCandidateKeys(after);
  const added = keysAfter.filter((key) => !keysBefore.includes(key));
  const removed = keysBefore.filter((key) => !keysAfter.includes(key));
  const afterCandidates = buildCandidates(after);
  for (const key of added) {
    const reason = afterCandidates.find((item) => item.key === key)?.reasons[0];
    notes.push(`До порівняння додано концепцію «${CANDIDATE_TITLES[key]}».${reason ? ` ${reason}` : ''}`);
  }
  for (const key of removed) notes.push(`Концепція «${CANDIDATE_TITLES[key]}» більше не показується: жоден із підтверджених факторів її вже не підтримує.`);
  if (added.length || removed.length) cover(...CANDIDATE_SIGNAL_FIELDS.filter((key) => changed.includes(key)));

  // 2. Tension
  const tensionBefore = hasExpansionTension(before);
  const tensionAfter = hasExpansionTension(after);
  if (tensionBefore && !tensionAfter) {
    notes.push(after.sitePressure !== 'compact'
      ? 'Суперечність знята: майданчик більше не створює підтвердженого конфлікту з майбутнім фізичним розширенням.'
      : 'Суперечність знята: фізичне розширення більше не заплановане, тож компактний майданчик не конфліктує з наступною чергою.');
  } else if (!tensionBefore && tensionAfter) {
    notes.push('З’явилася суперечність: компактний майданчик і заплановане фізичне розширення тепер потрібно оцінювати разом.');
  }
  const tensionChanged = tensionBefore !== tensionAfter;
  if (tensionChanged) cover('sitePressure', 'development');

  // 3. Decision drivers
  const skip = (driver: string) => driver === 'Базовий сценарій' || (tensionChanged && (driver === 'Компактність' || driver === 'Майбутній розвиток'));
  const driversBefore = buildDrivers(before).filter((driver) => !skip(driver));
  const driversAfter = buildDrivers(after).filter((driver) => !skip(driver));
  const driversAdded = driversAfter.filter((driver) => !driversBefore.includes(driver));
  const driversRemoved = driversBefore.filter((driver) => !driversAfter.includes(driver));
  const setUnchanged = !added.length && !removed.length;
  let lead = setUnchanged ? 'Набір концепцій не змінився: ' : '';
  if (driversRemoved.length) {
    const support = setUnchanged && keysAfter.includes('silo') ? comparisonSupport(after) : [];
    notes.push(`${lead}${quoted(driversRemoved)} більше не ${driversRemoved.length > 1 ? 'впливають' : 'впливає'} на порівняння${support.length ? `, але ${joinTraits(support)} і далі ${support.length > 1 ? 'підтримують' : 'підтримує'} поточне порівняння` : ''}.`);
    driversRemoved.forEach((driver) => cover(...(DRIVER_FIELDS[driver] ?? ['processing'])));
    lead = '';
  }
  if (driversAdded.length) {
    notes.push(`${lead ? 'Набір концепцій не змінився, але ' : ''}${quoted(driversAdded)} тепер ${driversAdded.length > 1 ? 'впливають' : 'впливає'} на порівняння.`);
    driversAdded.forEach((driver) => cover(...(DRIVER_FIELDS[driver] ?? ['processing'])));
  }

  // 4. Derived consequences
  const routeBefore = routeDecision(before);
  const routeAfter = routeDecision(after);
  if (routeBefore !== routeAfter) {
    notes.push(routeAfter === 'candidateComparison' ? 'Контексту тепер достатньо, щоб порівняти концепції.' : 'Порівняння концепцій відкладено: з’явилися невідомі, які впливають на вибір.');
  }
  const technologicalBefore = hasActiveProcessing(before.processing);
  const technologicalAfter = hasActiveProcessing(after.processing);
  if (technologicalBefore && !technologicalAfter) {
    notes.push(after.processing === 'none'
      ? 'Задача більше не розглядається як технологічний комплекс: підготовку зерна не передбачено.'
      : 'Задача більше не розглядається як технологічний комплекс: підготовка зерна поки не визначена.');
    cover('processing');
  } else if (!technologicalBefore && technologicalAfter) {
    notes.push(`Задача тепер розглядається як технологічний комплекс: підготовка «${logicLabels[after.processing ?? '']}» додає власні зв’язки з переміщенням і зберіганням.`);
    cover('processing');
  }
  const triggersBefore = handlingTriggers(before);
  const triggersAfter = handlingTriggers(after);
  if (triggersBefore.length && !triggersAfter.length) {
    notes.push(`Спосіб переміщення більше не обов’язковий: ні інтенсивність, ні підготовка його тепер не вимагають${after.handling ? '; вказану відповідь збережено як факт' : ''}.`);
    cover('operation', 'processing', 'handling');
  } else if (!triggersBefore.length && triggersAfter.length) {
    notes.push(`Спосіб переміщення тепер важливий: його вимагає ${joinTraits(triggersAfter)}.`);
    cover('operation', 'processing');
  } else if (triggersBefore.length && triggersBefore.join('|') !== triggersAfter.join('|')) {
    notes.push(`Спосіб переміщення лишається важливим: тепер його вимагає ${joinTraits(triggersAfter)}.`);
    cover('operation', 'processing');
  }

  // 5. Raw field fallback — only for answers no consequence above explains
  const raw: Partial<Record<keyof Answers, string>> = {
    capacity: 'Орієнтовну місткість оновлено. Вона описує масштаб задачі, але не обирає тип сховища без інженерно підтверджених порогів.',
    crops: 'Склад продукції оновлено. Відповідь про розділення партій збережена й залишається окремим рішенням.',
    separation: 'Вимогу до розділення партій оновлено; питання для першої розмови перераховані.',
    operation: 'Режим роботи оновлено; набір концепцій і фактори порівняння від цього не змінилися.',
    handling: 'Спосіб переміщення в першій черзі оновлено окремо від майбутнього стану.',
    processing: 'Підготовку зерна оновлено; перелік уточнень перераховано.',
    site: existingSiteTypes.includes(after.site ?? '') ? 'Контекст майданчика оновлено; придатність наявних конструкцій не припускається автоматично.' : 'Контекст майданчика оновлено.',
    sitePressure: 'Обмеження по площі оновлено.',
    development: 'Напрями розвитку оновлено; поточний стан і майбутня фаза залишаються розділеними.',
    futureHandling: 'Майбутній спосіб переміщення оновлено без зміни поточної механізації.',
  };
  for (const key of changed) {
    const text = raw[key];
    if (!covered.has(key) && text && !notes.includes(text)) notes.push(text);
  }
  return notes.length ? notes : ['Підтверджені факти не змінилися.'];
}
