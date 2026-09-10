/**
 * What the planner says it understood: facts, decision drivers, the derived insight, the single
 * expansion tension and the one-sentence synthesis. Verbatim from the prototype
 * (`819f163`, app/planner-logic.ts).
 */
import type { Tension } from '../core/types';
import { formatCapacityInfo, parseCapacity, type Answers } from './answers';
import { logicLabels } from './labels';
import {
  countUnknowns,
  decisionBlockingUnknowns,
  hasActiveProcessing,
  hasDevelopmentIntent,
  hasExpansionTension,
  requiresFutureHandling,
  stationaryHandling,
} from './rules';

/**
 * The panel's derived insight. Deliberately never the expansion tension: that has its own block
 * (`expansionTension`), and when both fired the complex scenario said "Компактність ↔ розширення"
 * twice in one panel. With the tension excluded here, the slot falls through to the next derived
 * observation instead of repeating it.
 */
export function panelInsight(answers: Answers) {
  if (answers.processing === 'both') return { kind: 'ВИВЕДЕНИЙ ВИСНОВОК', title: 'Підготовка додає технологічний ланцюг.', body: 'Очищення та сушіння потрібно узгодити з переміщенням і зберіганням, не визначаючи обладнання на цьому етапі.' };
  if (answers.site === 'assets') return { kind: 'ІНЖЕНЕРНА МЕЖА', title: 'Придатність наявних конструкцій ще не підтверджена.', body: 'Плита, фундамент або каркас стають перевагою лише після обстеження й перевірки навантажень.' };
  if (answers.site === 'reconstruction') return { kind: 'ІНЖЕНЕРНА МЕЖА', title: 'Реконструкція починається з фактичного стану об’єкта.', body: 'Концепцію потрібно звірити з обстеженням, простором і чинними інженерними зв’язками.' };
  if (answers.handling === 'stationary') return { kind: 'ВИВЕДЕНИЙ ВИСНОВОК', title: 'Стаціонарне переміщення — частина технологічної схеми.', body: 'Його потрібно узгодити зі зберіганням, підготовкою та майданчиком.' };
  if (requiresFutureHandling(answers) && answers.futureHandling === 'stationary') return { kind: 'МАЙБУТНІЙ КОНТЕКСТ', title: 'Майбутнє переміщення відділене від першої черги.', body: 'Сумісність першої черги зі стаціонарною механізацією майбутньої фази потрібно перевірити окремо.' };
  if (answers.operation === 'high') return { kind: 'ВИВЕДЕНИЙ ВИСНОВОК', title: 'Місткість — уже не єдиний фактор.', body: 'Важливим стає те, як швидко зерно проходить через комплекс.' };
  if (answers.separation === 'required') return { kind: 'ВИВЕДЕНИЙ ВИСНОВОК', title: 'Розділення партій стало фактором концепції.', body: 'Потрібні незалежні зони або інший спосіб фізичного розділення.' };
  // Fallback, deliberately last: every stronger trigger above wins. Without it the panel had
  // nothing derived to say to the simplest client — it only echoed the form back.
  if (answers.processing === 'none' && answers.operation === 'seasonal' && answers.sitePressure === 'space' && !hasDevelopmentIntent(answers)) {
    return { kind: 'ВИВЕДЕНИЙ ВИСНОВОК', title: 'Простір для порівняння поки залишається широким.', body: 'Зерно надходить готовим до зберігання, режим сезонний, а площа не є жорстким обмеженням — тож жоден підхід не відпадає на цьому етапі.' };
  }
  return null;
}

export type TensionNote = Tension;

/** The single representation of the compact-site ↔ physical-expansion conflict in the panel. */
export function expansionTension(answers: Answers): TensionNote | null {
  return hasExpansionTension(answers)
    ? { kind: 'СУПЕРЕЧНІСТЬ', title: 'Компактність ↔ розширення', body: 'Потреба в розширенні є, але фактичний резерв території ще не підтверджено.' }
    : null;
}

