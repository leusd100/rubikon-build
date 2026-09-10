/**
 * The prototype's own 40 tests (`codex/grain-planner-v0.5 @ 819f163`, app/planner-logic.test.mjs),
 * ported to Vitest mechanically. Names, literals and assertions are unchanged; only the imports
 * moved, `void test(` became `test(`, and two `assert.ok(candidate)` guards were added so
 * TypeScript can narrow a `find()` result the .mjs original dereferenced directly.
 */
import assert from 'node:assert/strict';
import { test } from 'vitest';
import { choiceOptionId } from '../../../../app/lib/planner/core/choiceOptionId';
import {
  buildCandidates,
  expansionTension,
  panelInsight,
  shouldAskHandlingInProcessing,
  buildDrivers,
  buildFacts,
  buildUnknowns,
  comparisonRows,
  countUnknowns,
  decisionBlockingUnknowns,
  engineeringGates,
  explainChanges,
  firstClarificationTheme,
  formatCapacityInfo,
  hasExpansionTension,
  isThemeComplete,
  parseCapacity,
  requiresFutureHandling,
  routeDecision,
  scenarioClientQuestions,
  synthesizeScenario,
  themeAnswerState,
  visibleCandidateKeys,
} from '../../../../app/lib/planner/grain';

const simple = {
  crops: ['Пшениця'], capacity: '2500', separation: 'shared', operation: 'seasonal', handling: null,
  processing: 'none', site: 'greenfield', sitePressure: 'space', development: ['none'], futureHandling: null,
};

const complex = {
  crops: ['Пшениця', 'Кукурудза', 'Соняшник'], capacity: '8000', separation: 'required', operation: 'high', handling: 'stationary',
  processing: 'both', site: 'greenfield', sitePressure: 'compact', development: ['capacity', 'handling', 'physical'], futureHandling: 'stationary',
};

const uncertain = {
  crops: ['Ще не визначили'], capacity: 'unknown', separation: 'unknown', operation: 'unknown', handling: null,
  processing: 'unknown', site: 'unknown', sitePressure: 'unknown', development: ['unknown'], futureHandling: null,
};

test('місткість приймає ціле значення, діапазон і чесну невідому', () => {
  assert.deepEqual(parseCapacity('8 000'), { kind: 'known', min: 8000, max: 8000 });
  assert.deepEqual(parseCapacity('8 000–10 000'), { kind: 'range', min: 8000, max: 10000 });
  assert.deepEqual(parseCapacity('unknown'), { kind: 'unknown' });
  assert.equal(formatCapacityInfo(parseCapacity('8 000–10 000')), '≈ 8 000–10 000 т');
});

test('місткість не перекручує десяткові, від’ємні та зворотні значення', () => {
  assert.equal(parseCapacity('2,5').kind, 'invalid');
  assert.equal(parseCapacity('-5').kind, 'invalid');
  assert.equal(parseCapacity('10 000–8 000').kind, 'invalid');
  assert.equal(parseCapacity('0').kind, 'invalid');
});

test('проста задача показує дві підлогові альтернативи без штучної складності', () => {
  assert.equal(routeDecision(simple), 'candidateComparison');
  assert.deepEqual(visibleCandidateKeys(simple), ['framed', 'arch']);
  assert.equal(themeAnswerState(0, simple), 'confirmed');
});

test('демо-сценарій показує три концепції з поясненням для кожної', () => {
  const candidates = buildCandidates(complex);
  assert.deepEqual(candidates.map((item) => item.key), ['silo', 'framed', 'arch']);
  assert.ok(candidates.every((item) => item.reasons.length > 0));
  assert.ok(candidates.every((item) => item.label === 'До порівняння'));
  assert.equal(hasExpansionTension(complex), true);
});

test('невідомі відповіді завершують теми, але ведуть до карти уточнень', () => {
  assert.deepEqual([0, 1, 2, 3, 4].map((index) => isThemeComplete(index, uncertain)), [true, true, true, true, true]);
  assert.deepEqual([0, 1, 2, 3, 4].map((index) => themeAnswerState(index, uncertain)), ['unknown', 'unknown', 'unknown', 'unknown', 'unknown']);
  assert.equal(routeDecision(uncertain), 'clarificationRequired');
});

test('розділення партій питається незалежно від кількості культур', () => {
  const separatedWheat = { ...simple, separation: 'required' };
  assert.equal(isThemeComplete(0, separatedWheat), true);
  assert.ok(buildFacts(separatedWheat).some((fact) => /окремі партії/.test(fact)));
  // Синтез — це твердження про тип задачі, а не перелік; сирі значення живуть у фактах.
  assert.match(synthesizeScenario(separatedWheat), /розділеними партіями/);
  assert.ok(scenarioClientQuestions(separatedWheat).some((item) => item.includes('окремих партій')));
});

