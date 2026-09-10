/**
 * The decision boundary: what the client has not decided yet, what the first conversation will
 * clarify, and what only design can settle. Verbatim from the prototype
 * (`819f163`, app/planner-logic.ts).
 */
import { parseCapacity, type Answers } from './answers';
import { existingSiteTypes, hasActiveProcessing, requiresFutureHandling, requiresHandling, stationaryHandling } from './rules';

export function scenarioClientQuestions(answers: Answers) {
  const questions: string[] = [];
  const capacity = parseCapacity(answers.capacity);
  if (capacity.kind === 'unknown') questions.push('Орієнтовна місткість або робочий діапазон');
  if (answers.operation === 'high' || hasActiveProcessing(answers.processing) || stationaryHandling.includes(answers.handling ?? '') || answers.development.includes('handling')) {
    questions.push('Пікова продуктивність приймання й відвантаження');
    questions.push('Основний транспорт приймання та відвантаження');
  }
  if (answers.separation === 'required') questions.push('Орієнтовні обсяги та одночасність окремих партій');
  if (answers.sitePressure === 'unknown') questions.push('Фактичні межі та доступна площа майданчика');
  if (existingSiteTypes.includes(answers.site ?? '')) questions.push('Вихідні дані про фактичний стан наявних об’єктів');
  if (answers.processing === 'drying' || answers.processing === 'both') questions.push('Робочий діапазон вологості зерна на прийманні');
  if (answers.development.includes('capacity')) questions.push('Цільова місткість наступної фази');
  if (answers.development.includes('physical')) questions.push('Чи є фактичний резерв території для розширення');
  questions.push('Орієнтовна тривалість зберігання');
  questions.push('Регіон і розташування майданчика');
  return questions;
}

export function buildUnknowns(answers: Answers) {
  const result: string[] = [];
  if (parseCapacity(answers.capacity).kind === 'unknown') result.push('Орієнтовна місткість або робочий діапазон');
  if (answers.crops.includes('Ще не визначили')) result.push('Які культури або продукти потрібно зберігати');
  if (answers.separation === 'unknown') result.push('Чи потрібне фізичне розділення партій');
  if (answers.operation === 'unknown') result.push('Основний режим роботи комплексу');
  if (requiresHandling(answers) && answers.handling === 'unknown') result.push('Спосіб переміщення зерна в першій черзі');
  if (answers.processing === 'unknown') result.push('Чи потрібні очищення або сушіння');
  if (answers.site === 'unknown') result.push('Контекст майданчика');
  if (answers.sitePressure === 'unknown') result.push('Фактичні обмеження по площі');
  if (answers.development.includes('unknown')) result.push('Майбутня стратегія розвитку');
  if (requiresFutureHandling(answers) && answers.futureHandling === 'unknown') result.push('Спосіб переміщення в майбутній фазі');
  return result;
}

export function engineeringGates(answers: Answers) {
  return ['Точна конфігурація та геометрія сховищ', 'Фундаменти й конструктивна схема', 'Пожежні та інженерні рішення', (hasActiveProcessing(answers.processing) || stationaryHandling.includes(answers.handling ?? '') || stationaryHandling.includes(answers.futureHandling ?? '')) && 'Технологічна схема та опори обладнання', existingSiteTypes.includes(answers.site ?? '') && 'Придатність і фактичний стан наявних конструкцій', (answers.operation === 'high' || hasActiveProcessing(answers.processing)) && 'Продуктивність ділянок і транспортні зв’язки', 'Режими зберігання та потреба в аерації'].filter(Boolean) as string[];
}