export function buildDrivers(answers: Answers) {
  const result: string[] = [];
  if (['known', 'range'].includes(parseCapacity(answers.capacity).kind)) result.push('Масштаб зберігання');
  if (answers.separation === 'required') result.push('Розділення партій');
  if (answers.operation === 'high') result.push('Інтенсивна логістика');
  if (hasActiveProcessing(answers.processing)) result.push(logicLabels[answers.processing ?? ''][0].toUpperCase() + logicLabels[answers.processing ?? ''].slice(1));
  if (answers.sitePressure === 'compact') result.push('Компактність');
  if (hasDevelopmentIntent(answers)) result.push('Майбутній розвиток');
  if (!result.length) result.push('Базовий сценарій');
  return result;
}

export function buildFacts(answers: Answers) {
  const result: string[] = [];
  const parsedCapacity = parseCapacity(answers.capacity);
  const capacity = formatCapacityInfo(parsedCapacity);
  if (capacity && parsedCapacity.kind !== 'unknown') result.push(capacity);
  if (answers.crops.length && !answers.crops.includes('Ще не визначили')) result.push(answers.crops.join(' · '));
  if (answers.separation && answers.separation !== 'unknown') result.push(logicLabels[answers.separation]);
  if (answers.operation && answers.operation !== 'unknown') result.push(logicLabels[answers.operation]);
  if (answers.handling && answers.handling !== 'unknown') result.push(`зараз: ${logicLabels[answers.handling]}`);
  if (answers.processing && answers.processing !== 'unknown') result.push(`підготовка: ${logicLabels[answers.processing]}`);
  if (answers.site && answers.site !== 'unknown') result.push(logicLabels[answers.site]);
  if (answers.sitePressure && answers.sitePressure !== 'unknown') result.push(logicLabels[answers.sitePressure]);
  if (answers.development.includes('none')) result.push('без вираженої другої черги');
  else if (answers.development.length && !answers.development.includes('unknown')) result.push(answers.development.map((item) => logicLabels[item]).join(' + '));
  if (requiresFutureHandling(answers) && answers.futureHandling && answers.futureHandling !== 'unknown') result.push(`у майбутньому: ${logicLabels[answers.futureHandling]}`);
  return result;
}

/**
 * A claim about what kind of task this is — not a re-listing of the answers. The facts panel
 * directly below already enumerates every value; before this the sentence was those same values
 * joined with "·", so the top of the panel said everything twice and ran to nine lines on the
 * complex scenario. Traits here are interpretations (розділені партії, роль механізації), never
 * raw inputs, and no candidate family is ever named.
 */
export function joinTraits(traits: string[]) {
  if (traits.length < 2) return traits[0] ?? '';
  return `${traits.slice(0, -1).join(', ')} та ${traits[traits.length - 1]}`;
}

export function synthesizeScenario(answers: Answers) {
  if (!answers.crops.length) return 'Почнемо з масштабу й характеру зберігання.';

  const technological = hasActiveProcessing(answers.processing);
  const traits: string[] = [];
  if (answers.separation === 'required') traits.push('розділеними партіями');
  if (answers.operation === 'high' || stationaryHandling.includes(answers.handling ?? '')) traits.push('високою роллю механізації');
  if (answers.sitePressure === 'compact') traits.push('обмеженим майданчиком');
  if (hasDevelopmentIntent(answers)) traits.push('потребою в розвитку');

  const subject = technological ? 'Технологічний зернозберігальний комплекс' : 'Задача зберігання зерна';
  let lead: string;
  if (traits.length) lead = `${subject} із ${joinTraits(traits)}.`;
  else if (answers.processing === 'none') lead = 'Переважно задача зберігання: технологічної підготовки не передбачено.';
  else lead = `${subject}.`;

  // Unknowns are stated, never smoothed over: the sentence must not sound more certain than the answers.
  const partial = decisionBlockingUnknowns(answers).length > 0 || countUnknowns(answers) >= 3;
  return partial ? `${lead} Контекст поки визначений частково.` : lead;
}