test('зняття другої культури не стирає окрему відповідь про партії', () => {
  const before = { ...complex, crops: ['Пшениця', 'Кукурудза'] };
  const after = { ...before, crops: ['Пшениця'] };
  assert.equal(after.separation, 'required');
  assert.ok(explainChanges(before, after).some((item) => /розділен/i.test(item)));
});

test('поточне й майбутнє переміщення є різними фактами', () => {
  const state = { ...complex, handling: 'mobile', futureHandling: 'stationary' };
  assert.equal(requiresFutureHandling(state), true);
  assert.ok(buildFacts(state).includes('зараз: мобільна техніка'));
  assert.ok(buildFacts(state).includes('у майбутньому: стаціонарна механізація'));
});

test('майбутня відповідь не підміняє поточну механізацію', () => {
  const state = { ...simple, development: ['handling'], futureHandling: 'stationary' };
  const facts = buildFacts(state);
  assert.ok(!facts.some((fact) => fact.startsWith('зараз:')), 'поточна механізація не вигадується');
  assert.ok(facts.some((fact) => /у майбутньому: стаціонарна механізація/.test(fact)));
  // Майбутній намір характеризує задачу, але не видає себе за поточний стан.
  assert.match(synthesizeScenario(state), /потребою в розвитку/);
  assert.doesNotMatch(synthesizeScenario(state), /механізації/);
});

test('мобільна техніка не дає силос лише через інтенсивність або підготовку', () => {
  const state = { ...simple, operation: 'high', handling: 'mobile', processing: 'drying' };
  assert.deepEqual(visibleCandidateKeys(state), ['framed', 'arch']);
});

test('підтверджене майбутнє стаціонарне переміщення додає силос із причиною', () => {
  const state = { ...simple, development: ['handling'], futureHandling: 'stationary' };
  const silo = buildCandidates(state).find((item) => item.key === 'silo');
  assert.ok(silo);
  assert.ok(silo.reasons.some((item) => item.includes('майбутньому')));
});

test('майбутня мобільна техніка не додає силос без іншого прямого сигналу', () => {
  const state = { ...simple, development: ['handling'], futureHandling: 'mobile' };
  assert.deepEqual(visibleCandidateKeys(state), ['framed', 'arch']);
});

test('кожна видима концепція завжди має хоча б одну причину', () => {
  const operations = ['seasonal', 'regular', 'high', 'unknown'];
  const handling = [null, 'mobile', 'stationary', 'combined', 'unknown'];
  const processing = ['none', 'cleaning', 'drying', 'both', 'unknown'];
  for (const operation of operations) {
    for (const currentHandling of handling) {
      for (const preparation of processing) {
        const state = { ...simple, operation, handling: currentHandling, processing: preparation };
        assert.ok(buildCandidates(state).every((item) => item.reasons.length > 0));
      }
    }
  }
});

test('ярлики концепцій не утворюють прихований рейтинг', () => {
  assert.deepEqual([...new Set(buildCandidates(complex).map((item) => item.label))], ['До порівняння']);
});

test('компактність або розділення самі по собі не просувають силос', () => {
  assert.deepEqual(visibleCandidateKeys({ ...simple, sitePressure: 'compact' }), ['framed', 'arch']);
  assert.deepEqual(visibleCandidateKeys({ ...simple, separation: 'required' }), ['framed', 'arch']);
});

test('існуючий компактний об’єкт не отримує арочну картку автоматично', () => {
  const state = { ...complex, site: 'building', sitePressure: 'compact' };
  assert.deepEqual(visibleCandidateKeys(state), ['silo', 'framed']);
});

test('критичне уточнення про підготовку має пріоритет над режимом роботи', () => {
  const state = { ...simple, operation: 'unknown', processing: 'unknown' };
  assert.equal(firstClarificationTheme(state), 2);
});

test('невідоме розділення блокує порівняння навіть для однієї культури', () => {
  const state = { ...simple, separation: 'unknown' };
  assert.deepEqual(decisionBlockingUnknowns(state), ['separation']);
  assert.equal(routeDecision(state), 'clarificationRequired');
});

test('невідомий тип майданчика не приховує окреме питання про площу', () => {
  const incomplete = { ...simple, site: 'unknown', sitePressure: null };
  const complete = { ...incomplete, sitePressure: 'unknown' };
  assert.equal(isThemeComplete(3, incomplete), false);
  assert.equal(isThemeComplete(3, complete), true);
  assert.equal(countUnknowns(complete), 2);
});

