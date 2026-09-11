/**
 * Candidate approaches (silo / framed / arch) and the WHY behind each one.
 * Verbatim from the prototype (`819f163`, app/planner-logic.ts).
 */
import type { CandidateApproach } from '../core/types';
import { parseCapacity, type Answers } from './answers';
import { handlingAccusative, logicLabels, siteAccusative } from './labels';
import { existingSiteTypes, hasActiveProcessing, hasDevelopmentIntent, requiresFutureHandling, stationaryHandling } from './rules';

export type CandidateKey = 'silo' | 'framed' | 'arch';

export type Candidate = CandidateApproach<CandidateKey> & { label: 'До порівняння' };

/**
 * How each approach is described regardless of the answers — used by buildCandidates and by the
 * result band's generic state before a consultation. One source, so the two can never drift.
 */
export const candidateCatalog: Record<CandidateKey, Pick<Candidate, 'category' | 'title' | 'summary'>> = {
  silo: {
    category: 'СИЛОСНА СИСТЕМА', title: 'Силосна система',
    summary: 'Показана як технологічно інтегрований підхід, який потрібно перевірити поруч з альтернативами — без вибору переможця.',
  },
  framed: {
    category: 'КАРКАСНЕ ПІДЛОГОВЕ СХОВИЩЕ', title: 'Каркасне підлогове',
    summary: 'Базова підлогова альтернатива з гнучким внутрішнім простором; зонування, потоки та можливість використання наявних конструкцій перевіряються окремо.',
  },
  arch: {
    category: 'БЕЗКАРКАСНЕ АРОЧНЕ СХОВИЩЕ', title: 'Безкаркасне арочне',
    summary: 'Показане як окрема підлогова альтернатива; його придатність залежить від фактичного майданчика, зонування та експлуатаційної схеми.',
  },
};

function siloReasons(answers: Answers) {
  const currentMobile = answers.handling === 'mobile';
  return [
    stationaryHandling.includes(answers.handling ?? '') && `Ви вказали ${handlingAccusative[answers.handling ?? '']} — тому інтеграція технологічних маршрутів стає важливою частиною порівняння.`,
    !currentMobile && answers.operation === 'high' && 'Ви вказали інтенсивне приймання й відвантаження — тому послідовність потоку стає окремим фактором порівняння.',
    !currentMobile && hasActiveProcessing(answers.processing) && `Ви вказали підготовку «${logicLabels[answers.processing ?? '']}» — її потрібно узгодити з переміщенням і зберіганням.`,
    requiresFutureHandling(answers) && stationaryHandling.includes(answers.futureHandling ?? '') && `У майбутньому ви плануєте ${handlingAccusative[answers.futureHandling ?? '']} — тому важливо перевірити сумісність першої черги з цим напрямком.`,
    answers.separation === 'required' && 'Ви вказали окремі партії — тому в кожній концепції потрібно порівняти спосіб фізичного розділення.',
  ].filter(Boolean) as string[];
}

function siloIsMeaningful(answers: Answers) {
  const currentMobile = answers.handling === 'mobile';
  return stationaryHandling.includes(answers.handling ?? '')
    || (requiresFutureHandling(answers) && stationaryHandling.includes(answers.futureHandling ?? ''))
    || (!currentMobile && (answers.operation === 'high' || hasActiveProcessing(answers.processing)));
}

export function visibleCandidateKeys(answers: Answers): CandidateKey[] {
  const keys: CandidateKey[] = [];
  if (siloIsMeaningful(answers)) keys.push('silo');
  keys.push('framed');
  const existingAndTight = existingSiteTypes.includes(answers.site ?? '') && answers.sitePressure === 'compact';
  if (!existingAndTight || !keys.includes('silo')) keys.push('arch');
  return keys;
}

