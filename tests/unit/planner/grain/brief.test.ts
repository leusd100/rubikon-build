import { describe, expect, it } from 'vitest';
import golden from './__golden__/prototype-819f163.json';
import { fixtureNames, fixtures, normalize } from './fixtures';
import {
  GRAIN_BRIEF_TEXT_LIMIT,
  buildCandidates,
  buildFacts,
  buildUnknowns,
  createGrainBrief,
  cropOptions,
  developmentOptions,
  formatGrainBriefText,
  grainBriefHeadline,
  handlingOptions,
  operationOptions,
  processingOptions,
  scenarioClientQuestions,
  separationOptions,
  siteOptions,
  sitePressureOptions,
  type Answers,
} from '../../../../app/lib/planner/grain';

const TASK_LABELS = ['Тип задачі', 'Місткість', 'Продукція', 'Розділення', 'Режим роботи', 'Переміщення першої черги', 'Підготовка зерна', 'Майданчик', 'Розвиток', 'Майбутнє переміщення'];
const section = (answers: Answers, id: string) => createGrainBrief(answers).sections.find((item) => item.id === id)?.rows ?? [];
const ids = (options: string[][]) => options.map(([id]) => id);

/**
 * Every combination of the single-choice answers (5 400), crossed with the three crop/capacity
 * inputs and the two development inputs that produce the longest brief — 32 400 states in ~1.5 s.
 *
 * A one-off run over the wider space (all five development sets × every future-handling answer ×
 * the same crop/capacity inputs, 226 800 states, ~10 s) found the longest brief at 1 538
 * characters. That state — crops and capacity unknown, separate batches, intensive, cleaning +
 * drying, existing slab, compact site, all five development directions, future handling unknown —
 * is inside this subset, so the maximum it checks is the global one.
 */
function* answerSpace(): Generator<Answers> {
  const crops = [cropOptions.slice(0, 5), ['Ще не визначили'], ['Пшениця']];
  const capacities = ['8 000–10 000', 'unknown', '3000'];
  const development = ids(developmentOptions).slice(0, 5);
  for (const separation of ids(separationOptions)) for (const operation of ids(operationOptions)) for (const handling of [null, ...ids(handlingOptions)])
    for (const processing of ids(processingOptions)) for (const site of ids(siteOptions)) for (const sitePressure of ids(sitePressureOptions(false)))
      for (const futureHandling of ['unknown', 'stationary'])
        for (let i = 0; i < crops.length; i++) {
          yield { crops: crops[i], capacity: capacities[i], separation, operation, handling, processing, site, sitePressure, development, futureHandling };
        }
}

describe.each(fixtureNames)('preliminary brief — %s', (name) => {
  const answers = fixtures[name];
  const dom = golden.dom[name];

  it('task rows are the prototype «Попередній опис» rows, in order, with the theme each edits', () => {
    const rows = section(answers, 'task');
    expect(rows.map((row) => row.label)).toEqual(TASK_LABELS);
    expect(rows.map((row) => ({ label: row.label, value: normalize(row.value) }))).toEqual(dom.result.briefRows);
    expect(rows.map((row) => row.themeIndex)).toEqual([2, 0, 0, 0, 1, 1, 2, 3, 4, 4]);
  });

  it('decision rows are the prototype «Карта рішення» aside', () => {
    const decision = section(answers, 'decision').map((row) => ({ label: row.label.toUpperCase(), value: row.value }));
    const aside = dom.result.briefAside.filter((row) => row.label !== 'ПІДТВЕРДЖЕНО ФАКТІВ');
    expect(decision).toEqual(aside);
    expect(dom.result.briefAside.find((row) => row.label === 'ПІДТВЕРДЖЕНО ФАКТІВ')?.value).toBe(String(buildFacts(answers).length));
  });

  it('open rows are the prototype decision-boundary lists', () => {
    const unknowns = buildUnknowns(answers);
    const followUps = scenarioClientQuestions(answers).filter((item) => !unknowns.includes(item));
    expect(section(answers, 'open')).toEqual([
      ...(unknowns.length ? [{ label: 'Ви ще не визначили', value: unknowns.join('; ') }] : []),
      { label: 'На першій розмові уточнимо', value: followUps.join('; ') },
    ]);
  });

  it('text carries every row, fits the inquiry field and never includes WHY', () => {
    const brief = createGrainBrief(answers);
    const text = formatGrainBriefText(brief, answers);
    expect(text.length).toBeLessThanOrEqual(GRAIN_BRIEF_TEXT_LIMIT);
    expect(text.split('\n')[0]).toBe('Опис задачі (Зерновий планувальник v1)');
    for (const row of brief.sections.flatMap((item) => item.rows)) expect(text).toContain(`${row.label}: ${row.value}`);
    for (const reason of buildCandidates(answers).flatMap((candidate) => candidate.reasons)) expect(text).not.toContain(reason);
  });
});