test('невідома місткість є валідною відповіддю, але не підтвердженим фактом', () => {
  const state = { ...simple, capacity: 'unknown' };
  assert.equal(isThemeComplete(0, state), true);
  assert.equal(themeAnswerState(0, state), 'unknown');
  assert.equal(buildFacts(state).some((item) => item.includes('місткість')), false);
  assert.ok(buildUnknowns(state).some((item) => item.includes('місткість')));
});

test('невідомі значення не рахуються як підтверджені факти', () => {
  assert.equal(buildFacts(uncertain).length, 0);
});

test('місткість є фактором масштабу, але не інженерним вибором концепції', () => {
  assert.ok(buildDrivers(simple).includes('Масштаб зберігання'));
  assert.ok(comparisonRows(simple).includes('Орієнтовна місткість'));
  assert.deepEqual(visibleCandidateKeys({ ...simple, capacity: '50' }), visibleCandidateKeys({ ...simple, capacity: '900000' }));
});

test('цільову місткість наступної фази питаємо лише коли заявлене її збільшення', () => {
  assert.equal(scenarioClientQuestions({ ...simple, development: ['physical'] }).some((item) => item.includes('Цільова місткість')), false);
  assert.equal(scenarioClientQuestions({ ...simple, development: ['capacity'] }).some((item) => item.includes('Цільова місткість')), true);
});

test('фізичне розширення породжує питання про резерв, а не підтверджує його', () => {
  const state = { ...simple, sitePressure: 'compact', development: ['physical'] };
  assert.ok(scenarioClientQuestions(state).some((item) => item.includes('фактичний резерв')));
  assert.doesNotMatch(synthesizeScenario(state), /резерв для наступної черги/);
});

test('інженерні перевірки залежать від сценарію', () => {
  assert.equal(engineeringGates(simple).includes('Технологічна схема та опори обладнання'), false);
  assert.equal(engineeringGates(complex).includes('Технологічна схема та опори обладнання'), true);
  assert.equal(engineeringGates({ ...simple, site: 'building' }).some((item) => item.includes('наявних конструкцій')), true);
});

test('пояснення накопичує кілька змін без приписування рішення клієнту', () => {
  const after = { ...complex, crops: ['Пшениця'], operation: 'seasonal', processing: 'none', handling: 'mobile' };
  const notes = explainChanges(complex, after);
  assert.ok(notes.length >= 4);
  assert.equal(notes.some((item) => item.includes('втратила перевагу')), false);
});

test('зміна причини уточнення не ховає вже введене поточне переміщення', () => {
  const high = { ...simple, operation: 'high', handling: 'stationary' };
  const seasonal = { ...high, operation: 'seasonal' };
  const cleaning = { ...seasonal, processing: 'cleaning' };
  assert.ok(buildFacts(seasonal).includes('зараз: стаціонарна механізація'));
  assert.ok(buildFacts(cleaning).includes('зараз: стаціонарна механізація'));
  assert.ok(buildCandidates(cleaning).some((item) => item.key === 'silo'));
});

test('для кожного повного сценарію повертається щонайменше дві концепції', () => {
  const sites = ['greenfield', 'building', 'unknown'];
  const pressures = ['space', 'compact', 'unknown'];
  for (const site of sites) {
    for (const sitePressure of pressures) {
      const keys = visibleCandidateKeys({ ...simple, site, sitePressure });
      assert.ok(keys.length >= 2 && keys.length <= 3);
    }
  }
});

/**
 * Regression guard for the duplicate-id defect found in the v0.5 UX review.
 *
 * A primary ChoiceGroup and its adaptive clarifier render inside the same question card and
 * share option values — `unknown` in every affected theme. While ids were built from the value
 * alone, both groups emitted `choice-unknown`, so `<label htmlFor>` bound to whichever radio
 * came first in the document. Measured symptoms: on the site theme, clicking "Поки не знаю"
 * under the area question cleared the confirmed "Вільна ділянка" answer and left Continue
 * disabled; on the operation theme it replaced a confirmed "Інтенсивне приймання" with
 * `unknown`, removed the clarifier, and left Continue enabled so the visitor walked on with a
 * silently rewritten answer.
 */
test('однакове значення в різних групах ніколи не дає однаковий id', () => {
  // Саме ті пари груп, що рендеряться в одній картці одночасно.
  for (const [primary, clarifier] of [['site', 'sitePressure'], ['operation', 'handling'], ['processing', 'handling'], ['development', 'futureHandling']]) {
    assert.notEqual(
      choiceOptionId(primary, 'unknown'),
      choiceOptionId(clarifier, 'unknown'),
      `${primary} і ${clarifier} не повинні ділити id для значення unknown`,
    );
  }
});