export function buildCandidates(answers: Answers): Candidate[] {
  const silo: Candidate = {
    key: 'silo', ...candidateCatalog.silo, label: 'До порівняння',
    reasons: siloReasons(answers),
    careful: ['Фактичну продуктивність усіх ділянок потоку', 'Транспортні маршрути й точки приймання', hasDevelopmentIntent(answers) && 'Сумісність першої черги з майбутнім розвитком', 'Займану площу всього комплексу, а не лише сховищ'].filter(Boolean) as string[],
  };
  const framedReasons = [
    answers.separation === 'shared' && 'Ви вказали, що партії можуть зберігатися разом, — тому єдиний гнучкий внутрішній об’єм стає доречним.',
    answers.separation === 'required' && 'Ви вказали окремі партії — тому схема зонування стає одним із головних питань для перевірки.',
    answers.separation === 'unknown' && 'Спосіб розділення ви ще не визначили, тому підлоговий підхід лишається попередньою альтернативою.',
    hasActiveProcessing(answers.processing) && `Ви вказали підготовку «${logicLabels[answers.processing ?? '']}» — тому потрібно перевірити, як технологічні зони поєднуються з підлоговим зберіганням.`,
    answers.development.includes('physical') && 'Ви плануєте фізичне розширення — тому потрібна окрема схема поетапності генерального плану.',
    existingSiteTypes.includes(answers.site ?? '') && `Ви вказали ${siteAccusative[answers.site ?? '']} — можливість використати наявний об’єкт не припускається автоматично й потребує обстеження.`,
  ].filter(Boolean) as string[];
  const framed: Candidate = {
    key: 'framed', ...candidateCatalog.framed, label: 'До порівняння',
    reasons: framedReasons.length ? framedReasons : ['Підтверджені відповіді поки не звужують задачу до інтегрованої технологічної системи.'],
    careful: [answers.separation === 'required' && 'Схему фізичного розділення партій', stationaryHandling.includes(answers.handling ?? '') && 'Інтеграцію поточного стаціонарного переміщення', 'Робочі й транспортні зони', answers.sitePressure === 'compact' && 'Фактичну займану площу на компактному майданчику'].filter(Boolean) as string[],
  };
  const archReasons = [
    answers.site === 'greenfield' && 'Ви вказали вільну ділянку — тож окрему підлогову будівлю можна перевірити як альтернативу.',
    answers.sitePressure === 'space' && 'Ви підтвердили запас площі — тому окремий підлоговий об’єм не варто відкидати передчасно.',
    answers.operation === 'seasonal' && 'Ви вказали сезонне зберігання — тому підлогове зберігання лишається змістовним контрольним підходом.',
    answers.handling === 'mobile' && 'Ви вказали мобільну техніку — тому експлуатаційний сценарій підлогового об’єкта важливо перевірити.',
    answers.separation === 'required' && 'Ви вказали окремі партії — тому для арочного об’єму окремо перевіряється можливість зонування.',
  ].filter(Boolean) as string[];
  const arch: Candidate = {
    key: 'arch', ...candidateCatalog.arch, label: 'До порівняння',
    reasons: archReasons.length ? archReasons : ['Підлоговий підхід зберігається як контрольна альтернатива, доки майданчик і експлуатаційна схема не виключають його.'],
    careful: [answers.separation === 'required' && 'Можливість зонування незалежних партій', hasActiveProcessing(answers.processing) && 'Спосіб інтеграції технологічних зон', existingSiteTypes.includes(answers.site ?? '') && 'Можливість розміщення нового об’єкта поруч із наявною забудовою', 'Експлуатаційну логіку й доступ техніки'].filter(Boolean) as string[],
  };
  const candidates = { silo, framed, arch };
  return visibleCandidateKeys(answers).map((key) => candidates[key]);
}

export function comparisonRows(answers: Answers) {
  const rows: string[] = [];
  if (['known', 'range'].includes(parseCapacity(answers.capacity).kind)) rows.push('Орієнтовна місткість');
  if (answers.separation === 'required') rows.push('Розділення партій');
  if (answers.operation === 'high') rows.push('Інтенсивна логістика');
  if (hasActiveProcessing(answers.processing)) rows.push('Підготовка зерна');
  if (answers.sitePressure === 'compact') rows.push('Компактний майданчик');
  if (hasDevelopmentIntent(answers)) rows.push('Майбутній розвиток');
  return rows.length ? rows : ['Базовий сценарій'];
}

/** One cell of the side-by-side comparison. From the prototype's ComparisonMatrix (app/planner.tsx). */
export function comparisonCell(key: CandidateKey, row: string) {
  if (row === 'Орієнтовна місткість') return 'Перевірити компонування під заданий масштаб';
  if (row === 'Розділення партій') return key === 'silo' ? 'Перевірити кількість незалежних ємностей' : 'Перевірити спосіб зонування';
  if (row === 'Інтенсивна логістика') return 'Перевірити продуктивність і маршрути';
  if (row === 'Підготовка зерна') return 'Перевірити технологічні зв’язки';
  if (row === 'Компактний майданчик') return 'Порівняти повну займану площу';
  if (row === 'Майбутній розвиток') return 'Перевірити сумісність етапів';
  return 'Порівняти експлуатаційну схему';
}