describe('brief headline', () => {
  const nothing: Answers = { ...fixtures.C1, processing: 'unknown' };

  it('with enough context, joins what is confirmed of scale, batches and preparation', () => {
    expect(normalize(grainBriefHeadline(fixtures.B))).toBe('≈ 12 000 т · окремі партії · очищення + сушіння');
    expect(normalize(grainBriefHeadline(fixtures.A))).toBe('≈ 3 000 т · спільне зберігання можливе');
  });

  it('a single meaningful signal is filed under «Зерносховище · …», never as one word', () => {
    expect(grainBriefHeadline(fixtures.C1)).toBe('Зерносховище · сушіння');
    expect(normalize(grainBriefHeadline({ ...nothing, capacity: '3000' }))).toBe('Зерносховище · ≈ 3 000 т');
    expect(grainBriefHeadline({ ...nothing, separation: 'required' })).toBe('Зерносховище · окремі партії');
  });

  it('when almost nothing is decided, falls back to a neutral title', () => {
    expect(grainBriefHeadline(nothing)).toBe('Опис задачі зерносховища');
  });

  it('is never a single word anywhere in the answer space', () => {
    for (const answers of answerSpace()) {
      const headline = grainBriefHeadline(answers);
      if (headline !== 'Опис задачі зерносховища' && !headline.includes(' · ')) throw new Error(`«${headline}» for ${JSON.stringify(answers)}`);
    }
  });
});

describe('brief text limit', () => {
  it(`stays within ${GRAIN_BRIEF_TEXT_LIMIT} characters and WHY-free for every single-choice combination with the longest inputs`, () => {
    let states = 0;
    let longest = 0;
    for (const answers of answerSpace()) {
      const text = formatGrainBriefText(createGrainBrief(answers), answers);
      states += 1;
      longest = Math.max(longest, text.length);
      if (text.length > GRAIN_BRIEF_TEXT_LIMIT) throw new Error(`${text.length} characters for ${JSON.stringify(answers)}`);
      if (text.endsWith('…')) throw new Error(`trimmed below the limit for ${JSON.stringify(answers)}`);
    }
    expect(states).toBe(32_400);
    expect(longest).toBeLessThan(GRAIN_BRIEF_TEXT_LIMIT);
  });

  it('over the limit, shortens first-call questions before undecided answers and never cuts a line', () => {
    const answers = fixtures.C1;
    const brief = createGrainBrief(answers);
    const full = formatGrainBriefText(brief, answers);
    const fullLines = full.split('\n');

    const firstCallTrimmed = formatGrainBriefText(brief, answers, full.length - 40);
    expect(firstCallTrimmed.length).toBeLessThanOrEqual(full.length - 40);
    expect(firstCallTrimmed).toMatch(/На першій розмові уточнимо: .*…$/m);
    expect(firstCallTrimmed).toContain(fullLines.find((line) => line.startsWith('Ви ще не визначили:')));

    const both = formatGrainBriefText(brief, answers, full.length - 400);
    expect(both.length).toBeLessThanOrEqual(full.length - 400);
    expect(both).toMatch(/Ви ще не визначили: .*…$/m);
    for (const line of both.split('\n')) {
      if (line.endsWith('…')) continue;
      expect(fullLines).toContain(line);
    }
  });
});