test('id залишається унікальним для різних значень усередині однієї групи', () => {
  const ids = ['greenfield', 'operating', 'building', 'assets', 'reconstruction', 'unknown']
    .map((value) => choiceOptionId('site', value));
  assert.equal(new Set(ids).size, ids.length);
});

test('id обовʼязково враховує групу, а не лише значення', () => {
  // Якщо хтось поверне побудову id зі самого значення, ця пара збігнеться.
  assert.notEqual(choiceOptionId('a', 'unknown'), choiceOptionId('b', 'unknown'));
  assert.ok(choiceOptionId('site', 'unknown').includes('site'));
});

test('розвиток і підготовка не діляться відображуваним підписом для none', () => {
  // `none` — один канонічний value у двох доменах; підпис має залежати від контексту.
  const dev = { ...simple, development: ['none'] };
  const facts = buildFacts(dev);
  assert.ok(facts.some((fact) => /без вираженої другої черги/.test(fact)));
  assert.ok(!facts.some((fact) => /^не потрібна$/.test(fact)));
});

// ── Polish batch #3: consequence-based change notes, client-specific WHY, one tension, no repeat question ──

test('компактний майданчик → запас площі пояснюється як знята суперечність', () => {
  const notes = explainChanges(complex, { ...complex, sitePressure: 'space' });
  assert.ok(notes.some((note) => /Суперечність знята/.test(note)));
  // Раніше тут писалося про наявні конструкції — нерелевантно для вільної ділянки.
  assert.ok(!notes.some((note) => /наявних конструкцій/.test(note)));
});

test('скасування розділення без зміни набору концепцій пояснює, що їх тримає', () => {
  const after = { ...complex, separation: 'shared' };
  assert.deepEqual(buildCandidates(after).map((item) => item.key), buildCandidates(complex).map((item) => item.key));
  const note = explainChanges(complex, after).find((item) => /Набір концепцій не змінився/.test(item));
  assert.ok(note, 'має бути пояснення, чому набір лишився');
  assert.match(note, /Розділення партій/);
  assert.match(note, /інтенсивна логістика/);
});

test('зниження інтенсивності лишає переміщення важливим, поки його вимагає підготовка', () => {
  const notes = explainChanges(complex, { ...complex, operation: 'seasonal' });
  assert.ok(notes.some((note) => /Спосіб переміщення лишається важливим/.test(note) && /очищення \+ сушіння/.test(note)));
});

test('без інших тригерів переміщення перестає бути обов’язковим, але відповідь зберігається', () => {
  const high = { ...simple, operation: 'high', handling: 'stationary' };
  const notes = explainChanges(high, { ...high, operation: 'seasonal' });
  assert.ok(notes.some((note) => /більше не обов’язковий/.test(note) && /збережено як факт/.test(note)));
});

test('зміна місткості без наслідків пояснюється чесно й одним рядком', () => {
  const notes = explainChanges(complex, { ...complex, capacity: '12000' });
  assert.equal(notes.length, 1);
  assert.match(notes[0], /не обирає тип сховища/);
});

test('WHY називає фактичну відповідь клієнта, а не правило', () => {
  const silo = buildCandidates(complex).find((item) => item.key === 'silo');
  assert.ok(silo);
  assert.ok(silo.reasons.some((reason) => /стаціонарну механізацію/.test(reason)));
  assert.ok(!silo.reasons.some((reason) => /або комбіноване/.test(reason)));
  const combined = buildCandidates({ ...complex, handling: 'combined' }).find((item) => item.key === 'silo');
  assert.ok(combined);
  assert.ok(combined.reasons.some((reason) => /комбіноване переміщення/.test(reason)));
});

test('суперечність має одну репрезентацію: інсайт панелі її не повторює', () => {
  assert.ok(expansionTension(complex));
  const insight = panelInsight(complex);
  assert.ok(!insight || !/Компактність ↔ розширення/.test(insight.title));
  assert.equal(expansionTension(simple), null);
});

test('переміщення не питається вдруге в темі підготовки, якщо вже відоме', () => {
  assert.equal(shouldAskHandlingInProcessing(complex), false);
  assert.equal(shouldAskHandlingInProcessing({ ...simple, processing: 'drying' }), true);
  assert.equal(shouldAskHandlingInProcessing({ ...simple, processing: 'drying', handling: 'unknown' }), false);
  assert.equal(shouldAskHandlingInProcessing({ ...simple, processing: 'none' }), false);
});
